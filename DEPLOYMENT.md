# Extoken 私有化部署指南（自托管 / 脱离飞书账号体系）

> 本文档回答你两个核心问题：**「域名怎么办」** 和 **「认证怎么改」**，附 ECS 从 0 到 HTTPS 的完整部署流程。
> 适用操作系统：**Ubuntu 22.04 / 24.04 LTS**（Debian / CentOS / RHEL 请把 apt 换成相应包管理器）。
> 运行账号：ECS 上创建 **`extoken` 非 root 用户**，项目放 **`/opt/extoken`**。

---

## 一、核心改造速览（你关心的两个问题）

### 🔐 1. 认证怎么改？—— 已从「飞书 SSO + aPaaS 鉴权」→「自建账号密码 + JWT」

| 模块 | 原妙搭 / aPaaS 方案 | 改造后的私有化方案 |
| :--- | :--- | :--- |
| **用户账号** | 自动继承飞书组织成员（`user_profile` 自定义 type） | 本地 Postgres `selfhost_users` 表：`username / password_hash(bcrypt 10轮) / role(user\|admin)` |
| **登录** | 跳转飞书 OAuth + cookie session | 前端 `/login` 调 `POST /api/auth/login`，返回 **access_token（15min）+ refresh_token（7d）** |
| **鉴权中间件** | `@NeedLogin() / @CanRole()` + PlatformModule 注入 | 自建 `AuthMiddleware` 全局中间件 + `@RequireAuth() / @RequireRoles()` 装饰器，从 `Authorization: Bearer xxx` 解析 JWT |
| **前端** | `@lark-apaas/client-toolkit` 的 `useAuth / useCurrentUserProfile / axiosForBackend` | 自建 `client/src/hooks/useAuth.tsx` + `client/src/lib/axios.ts`（请求拦截器自动带 token，401 自动刷新 token） |
| **注册** | 不存在（飞书组织已有成员） | `/login` 页有「注册」tab，任何人可注册普通用户；管理员通过**初始管理员环境变量**或 `UPDATE selfhost_users SET role='admin'` 产生 |
| **开放网关**（给外部 Agent 调打包/取件） | aPaaS Gateway 的 `Authorization: Bearer <平台签发 Token>` | 你自己的 **`OPENAPI_GATEWAY_TOKEN`**（.env 里自定义）+ `x-extoken-key: exk_xxx`，两个双因子鉴权 |

> 初始管理员产生方式二选一：
> ```bash
> # 方式 A：.env 里写 INIT_ADMIN_* → npm run db:init 自动创建
> # 方式 B：注册一个普通用户后手动改 role
> psql "$DATABASE_URL" -c "UPDATE selfhost_users SET role='admin' WHERE username='your_name';"
> ```

### 🌐 2. 域名怎么办？—— 备案 + 解析 + Nginx 反代 + Let's Encrypt（或直接 IP 直连 / 免费 nip.io）

| 方案 | 适用场景 | 示例访问地址 | 费用 / 门槛 |
| :--- | :--- | :--- | :--- |
| **推荐：自有域名 + ICP 备案** | 正式对外、长期使用 | `https://extoken.your-domain.com` | 域名 ≈ 50 元/年；备案免费（阿里云/腾讯云，7-20 工作日） |
| **备选：ECS 公网 IP 直连** | 内部/临时使用、不要求域名 | `http://<你的ECS公网IP>:3000` | 免费 / 0 门槛；生产不建议（明文 HTTP） |
| **测试：nip.io 免费泛域名** | 临时想得到"看起来像域名"、能匹配上很多 Web 安全策略 | `http://<你的ECS公网IP>.nip.io:3000` | 免费 / 立即可用（nip.io 自动把 `<ip>.nip.io` 解析回 `<ip>`） |

自有域名 + HTTPS 的完整链路：
```
用户浏览器
   │
   ▼ HTTPS (443)
域名 DNS → A 记录 → 你的 ECS 公网 IP → Nginx (443)
                                        │
                                        ├── 静态资源：直接读 /opt/extoken/dist/client
                                        └── /api /openapi → proxy_pass http://127.0.0.1:3000
                                                                  │
                                                                  ▼
                                                          NestJS（Node 20，监听 127.0.0.1:3000）
                                                                  │
                                                                  ▼
                                                          PostgreSQL 16（127.0.0.1:5432）
```

---

## 二、ECS 服务器准备

### 2.1 安全组 / 防火墙（必须做！）
阿里云 / 腾讯云控制台 **安全组** 只开放：
- `TCP 22` — SSH 登录（强烈建议改成非 22 端口，或者只白名单你的办公 IP）
- `TCP 80` — HTTP（用于 Let's Encrypt 校验 + 跳转 HTTPS）
- `TCP 443` — HTTPS 主站
- 🔴 不要开放 3000 / 5432 给公网！它们只监听 `127.0.0.1`。

服务器内再叠一层 ufw（Ubuntu）：
```bash
sudo apt update -y && sudo apt install -y ufw fail2ban
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 2.2 安装 Node.js 20 LTS + npm 10
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # 要求 v20.11+
npm  -v   # 要求 10+

# 非 root 用户全局 npm 包目录（避免 sudo 安装）
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### 2.3 安装 PostgreSQL 16
```bash
# Ubuntu 24.04 默认源就是 Postgres 16；22.04 请加官方仓库
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "SELECT version();"  # 确认是 16

# 创建数据库 + 用户
sudo -u postgres psql <<'SQL'
CREATE USER extoken WITH PASSWORD '请改成一个强随机密码（记下来，写进 .env）';
CREATE DATABASE extoken OWNER extoken;
GRANT ALL PRIVILEGES ON DATABASE extoken TO extoken;
\c extoken
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL ON SCHEMA public TO extoken;
SQL

# 校验本机能不能连
psql "postgresql://extoken:上面设的密码@127.0.0.1:5432/extoken?sslmode=disable" -c "SELECT 1 AS ok;"
```

### 2.4 安装 Nginx + Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable --now nginx
nginx -v
```

---

## 三、部署项目代码

### 3.1 创建运行用户 + 拉代码
```bash
# 创建独立运行用户（安全加固：不用 root 跑 Node）
sudo useradd -r -m -s /bin/bash extoken
sudo mkdir -p /opt/extoken
sudo chown extoken:extoken /opt/extoken
sudo chmod 750 /opt/extoken

# 切到 extoken 用户后，用 git / scp / rsync 把你本地改造好的 miaodaextoken 代码拉到 /opt/extoken
# 方式 A：推到私有仓库后 git clone
sudo -u extoken -H bash -c '
  cd /opt/extoken &&
  git clone https://<你的私有仓库> .
'

# 方式 B：本地 scp 上去（没 git 仓库就这个）
# 在本机：  scp -r /Users/bytedance/Documents/extokentest/miaodaextoken/* root@<ECS_IP>:/opt/extoken
# 然后 ECS 上： sudo chown -R extoken:extoken /opt/extoken
```

### 3.2 安装依赖 + 构建
```bash
sudo -u extoken -H bash -c '
  cd /opt/extoken && \
  npm install --omit=dev=false   # 依赖里 drizzle-kit 是 devDependencies，但构建后不需要；这里全装
  npm run build:prod             # 等价于 build:server + build:client
  ls dist/server/main.js dist/client/index.html   # 确认产物都在
'
```

### 3.3 写 .env（生产环境强烈建议放 /etc/default/extoken，不直接和代码放一块）
```bash
# 切换 extoken 用户，先从 .env.example 复制一份
sudo cp /opt/extoken/.env.example /etc/default/extoken
sudo chown extoken:extoken /etc/default/extoken
sudo chmod 640 /etc/default/extoken   # 只有 root 和 extoken 能读
sudo -u extoken -H nano /etc/default/extoken
```

把下面几行**按你的实际情况**改成自己的值：
```bash
# ===== /etc/default/extoken =====
NODE_ENV=production
TZ=Asia/Shanghai
SERVER_HOST=127.0.0.1          # 只监听本机，公网访问必须走 Nginx
SERVER_PORT=3000
APP_PUBLIC_URL=https://extoken.your-domain.com   # ⚠️ 改成你申请的真实域名
APP_NAME=我的 Extoken 交换站
TRUST_PROXY=true

# 数据库（2.3 里自己设的那个密码）
DATABASE_URL=postgresql://extoken:你的强随机密码@127.0.0.1:5432/extoken?schema=public&sslmode=disable

# JWT 密钥 ⚠️ 三个一定要换成 openssl rand -base64 64 生成的不同随机串
JWT_ACCESS_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_REFRESH_SECRET=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
COOKIE_SECRET=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz

# 初始管理员（db:init 时自动创建；启动后注释掉并修改默认密码）
INIT_ADMIN_USERNAME=admin
INIT_ADMIN_PASSWORD=ChangeMe123!!!      # ⚠️ 至少 8 位，含大小写+数字+符号
INIT_ADMIN_NICKNAME=超级管理员

# 开放网关给外部 Agent 用的 Bearer Token
OPENAPI_GATEWAY_TOKEN=wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww

# CORS：部署后 Nginx 是同域，这里写 * 或者写域名都行
CORS_ORIGIN=https://extoken.your-domain.com
LOG_LEVEL=info
```

生成强随机密钥的命令（跑三条把输出分别贴进 JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / OPENAPI_GATEWAY_TOKEN）：
```bash
openssl rand -base64 64
openssl rand -base64 64
openssl rand -base64 48
```

### 3.4 初始化数据库（建表 + 初始管理员）
```bash
# 方案 A：直接跑 init-db.js（推荐，不依赖 drizzle-kit，生产更简单）
sudo -u extoken -H bash -c '
  cd /opt/extoken && \
  set -a && source /etc/default/extoken && set +a && \
  node scripts/init-db.js
'

# 方案 B：drizzle-kit 的迁移流程（开发/迭代数据库 schema 时用）
# sudo -u extoken -H bash -c '
#   cd /opt/extoken && \
#   set -a && source /etc/default/extoken && set +a && \
#   npm run db:migrate
# '
```

### 3.5 注册为 systemd 服务 + 启动
```bash
sudo cp /opt/extoken/deploy/extoken.service /etc/systemd/system/extoken.service

# 如果你用 /etc/default/extoken 存环境变量，记得在 service 里取消 EnvironmentFile 行的注释
sudo sed -i 's|# EnvironmentFile=-/etc/default/extoken|EnvironmentFile=-/etc/default/extoken|' /etc/systemd/system/extoken.service

sudo systemctl daemon-reload
sudo systemctl enable --now extoken
sleep 2
sudo systemctl status extoken     # 应该显示 active (running)

# 健康检查
curl -sS http://127.0.0.1:3000/api/auth/health
# 期望输出：{"ok":true}
```

---

## 四、域名 + HTTPS 配置

### 4.1 域名 & 备案（正式部署一定做）
1. 阿里云/腾讯云/Namecheap 买域名，比如 `your-domain.com`，≈50 元/年。
2. 如果你的 ECS 是**中国大陆**的 → 必须做 **ICP 备案**（不备案 HTTP/HTTPS 端口会被封）：
   - 阿里云：控制台 → 域名 → 我要备案（免费，阿里云会有客服 1v1 协助填资料）
   - 审核流程：阿里云初审（1-3 天）→ 拍照幕布 → 管局审核（7-15 工作日）
3. 备案通过后，在**云解析 DNS**里加一条 A 记录：
   - 主机记录：`extoken`（或 `@`，按你喜好）
   - 记录值：**你的 ECS 公网 IP**
   - TTL：600
   - 验证：`ping extoken.your-domain.com` 应该解析到你 ECS 公网 IP。

### 4.2 Nginx 配置
```bash
sudo cp /opt/extoken/deploy/nginx.extoken.conf /etc/nginx/conf.d/extoken.conf

# 把 nginx 配置里两处 "extoken.your-domain.com" 替换成你真实的域名
sudo sed -i 's|extoken.your-domain.com|<替换为你真实的域名，例如 extoken.abc.com>|g' /etc/nginx/conf.d/extoken.conf

# 现在还没有证书，先临时注释掉 ssl_certificate 两行（等 certbot 颁发了再恢复），然后测
sudo nginx -t         # 期待输出：test is successful
sudo systemctl reload nginx
```

### 4.3 用 Certbot 一键申请 Let's Encrypt 免费 HTTPS
```bash
# 注意：跑 certbot 之前，① 域名解析必须生效 ② 80/443 必须在安全组和 ufw 都放行
sudo certbot --nginx -d extoken.your-domain.com -m 你的邮箱@xxx.com --agree-tos --no-eff-email --redirect

# certbot 会自动把证书路径写回 /etc/nginx/conf.d/extoken.conf，直接生效
sudo systemctl reload nginx
```

浏览器访问：`https://extoken.your-domain.com`
- 能看到登录页 → ✅
- 浏览器锁头是小绿锁 → ✅
- 用初始管理员 `admin / ChangeMe123!!!` 登录 → 进管理台后**立即改密码**，然后把 `/etc/default/extoken` 里的 `INIT_ADMIN_PASSWORD` 注释掉

### 4.4 证书自动续期（Let's Encrypt 证书 90 天有效期）
```bash
# certbot 自带 systemd timer，检查下
sudo systemctl list-timers certbot.timer --all
# 手动测试一次续期（不会真续，只是演练）
sudo certbot renew --dry-run
```

---

## 五、日常运维命令速查

```bash
# 看应用状态
sudo systemctl status extoken
# 看实时日志
sudo journalctl -u extoken -f -n 200

# 重新构建（代码更新后）
sudo -u extoken -H bash -c '
  cd /opt/extoken && git pull --ff-only    # 或者 scp 新代码上去
  npm install
  npm run build:prod
'
# 代码有 schema 变更时再跑：
sudo -u extoken -H bash -c '
  cd /opt/extoken && set -a && source /etc/default/extoken && set +a && node scripts/init-db.js
'
# 重启服务
sudo systemctl restart extoken

# 数据库备份（建议加到 crontab 每天 3 点跑）
sudo -u extoken bash -c '
  set -a && source /etc/default/extoken && set +a
  pg_dump "$DATABASE_URL" -Fc -Z 9 -f /opt/extoken/backup/extoken-$(date +%F).dump
'
# 恢复
pg_restore -d postgresql://extoken:pwd@127.0.0.1:5432/extoken?sslmode=disable -C --clean backup.dump

# 手动把某个普通用户升为管理员
sudo -u postgres psql extoken -c "UPDATE selfhost_users SET role='admin' WHERE username='小明';"
```

crontab 自动备份（`sudo crontab -u extoken -e`）：
```cron
# 每天 03:20 备份数据库；保留最近 30 天
20 3 * * *   cd /opt/extoken && mkdir -p backup && \
             set -a && source /etc/default/extoken && set +a && \
             pg_dump "$DATABASE_URL" -Fc -Z 9 -f backup/extoken-$(date +\%F).dump && \
             find backup -name 'extoken-*.dump' -mtime +30 -delete
```

---

## 六、本地开发快速跑（给你自己的 Mac）

```bash
cd /Users/bytedance/Documents/extokentest/miaodaextoken
cp .env.example .env
# 1. 本地装 Postgres（brew install postgresql@16）后建库、把 DATABASE_URL 写对
# 2. 初始化 DB
npm run db:init
# 3. 启动前后端（concurrently，前端 5173 / 后端 3000）
npm run dev
# 4. 访问 http://localhost:5173 → 登录 admin / ChangeMe123!
```

---

## 七、安全加固清单（上线前逐一过一遍）

- [ ] 安全组只开 22/80/443；3000/5432 没暴露到公网
- [ ] `.env` / `/etc/default/extoken` 权限 640 且归属 `extoken:extoken`
- [ ] JWT 三个密钥都是 `openssl rand -base64 64` 生成的**不同**随机串，不是示例值
- [ ] 初始管理员密码已改，`INIT_ADMIN_PASSWORD` 已注释
- [ ] Nginx 反代后 Node 监听 `127.0.0.1` 不是 `0.0.0.0`
- [ ] 启用了 `fail2ban` + ufw，SSH 禁止 root 登录（`/etc/ssh/sshd_config` 设 `PermitRootLogin no`）
- [ ] 数据库开启自动备份（上面 crontab 那段）并做过一次**恢复演练**
- [ ] 开启 systemd 服务的所有安全加固（ProtectSystem=strict 等）

---

## 八、给外部 Agent 调开放网关的认证方式（自建版）

妙搭原方案：`Authorization: Bearer <妙搭平台签发 Token>`
私有化后改成：**请求头两个同时带上**

```bash
curl -X POST https://extoken.your-domain.com/openapi/extoken/package \
  -H "Authorization: Bearer <和 .env 里 OPENAPI_GATEWAY_TOKEN 填一模一样的字符串>" \
  -H "x-extoken-key: exk_xxxxxxxxxxxxxxxxxxxxxxxx"   \
  -H "Content-Type: application/json" \
  -d '{"title":"测试","expiresAt":"2025-12-31T23:59:59Z","maxRedemptions":3}'
```

- `Authorization: Bearer <GATEWAY_TOKEN>` — 平台级认证（同一个部署实例所有 Agent 共享）
- `x-extoken-key: exk_xxx` — 用户级 API Key（登录后在「快速上手」页里点「重置 API Key」生成）

---

## 九、常见问题

**Q1：我没域名，能不能直接 IP + 3000 用？**
可以，把 `.env` 里 `SERVER_HOST` 改成 `0.0.0.0`，安全组临时开 3000 端口。但 3000 跑明文 HTTP 不安全，不推荐长期用。

**Q2：Let's Encrypt 必须有域名吗？我想直接给 IP 签证书。**
Let's Encrypt 不给纯裸 IP 签证书。想走 HTTPS 但没域名：
- 用 nip.io：`your-ip.nip.io` 也算一个合法 FQDN，Certbot 能签（注意 Chrome 有时会标不安全，但能用）；
- 或自签证书 + 用户手动信任（不推荐，体验差）。

**Q3：用户注册开放，会不会被人刷？**
默认是开放注册的。如果你只想自己/小范围团队用，两种办法：
- 在 `/etc/default/extoken` 再加个 `DISABLE_REGISTER=true`，然后自己加个环境变量判断，UsersService.register 里判断直接抛错即可（留作作业，一行改动）；
- Nginx 层给 `/api/auth/register` 加 `allow <你家IP段>; deny all;`。

**Q4：怎么升级版本？**
```bash
sudo -u extoken bash -c 'cd /opt/extoken && git pull --ff-only && npm install && npm run build:prod'
# 有 schema 变更则：sudo -u extoken bash -c 'cd /opt/extoken && set -a && source /etc/default/extoken && set +a && node scripts/init-db.js'
sudo systemctl restart extoken
```

---

**✅ 搞定！** 如果你在某一步卡住（例如备案、Nginx 配置、Postgres 权限），把报错贴给我，我直接给你改。

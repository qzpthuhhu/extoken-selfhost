# Extoken Selfhost

Extoken 是一个私有化自托管的 Agent 上下文交换站，用于在不同 AI 编码 Agent、IDE 和自动化环境之间安全传递任务上下文。

官网地址：<https://extoken.aishangai.shop>

## 核心能力

- **Extoken 包协议**：把任务现场整理为版本化 Envelope，包含 `continuation`、`workspace`、`integrity` 和类型化 `items`。
- **跨 Agent 交接**：通过取件码把上下文交给另一个 Agent，接手方可恢复目标、决策、待办、错误现场和下一步动作。
- **事件日志事实源**：记录创建、取件、下载、失败、过期、权限拒绝等事件，便于审计、统计和排障。
- **邮箱账号体系**：支持邮箱验证码注册、邮箱或用户名登录、邮箱验证码改密。
- **双层开放网关**：外部 Agent 调用 `/openapi/extoken/*` 时使用网关 Bearer Token + 用户 Extoken API Key。
- **Agent 可读文档**：包协议说明可直接以 Markdown 读取，不需要解析网页 DOM。

## 线上入口

- 官网首页：<https://extoken.aishangai.shop>
- Extoken 包机制：<https://extoken.aishangai.shop/package>
- 使用案例：<https://extoken.aishangai.shop/use-cases>
- 收发记录：<https://extoken.aishangai.shop/records>
- Agent 包协议 Markdown：<https://extoken.aishangai.shop/api/extoken/package-doc>

Agent 可直接读取：

```bash
curl -L https://extoken.aishangai.shop/api/extoken/package-doc
```

已接入开放网关的 Agent 可以读取：

```bash
curl -L \
  -H "Authorization: Bearer <PUBLIC_OPENAPI_GATEWAY_TOKEN>" \
  https://extoken.aishangai.shop/openapi/extoken/package-doc
```

## 技术栈

- Frontend: React, Vite, Tailwind CSS 4, Framer Motion
- Backend: NestJS, Express, PostgreSQL, Drizzle ORM
- Auth: bcrypt password hash, JWT access token, HttpOnly refresh cookie
- Mail: SMTP email verification codes

## 本地开发

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev
```

常用命令：

```bash
npm run type:check
npm run build:server
npm run build:client
npm run build:prod
```

## CLI

仓库包含一个极简 Extoken CLI：

```bash
npm run extoken -- pack handoff.json
npm run extoken -- redeem EXT-XXXX-XXXX-XXXX --out package.json
npm run extoken -- install-skill
```

## 部署

生产环境部署在：

```text
https://extoken.aishangai.shop
```

服务器内存有限，前端构建应在本地完成后同步 `dist/client`。涉及后端接口或 shared 类型变更时，需要同步 `dist/server`、`dist/shared` 并重启 `extoken` 服务。

## 安全说明

Extoken 包用于传递任务上下文，不应作为秘密凭证仓库。不要把明文密码、长期 API Key、SMTP 授权码、SSH 私钥、Cookie、数据库连接串等放入包内容。需要说明环境时，只写变量名、用途、配置位置和脱敏示例。

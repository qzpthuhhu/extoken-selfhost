#!/usr/bin/env node
/**
 * Extoken 私有化部署 - 一键初始化数据库
 *
 * 功能：
 *   1. 读取 .env（或 OS 环境变量）中的 DATABASE_URL / INIT_ADMIN_*
 *   2. 连接 PostgreSQL，若数据库不存在先提示创建
 *   3. 切换/确认当前 PostgreSQL 角色为 extoken，再执行 schema.sql（建表 + 索引）
 *   4. 如果 INIT_ADMIN_USERNAME / INIT_ADMIN_PASSWORD 存在，自动创建初始管理员
 *
 * 用法：
 *   # 在本地/ECS 项目根目录执行（npm install 完 dependencies 后）
 *   node scripts/init-db.js
 *
 *   # 只执行建表（不创建管理员）
 *   node scripts/init-db.js --only-schema
 *
 *   # 强制重置：先 DROP 表再建（危险！会删所有数据）
 *   node scripts/init-db.js --force-reset
 */
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const onlySchema = args.has('--only-schema');
const forceReset = args.has('--force-reset');

// 1. 加载环境变量
const envFile = process.env.ENV_FILE || path.join(root, '.env');
if (fs.existsSync(envFile)) {
  const parsed = require('dotenv').config({ path: envFile });
  if (parsed.error) {
    console.error(`[init-db] 读取 .env 失败：${parsed.error.message}`);
  }
}

function env(name, fallback = undefined) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const DATABASE_URL = env('DATABASE_URL');
const REQUIRED_DB_ROLE = env('INIT_DB_REQUIRED_ROLE', 'extoken');
const ADMIN_USERNAME = env('INIT_ADMIN_USERNAME');
const ADMIN_PASSWORD = env('INIT_ADMIN_PASSWORD');
const ADMIN_NICKNAME = env('INIT_ADMIN_NICKNAME', '超级管理员');
const ADMIN_EMAIL = env('INIT_ADMIN_EMAIL');

if (!DATABASE_URL) {
  console.error(
    `\n[init-db] ❌ 缺少 DATABASE_URL 环境变量。\n请先复制 .env.example 为 .env，并填写数据库连接串。\n示例：DATABASE_URL=postgresql://extoken:yourpwd@127.0.0.1:5432/extoken?schema=public&sslmode=disable\n`,
  );
  process.exit(1);
}

// 2. 历史内置 schema 仅作为极端情况下的兜底；正常以 server/database/schema.sql 为真源。
const FALLBACK_SCHEMA_SQL = `
-- ============================================================
-- Extoken Self-host - 数据库 Schema（PostgreSQL 14+）
-- 生成时间：由 scripts/init-db.js 自动生成 / 维护
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. 私有化部署：用户表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS selfhost_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(64) NOT NULL UNIQUE,
    nickname        VARCHAR(128) NOT NULL,
    email           VARCHAR(255),
    avatar_url      VARCHAR(512),
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(16) NOT NULL DEFAULT 'user',
    status          VARCHAR(16) NOT NULL DEFAULT 'active',
    token_version   INTEGER NOT NULL DEFAULT 0,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_selfhost_users_role ON selfhost_users(role);
CREATE INDEX IF NOT EXISTS idx_selfhost_users_status ON selfhost_users(status);

-- ------------------------------------------------------------
-- 2. Extoken 账户（用户的 API Key + 额度统计）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extoken_account (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES selfhost_users(id) ON DELETE CASCADE,
    username        VARCHAR(128) NOT NULL,
    nickname        VARCHAR(255),
    api_key         VARCHAR(255) NOT NULL UNIQUE,
    api_key_hash    VARCHAR(128) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_packages_sent     INTEGER NOT NULL DEFAULT 0,
    total_packages_redeemed INTEGER NOT NULL DEFAULT 0,
    last_used_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_extoken_account_user ON extoken_account(user_id);
CREATE INDEX IF NOT EXISTS idx_extoken_account_apikeyhash ON extoken_account(api_key_hash);

-- ------------------------------------------------------------
-- 3. Extoken 包裹（加密上下文）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extoken_package (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id   UUID NOT NULL REFERENCES selfhost_users(id) ON DELETE CASCADE,
    title           VARCHAR(255),
    description     TEXT,
    tags            VARCHAR(128)[],
    code            VARCHAR(32) NOT NULL UNIQUE,       -- EX-XXXX-XXXX-XXXX
    aes_iv          VARCHAR(64) NOT NULL,
    pbkdf2_salt     VARCHAR(128) NOT NULL,
    pbkdf2_iterations INTEGER NOT NULL DEFAULT 120000,
    auth_tag        VARCHAR(64) NOT NULL,
    payload_bytes   BIGINT NOT NULL DEFAULT 0,
    payload_sha256  VARCHAR(64),
    payload_cipher  TEXT NOT NULL,                     -- AES-256-GCM base64
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    max_redemptions INTEGER,
    redemptions     INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(16) NOT NULL DEFAULT 'active'
);
CREATE INDEX IF NOT EXISTS idx_extoken_package_owner ON extoken_package(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_extoken_package_code  ON extoken_package(code);
CREATE INDEX IF NOT EXISTS idx_extoken_package_status ON extoken_package(status);
CREATE INDEX IF NOT EXISTS idx_extoken_package_expire ON extoken_package(expires_at);

-- ------------------------------------------------------------
-- 4. Extoken 取件记录
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extoken_redemption (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id      UUID NOT NULL REFERENCES extoken_package(id) ON DELETE CASCADE,
    redeemer_user_id UUID REFERENCES selfhost_users(id) ON DELETE SET NULL,
    redeemer_client_info JSONB,
    redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    redeem_success  BOOLEAN NOT NULL DEFAULT TRUE,
    ip_addr         VARCHAR(64),
    user_agent      TEXT
);
CREATE INDEX IF NOT EXISTS idx_extoken_redemption_pkg    ON extoken_redemption(package_id);
CREATE INDEX IF NOT EXISTS idx_extoken_redemption_user   ON extoken_redemption(redeemer_user_id);
CREATE INDEX IF NOT EXISTS idx_extoken_redemption_time   ON extoken_redemption(redeemed_at);

-- ------------------------------------------------------------
-- 5. 站点：公告
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_announcement (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    content         TEXT,
    content_type    VARCHAR(16) NOT NULL DEFAULT 'markdown',
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    published       BOOLEAN NOT NULL DEFAULT TRUE,
    published_at    TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES selfhost_users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_ann_pub  ON site_announcement(published, published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_site_ann_pin  ON site_announcement(is_pinned);

-- ------------------------------------------------------------
-- 6. 站点：路线图
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_roadmap (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(32) NOT NULL DEFAULT 'planned',  -- planned / in_progress / done / cancelled
    priority        INTEGER NOT NULL DEFAULT 0,
    quarter         VARCHAR(16),
    category        VARCHAR(64),
    created_by_user_id UUID REFERENCES selfhost_users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    done_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_site_roadmap_status ON site_roadmap(status);
CREATE INDEX IF NOT EXISTS idx_site_roadmap_prio   ON site_roadmap(priority DESC);

-- ------------------------------------------------------------
-- 7. 站点：用户反馈
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitter_user_id UUID REFERENCES selfhost_users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    category        VARCHAR(64) NOT NULL DEFAULT 'general',
    priority        VARCHAR(16) NOT NULL DEFAULT 'normal',
    status          VARCHAR(32) NOT NULL DEFAULT 'new',      -- new / triaged / in_progress / resolved / closed / rejected
    reply           TEXT,
    reply_at        TIMESTAMPTZ,
    assignee_user_id UUID REFERENCES selfhost_users(id) ON DELETE SET NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_feedback_submitter ON site_feedback(submitter_user_id);
CREATE INDEX IF NOT EXISTS idx_site_feedback_status    ON site_feedback(status);
CREATE INDEX IF NOT EXISTS idx_site_feedback_category  ON site_feedback(category);

-- ------------------------------------------------------------
-- 8. 审计日志（可选：管理员操作 + 登录/登出）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_audit_log (
    id              BIGSERIAL PRIMARY KEY,
    actor_user_id   UUID REFERENCES selfhost_users(id) ON DELETE SET NULL,
    action          VARCHAR(64) NOT NULL,
    resource_type   VARCHAR(64),
    resource_id     VARCHAR(128),
    detail          JSONB,
    ip_addr         VARCHAR(64),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_audit_actor  ON app_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_app_audit_action ON app_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_app_audit_time   ON app_audit_log(created_at);
`;

const schemaSqlPath = path.join(root, 'server', 'database', 'schema.sql');
const SCHEMA_SQL = readSchemaSql(schemaSqlPath, FALLBACK_SCHEMA_SQL);

async function main() {
  console.log(`\n[init-db] 🚀 Extoken 私有化部署 · 数据库初始化\n`);
  console.log(`[init-db] 目标数据库：${maskDbUrl(DATABASE_URL)}`);
  console.log(`[init-db] 要求建表角色：${REQUIRED_DB_ROLE}`);
  console.log(
    `[init-db] 参数：--only-schema=${onlySchema}  --force-reset=${forceReset}\n`,
  );

  // 确保 schema.sql 存在，方便以后 psql 直接导入；不再用脚本内旧 DDL 覆盖当前真源。
  fs.mkdirSync(path.dirname(schemaSqlPath), { recursive: true });
  fs.writeFileSync(schemaSqlPath, SCHEMA_SQL, 'utf8');
  console.log(`[init-db] ✅ schema.sql 已写入：${schemaSqlPath}`);

  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log(`[init-db] ✅ 已连接 PostgreSQL`);
    await ensureRequiredDbRole(client);
  } catch (err) {
    console.error(
      `\n[init-db] ❌ 连接数据库失败或角色不符合要求：${err && err.message ? err.message : String(err)}\n` +
        `请检查：\n  1. PostgreSQL 是否启动？ECS 上执行 systemctl status postgresql\n  2. DATABASE_URL 的用户名/密码/数据库名/端口是否正确？\n  3. ECS 上 pg_hba.conf 是否允许本机连接？\n`,
    );
    process.exit(2);
  }

  try {
    if (forceReset) {
      console.warn(
        `\n[init-db] ⚠️  --force-reset 开启，准备删除所有表！5 秒内 Ctrl+C 可取消...\n`,
      );
      await sleep(5000);
      await dropAllTables(client);
      console.log(`[init-db] ✅ 已清空所有旧表`);
    }

    console.log(`[init-db] 📦 执行建表 SQL...`);
    await client.query(SCHEMA_SQL);
    console.log(`[init-db] ✅ 建表 + 索引完成`);

    if (!onlySchema && ADMIN_USERNAME && ADMIN_PASSWORD) {
      await ensureAdmin(client, {
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        nickname: ADMIN_NICKNAME,
        email: ADMIN_EMAIL,
      });
    } else if (!onlySchema) {
      console.warn(
        `\n[init-db] ⚠️  未设置 INIT_ADMIN_USERNAME / INIT_ADMIN_PASSWORD，跳过创建初始管理员。\n` +
          `        请在 .env 中设置后重新运行本脚本，或直接在 /login 注册一个普通用户后手动在 selfhost_users 表把 role 改为 'admin'。\n`,
      );
    }

    // 快速健康检查
    const { rows: userCount } = await client.query(
      `SELECT COUNT(*) AS c FROM selfhost_users`,
    );
    const { rows: ok } = await client.query(`SELECT 1 AS ok`);
    console.log(
      `\n[init-db] 🏁 数据库初始化完成。当前用户数：${userCount[0].c}，DB健康检查：${ok[0].ok}\n`,
    );
  } finally {
    await client.end().catch(() => {});
  }
}

async function ensureRequiredDbRole(client) {
  const { rows } = await client.query(
    `SELECT current_user AS current_user, session_user AS session_user`,
  );
  let currentUser = rows[0]?.current_user;
  const sessionUser = rows[0]?.session_user;

  if (currentUser !== REQUIRED_DB_ROLE) {
    console.warn(
      `[init-db] ⚠️  当前数据库角色是 ${currentUser || '(unknown)'}（session_user=${sessionUser || '(unknown)'}），尝试 SET ROLE ${REQUIRED_DB_ROLE}`,
    );

    await client.query(`SET ROLE ${quotePgIdentifier(REQUIRED_DB_ROLE)}`);
    const { rows: switched } = await client.query(
      `SELECT current_user AS current_user`,
    );
    currentUser = switched[0]?.current_user;
  }

  if (currentUser !== REQUIRED_DB_ROLE) {
    throw new Error(
      `当前数据库角色是 ${currentUser || '(unknown)'}（session_user=${sessionUser || '(unknown)'}），` +
        `无法切换到 ${REQUIRED_DB_ROLE}。请将 DATABASE_URL 改为 ` +
        `postgresql://${REQUIRED_DB_ROLE}:<password>@<host>:<port>/<db>?sslmode=disable，` +
        `或确认当前连接角色有 SET ROLE ${REQUIRED_DB_ROLE} 权限。`,
    );
  }

  console.log(`[init-db] ✅ 当前 PostgreSQL 角色：${currentUser}`);
}

function quotePgIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function readSchemaSql(filePath, legacyFallbackSql) {
  if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');

  throw new Error(
    `缺少权威建表文件 ${filePath}，拒绝使用脚本内历史 DDL 建表。` +
      `请先恢复 server/database/schema.sql 后重试（历史 DDL 长度：${legacyFallbackSql.length} 字符）。`,
  );
}

async function ensureAdmin(client, admin) {
  const { rows: exist } = await client.query(
    `SELECT id, username, role FROM selfhost_users WHERE username = $1`,
    [admin.username],
  );
  if (exist.length > 0) {
    const u = exist[0];
    console.log(
      `[init-db] ℹ️  管理员账号 ${u.username} 已存在（id=${u.id}，role=${u.role}），跳过创建`,
    );
    if (u.role !== 'admin') {
      await client.query(
        `UPDATE selfhost_users SET role = 'admin', updated_at = NOW() WHERE id = $1`,
        [u.id],
      );
      console.log(`[init-db] ✅ 已将 ${u.username} 的 role 提升为 admin`);
    }
    return;
  }
  const salt = await bcrypt.genSalt(10);
  const pwdHash = await bcrypt.hash(admin.password, salt);
  const now = new Date();
  const { rows: inserted } = await client.query(
    `
    INSERT INTO selfhost_users
      (username, nickname, email, password_hash, role, status, token_version, created_at, updated_at, last_login_at)
    VALUES ($1, $2, $3, $4, 'admin', 'active', 0, $5, $5, NULL)
    RETURNING id, username, role
    `,
    [
      admin.username,
      admin.nickname || admin.username,
      admin.email || null,
      pwdHash,
      now,
    ],
  );
  const u = inserted[0];
  console.log(
    `[init-db] ✅ 初始管理员创建成功：username=${u.username}  id=${u.id}  role=${u.role}`,
  );
  console.warn(
    `[init-db] ⚠️  请登录后立即修改默认密码，并在 .env 里注释/删除 INIT_ADMIN_PASSWORD 这一行！`,
  );
}

async function dropAllTables(client) {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '__drizzle%'`,
  );
  for (const { tablename } of rows) {
    await client.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
  }
}

function maskDbUrl(url) {
  try {
    const u = new URL(url);
    const user = u.username || 'user';
    u.username = user.replace(/.(?=.{1,}$)/g, '*');
    if (u.password) u.password = '******';
    return u.toString();
  } catch {
    return String(url).replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
  }
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

main().catch((err) => {
  console.error(
    `\n[init-db] ❌ 初始化失败：`,
    err && err.stack ? err.stack : err,
  );
  process.exit(3);
});

-- ============================================================
-- Extoken Self-host - 数据库 Schema（PostgreSQL 14+）
-- 生成时间：由 scripts/init-db.js 自动生成 / 维护
-- 用法（psql 直接跑）：
--   psql "$DATABASE_URL" -f server/database/schema.sql
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
    status          VARCHAR(32) NOT NULL DEFAULT 'planned',
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
    status          VARCHAR(32) NOT NULL DEFAULT 'new',
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
-- 8. 审计日志
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

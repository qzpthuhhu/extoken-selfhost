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
    email_verified_at TIMESTAMPTZ(3),
    avatar_url      VARCHAR(512),
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(16) NOT NULL DEFAULT 'user',
    status          VARCHAR(16) NOT NULL DEFAULT 'active',
    token_version   INTEGER NOT NULL DEFAULT 0,
    last_login_at   TIMESTAMPTZ,
    _created_at     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_at     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_selfhost_users_username ON selfhost_users(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_selfhost_users_email ON selfhost_users(email);
CREATE INDEX IF NOT EXISTS idx_selfhost_users_role ON selfhost_users(role);
CREATE INDEX IF NOT EXISTS idx_selfhost_users_status ON selfhost_users(status);
ALTER TABLE selfhost_users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ(3);
ALTER TABLE selfhost_users ADD COLUMN IF NOT EXISTS _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE selfhost_users ADD COLUMN IF NOT EXISTS _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ------------------------------------------------------------
-- 1.1 邮箱验证码（注册 / 重置密码）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_email_code (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL,
    purpose         VARCHAR(32) NOT NULL,
    code_hash       VARCHAR(128) NOT NULL,
    expires_at      TIMESTAMPTZ(3) NOT NULL,
    consumed_at     TIMESTAMPTZ(3),
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    client_info     TEXT NOT NULL DEFAULT '{}',
    _created_at     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auth_email_code_email_purpose ON auth_email_code(email, purpose);
CREATE INDEX IF NOT EXISTS idx_auth_email_code_expires_at ON auth_email_code(expires_at);

-- ------------------------------------------------------------
-- 2. Extoken 账户（用户的 API Key + 额度统计）
--    列/索引严格对齐 server/database/schema.ts（Drizzle ORM，运行时真相）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extoken_account (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    name              VARCHAR(255) NOT NULL,
    api_key_hash      VARCHAR(255) NOT NULL,
    api_key_prefix    VARCHAR(64) NOT NULL,
    sent_count        INTEGER NOT NULL DEFAULT 0,
    received_count    INTEGER NOT NULL DEFAULT 0,
    last_active_at    TIMESTAMPTZ(6),
    register_source   VARCHAR(32) NOT NULL DEFAULT 'web',
    creator_user_id   VARCHAR(64),
    creator_name      VARCHAR(255),
    api_key           VARCHAR(80) NOT NULL DEFAULT '',
    api_key_last_rotated_at TIMESTAMPTZ(3),
    _created_at       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _created_by       VARCHAR(64),
    _updated_at       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_by       VARCHAR(64)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_extoken_account_key_hash ON extoken_account(api_key_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_extoken_account_user_id ON extoken_account(user_id);

-- ------------------------------------------------------------
-- 3. Extoken 包裹（加密上下文）
--    列/索引严格对齐 server/database/schema.ts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extoken_package (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash         VARCHAR(255) NOT NULL,
    schema_version    INTEGER NOT NULL DEFAULT 1,
    title             VARCHAR(255) NOT NULL,
    description       TEXT NOT NULL,
    cipher_text       TEXT NOT NULL,
    iv                VARCHAR(255) NOT NULL,
    auth_tag          VARCHAR(255) NOT NULL,
    salt              VARCHAR(255) NOT NULL,
    content_sha256    VARCHAR(64) NOT NULL DEFAULT '',
    item_count        INTEGER NOT NULL DEFAULT 0,
    content_size      INTEGER NOT NULL DEFAULT 0,
    download_count    INTEGER NOT NULL DEFAULT 0,
    expires_at        TIMESTAMPTZ(6),
    owner_account_id  UUID,
    owner_user_id     UUID,
    code              VARCHAR(32) NOT NULL DEFAULT '',
    code_cipher_text  TEXT NOT NULL DEFAULT '',
    code_iv           VARCHAR(255) NOT NULL DEFAULT '',
    code_auth_tag     VARCHAR(255) NOT NULL DEFAULT '',
    source_agent      VARCHAR(255) NOT NULL DEFAULT '',
    source_session_id VARCHAR(255) NOT NULL DEFAULT '',
    source_run_id     VARCHAR(255) NOT NULL DEFAULT '',
    source_turn_id    VARCHAR(255) NOT NULL DEFAULT '',
    handoff_status    VARCHAR(64) NOT NULL DEFAULT 'ready',
    next_actions      TEXT NOT NULL DEFAULT '[]',
    blocking_state    TEXT NOT NULL DEFAULT '',
    workspace_project VARCHAR(255) NOT NULL DEFAULT '',
    workspace_root_hash VARCHAR(255) NOT NULL DEFAULT '',
    workspace_git_remote TEXT NOT NULL DEFAULT '',
    workspace_git_branch VARCHAR(255) NOT NULL DEFAULT '',
    workspace_git_commit VARCHAR(128) NOT NULL DEFAULT '',
    workspace_dirty_files_hash VARCHAR(128) NOT NULL DEFAULT '',
    integrity_proof   TEXT NOT NULL DEFAULT '{}',
    _created_at       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _created_by       VARCHAR(64),
    _updated_at       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_by       VARCHAR(64)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_extoken_code_hash ON extoken_package(code_hash);

-- 既有数据库增量补丁：CREATE TABLE IF NOT EXISTS 不会自动补列。
-- 需要在新增字段索引之前执行。
ALTER TABLE extoken_account ADD COLUMN IF NOT EXISTS api_key_last_rotated_at TIMESTAMPTZ(3);

ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS content_sha256 VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS code_cipher_text TEXT NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS code_iv VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS code_auth_tag VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS source_agent VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS source_session_id VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS source_run_id VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS source_turn_id VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS handoff_status VARCHAR(64) NOT NULL DEFAULT 'ready';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS next_actions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS blocking_state TEXT NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS workspace_project VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS workspace_root_hash VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS workspace_git_remote TEXT NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS workspace_git_branch VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS workspace_git_commit VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS workspace_dirty_files_hash VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE extoken_package ADD COLUMN IF NOT EXISTS integrity_proof TEXT NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_extoken_created_at ON extoken_package(_created_at);
CREATE INDEX IF NOT EXISTS idx_extoken_owner_account ON extoken_package(owner_account_id);
CREATE INDEX IF NOT EXISTS idx_extoken_owner_user ON extoken_package(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_extoken_handoff_status ON extoken_package(handoff_status);
CREATE INDEX IF NOT EXISTS idx_extoken_source_session ON extoken_package(source_session_id);

-- ------------------------------------------------------------
-- 4. Extoken 取件记录
--    列/索引严格对齐 server/database/schema.ts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extoken_redemption (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id            UUID NOT NULL,
    package_id            UUID NOT NULL,
    package_title         VARCHAR(255) NOT NULL,
    redeemer_user_id      UUID,
    redeemer_client_info  TEXT,
    _created_at           TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _created_by           VARCHAR(64),
    _updated_at           TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_by           VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_extoken_redemption_account ON extoken_redemption(account_id);
CREATE INDEX IF NOT EXISTS idx_extoken_redemption_package ON extoken_redemption(package_id);
CREATE INDEX IF NOT EXISTS idx_extoken_redemption_user ON extoken_redemption(redeemer_user_id);

-- ------------------------------------------------------------
-- 4.1 Extoken 事实事件日志
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extoken_package_event (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id      UUID,
    account_id      UUID,
    actor_user_id   UUID,
    event_type      VARCHAR(64) NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'succeeded',
    reason          VARCHAR(255) NOT NULL DEFAULT '',
    client_info     TEXT NOT NULL DEFAULT '{}',
    metadata        TEXT NOT NULL DEFAULT '{}',
    _created_at     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_extoken_event_package ON extoken_package_event(package_id);
CREATE INDEX IF NOT EXISTS idx_extoken_event_account ON extoken_package_event(account_id);
CREATE INDEX IF NOT EXISTS idx_extoken_event_actor ON extoken_package_event(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_extoken_event_type ON extoken_package_event(event_type);
CREATE INDEX IF NOT EXISTS idx_extoken_event_created_at ON extoken_package_event(_created_at);

-- ------------------------------------------------------------
-- 5. 站点：公告
--    列/索引严格对齐 server/database/schema.ts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_announcement (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         VARCHAR(255) NOT NULL,
    content       TEXT NOT NULL,
    category      VARCHAR(255) NOT NULL DEFAULT 'announcement',
    published     BOOLEAN NOT NULL DEFAULT TRUE,
    _created_at   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _created_by   VARCHAR(64),
    _updated_at   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_by   VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_site_announcement_created_at ON site_announcement(_created_at);
CREATE INDEX IF NOT EXISTS idx_site_announcement_published ON site_announcement(published);

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
    _created_at     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_at     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    done_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_site_roadmap_status ON site_roadmap(status);
CREATE INDEX IF NOT EXISTS idx_site_roadmap_prio   ON site_roadmap(priority DESC);

-- ------------------------------------------------------------
-- 7. 站点：用户反馈
--    列/索引严格对齐 server/database/schema.ts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_feedback (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content           TEXT NOT NULL,
    contact           VARCHAR(255),
    status            VARCHAR(255) NOT NULL DEFAULT 'open',
    admin_reply       TEXT,
    submitter_name    VARCHAR(255),
    submitter_user_id UUID,
    _created_at       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _created_by       VARCHAR(64),
    _updated_at       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_by       VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_site_feedback_status ON site_feedback(status);
CREATE INDEX IF NOT EXISTS idx_site_feedback_created_at ON site_feedback(_created_at);
CREATE INDEX IF NOT EXISTS idx_site_feedback_user_id ON site_feedback(submitter_user_id);

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
    _created_at     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_app_audit_actor  ON app_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_app_audit_action ON app_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_app_audit_time   ON app_audit_log(_created_at);

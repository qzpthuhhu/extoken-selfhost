/* eslint-disable */
/**
 * Extoken 私有化部署 - 数据库 schema
 * 脱离飞书 aPaaS 内置字段（_created_by / user_profile），改为纯文本 id + 索引
 * 用法：
 *   1. 在 ECS 上创建好数据库后，执行 npm run db:init 会自动建表 + 建初始管理员
 *   2. 或手动执行 server/database/schema.sql（脚本里会自动生成）
 */
import { sql } from 'drizzle-orm';
import { boolean, index, integer, pgEnum, pgTable, text, uniqueIndex, uuid, varchar, customType } from 'drizzle-orm/pg-core';

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined' ? ` (${config.precision})` : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

// 私有化部署不再依赖 user_profile 自定义类型：统一用 varchar(64) 存用户 id
// 保留 userProfile 别名只是为了方便老代码迁移时不用大改字段名
export const userProfile = varchar;
export const userProfileArray = customType<{ data: string[]; driverData: string }>({
  dataType() {
    return 'varchar(64)[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) return '{}' as any;
    return value as any;
  },
  fromDriver(value: string | null | undefined): string[] {
    if (!value || value === '{}') return [];
    if (Array.isArray(value)) return value as string[];
    try {
      return JSON.parse(value as any) as string[];
    } catch {
      return String(value)
        .replace(/[{}]/g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  },
});

export type FileAttachment = { bucket_id: string; file_path: string };
export const fileAttachment = customType<{ data: FileAttachment; driverData: string }>({
  dataType() {
    return 'jsonb';
  },
  toDriver(v: FileAttachment) {
    return JSON.stringify(v) as any;
  },
  fromDriver(v: any): FileAttachment {
    if (!v) return { bucket_id: '', file_path: '' };
    if (typeof v === 'string') {
      try {
        return JSON.parse(v);
      } catch {
        return { bucket_id: '', file_path: v };
      }
    }
    return v as FileAttachment;
  },
});

// ========================================================
// 用户表（自建账号体系：用户名/密码 + JWT）
// ========================================================
export const userRoleEnum = pgEnum('selfhost_user_role', ['user', 'admin']);

export const users = pgTable(
  'selfhost_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 64 }).notNull(),
    nickname: varchar('nickname', { length: 128 }).notNull().default(''),
    // bcrypt 哈希后的密码（约 60 字符）
    passwordHash: varchar('password_hash', { length: 128 }).notNull(),
    role: userRoleEnum('role').notNull().default('user'),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    email: varchar('email', { length: 255 }),
    // 账户状态
    status: varchar('status', { length: 32 }).notNull().default('active'),
    // refresh token 版本（用于全部登出/改密码后使旧 refresh token 失效）
    tokenVersion: integer('token_version').notNull().default(0),
    lastLoginAt: customTimestamptz('last_login_at', { precision: 3 }),
    createdAt: customTimestamptz('_created_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: customTimestamptz('_updated_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex('idx_selfhost_users_username').on(table.username),
    uniqueIndex('idx_selfhost_users_email').on(table.email),
    index('idx_selfhost_users_role').on(table.role),
  ],
);

// ========================================================
// 业务表：site_roadmap
// ========================================================
export const siteRoadmap = pgTable(
  'site_roadmap',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    itemType: varchar('item_type', { length: 255 }).notNull().default('feature'),
    status: varchar('status', { length: 255 }).notNull().default('planned'),
    priority: varchar('priority', { length: 255 }).notNull().default('medium'),
    createdAt: customTimestamptz('_created_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    createdBy: varchar('_created_by', { length: 64 }),
    updatedAt: customTimestamptz('_updated_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: varchar('_updated_by', { length: 64 }),
  },
  (table) => [index('idx_site_roadmap_status').on(table.status)],
);

// ========================================================
// 业务表：site_announcement
// ========================================================
export const siteAnnouncement = pgTable(
  'site_announcement',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    category: varchar('category', { length: 255 }).notNull().default('announcement'),
    published: boolean('published').notNull().default(true),
    createdAt: customTimestamptz('_created_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    createdBy: varchar('_created_by', { length: 64 }),
    updatedAt: customTimestamptz('_updated_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: varchar('_updated_by', { length: 64 }),
  },
  (table) => [
    index('idx_site_announcement_created_at').on(table.createdAt),
    index('idx_site_announcement_published').on(table.published),
  ],
);

// ========================================================
// 业务表：site_feedback
// ========================================================
export const siteFeedback = pgTable(
  'site_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    contact: varchar('contact', { length: 255 }),
    status: varchar('status', { length: 255 }).notNull().default('open'),
    adminReply: text('admin_reply'),
    submitterName: varchar('submitter_name', { length: 255 }),
    // 私有化部署：如果用户已登录则带上用户 id
    submitterUserId: uuid('submitter_user_id'),
    createdAt: customTimestamptz('_created_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    createdBy: varchar('_created_by', { length: 64 }),
    updatedAt: customTimestamptz('_updated_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: varchar('_updated_by', { length: 64 }),
  },
  (table) => [
    index('idx_site_feedback_status').on(table.status),
    index('idx_site_feedback_created_at').on(table.createdAt),
    index('idx_site_feedback_user_id').on(table.submitterUserId),
  ],
);

// ========================================================
// 业务表：extoken_redemption
// ========================================================
export const extokenRedemption = pgTable(
  'extoken_redemption',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull(),
    packageId: uuid('package_id').notNull(),
    packageTitle: varchar('package_title', { length: 255 }).notNull(),
    // 私有化部署补充：取件人 userId（登录态下），方便管理台追溯
    redeemerUserId: uuid('redeemer_user_id'),
    redeemerClientInfo: text('redeemer_client_info'),
    createdAt: customTimestamptz('_created_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    createdBy: varchar('_created_by', { length: 64 }),
    updatedAt: customTimestamptz('_updated_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: varchar('_updated_by', { length: 64 }),
  },
  (table) => [
    index('idx_extoken_redemption_account').on(table.accountId),
    index('idx_extoken_redemption_package').on(table.packageId),
    index('idx_extoken_redemption_user').on(table.redeemerUserId),
  ],
);

// ========================================================
// 业务表：extoken_account（每个用户一条，绑定 user_id）
// ========================================================
export const extokenAccount = pgTable(
  'extoken_account',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // 私有化部署：强绑定到 selfhost_users 表
    userId: uuid('user_id').notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    apiKeyHash: varchar('api_key_hash', { length: 255 }).notNull().unique(),
    apiKeyPrefix: varchar('api_key_prefix', { length: 64 }).notNull(),
    sentCount: integer('sent_count').notNull().default(0),
    receivedCount: integer('received_count').notNull().default(0),
    lastActiveAt: customTimestamptz('last_active_at', { precision: 6 }),
    registerSource: varchar('register_source', { length: 32 }).notNull().default('web'),
    // 飞书字段保留但不再依赖
    creatorUserId: varchar('creator_user_id', { length: 64 }),
    creatorName: varchar('creator_name', { length: 255 }),
    // 用于首次生成 API Key 返回给前端展示，之后直接返回空串
    apiKey: varchar('api_key', { length: 80 }).notNull().default(''),
    createdAt: customTimestamptz('_created_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    createdBy: varchar('_created_by', { length: 64 }),
    updatedAt: customTimestamptz('_updated_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: varchar('_updated_by', { length: 64 }),
  },
  (table) => [
    uniqueIndex('idx_extoken_account_key_hash').on(table.apiKeyHash),
    uniqueIndex('idx_extoken_account_user_id').on(table.userId),
  ],
);

// ========================================================
// 业务表：extoken_package
// ========================================================
export const extokenPackage = pgTable(
  'extoken_package',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codeHash: varchar('code_hash', { length: 255 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    cipherText: text('cipher_text').notNull(),
    iv: varchar('iv', { length: 255 }).notNull(),
    authTag: varchar('auth_tag', { length: 255 }).notNull(),
    salt: varchar('salt', { length: 255 }).notNull(),
    itemCount: integer('item_count').notNull().default(0),
    contentSize: integer('content_size').notNull().default(0),
    downloadCount: integer('download_count').notNull().default(0),
    expiresAt: customTimestamptz('expires_at', { precision: 6 }),
    ownerAccountId: uuid('owner_account_id'),
    // 私有化部署：直接关联到用户表，方便 CRUD 查询
    ownerUserId: uuid('owner_user_id'),
    code: varchar('code', { length: 32 }).notNull(),
    createdAt: customTimestamptz('_created_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    createdBy: varchar('_created_by', { length: 64 }),
    updatedAt: customTimestamptz('_updated_at', { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: varchar('_updated_by', { length: 64 }),
  },
  (table) => [
    uniqueIndex('idx_extoken_code_hash').on(table.codeHash),
    index('idx_extoken_created_at').on(table.createdAt),
    index('idx_extoken_owner_account').on(table.ownerAccountId),
    index('idx_extoken_owner_user').on(table.ownerUserId),
  ],
);

// ========================================================
// 旧脚本会用到的别名，保持与原代码一致
// ========================================================
export const extokenAccountTable = extokenAccount;
export const extokenPackageTable = extokenPackage;
export const extokenRedemptionTable = extokenRedemption;
export const siteAnnouncementTable = siteAnnouncement;
export const siteFeedbackTable = siteFeedback;
export const siteRoadmapTable = siteRoadmap;
export const usersTable = users;

// 类型导出
export type UserRole = 'user' | 'admin';
export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

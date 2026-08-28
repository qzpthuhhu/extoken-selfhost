/* 前后端共享的类型写在这里 */

/* ============ extoken 内容块 / 上下文协议 ============ */

export const EXTOKEN_PACKAGE_SCHEMA_VERSION = 1;

export type ExtokenItemType =
  | 'chat'
  | 'doc'
  | 'config'
  | 'file_diff'
  | 'decision'
  | 'todo'
  | 'tool_result'
  | 'env_note'
  | 'error'
  | 'token_usage'
  | 'permission';

export interface ExtokenItem {
  type: ExtokenItemType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export type ExtokenHandoffStatus =
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'needs_review'
  | 'archived';

export type ExtokenToolRecoveryMode =
  | 'replay_safe'
  | 'idempotent'
  | 'reconcile'
  | 'reattach'
  | 'outcome_unknown'
  | 'never_auto_retry';

export interface ExtokenWorkspaceIdentity {
  projectName?: string;
  rootHash?: string;
  gitRemote?: string;
  gitBranch?: string;
  gitCommit?: string;
  dirtyFilesHash?: string;
}

export interface ExtokenIntegrityProof {
  payloadSha256?: string;
  filesHash?: string;
  commandHash?: string;
  taskStateHash?: string;
  toolOperations?: Array<{
    toolName: string;
    canonicalArgsHash?: string;
    recoveryMode?: ExtokenToolRecoveryMode;
    summary?: string;
  }>;
}

export interface ExtokenContinuationContext {
  sourceAgent?: string;
  sourceSessionId?: string;
  sourceRunId?: string;
  sourceTurnId?: string;
  handoffStatus?: ExtokenHandoffStatus;
  nextActions?: string[];
  blockingState?: string;
}

export interface ExtokenPackageEnvelope {
  schemaVersion: typeof EXTOKEN_PACKAGE_SCHEMA_VERSION;
  createdAt: string;
  title: string;
  description: string;
  continuation: ExtokenContinuationContext;
  workspace: ExtokenWorkspaceIdentity;
  integrity: ExtokenIntegrityProof;
  items: ExtokenItem[];
}

export interface CreateExtokenRequest {
  title: string;
  description?: string;
  items: ExtokenItem[];
  expiresInDays?: number;
  schemaVersion?: typeof EXTOKEN_PACKAGE_SCHEMA_VERSION;
  continuation?: ExtokenContinuationContext;
  workspace?: ExtokenWorkspaceIdentity;
  integrity?: ExtokenIntegrityProof;
}

export interface CreateExtokenResponse {
  id: string;
  code: string;
  title: string;
  itemCount: number;
  expiresAt: string | null;
  schemaVersion: typeof EXTOKEN_PACKAGE_SCHEMA_VERSION;
  contentSha256: string;
}

export interface RedeemExtokenRequest {
  code: string;
}

export interface RedeemExtokenResponse {
  title: string;
  description: string;
  items: ExtokenItem[];
  createdAt: string;
  downloadCount: number;
  schemaVersion: typeof EXTOKEN_PACKAGE_SCHEMA_VERSION;
  continuation: ExtokenContinuationContext;
  workspace: ExtokenWorkspaceIdentity;
  integrity: ExtokenIntegrityProof;
}

export interface PackageDownloadResponse {
  title: string;
  description: string;
  items: ExtokenItem[];
  createdAt: string;
  schemaVersion: typeof EXTOKEN_PACKAGE_SCHEMA_VERSION;
  continuation: ExtokenContinuationContext;
  workspace: ExtokenWorkspaceIdentity;
  integrity: ExtokenIntegrityProof;
}

/* ============ 我的账户与交换记录 ============ */

export interface AccountProfile {
  id: string;
  name: string;
  apiKey: string;
  apiKeyPrefix: string;
  apiKeyLastRotatedAt: string | null;
  sentCount: number;
  receivedCount: number;
  createdAt: string;
  lastActiveAt: string | null;
}

export interface SentPackageItem {
  id: string;
  code: string;
  schemaVersion: typeof EXTOKEN_PACKAGE_SCHEMA_VERSION;
  title: string;
  description: string;
  itemCount: number;
  contentSize: number;
  downloadCount: number;
  expiresAt: string | null;
  createdAt: string;
  handoffStatus: ExtokenHandoffStatus;
  sourceAgent: string;
  workspaceProject: string;
}

export interface ReceivedPackageItem {
  id: string;
  packageId: string;
  packageTitle: string;
  packageDescription: string;
  packagerName: string;
  redeemedAt: string;
}

export interface MyAccountResponse {
  account: AccountProfile;
  sent: SentPackageItem[];
  received: ReceivedPackageItem[];
}

export interface RotateApiKeyResponse {
  account: AccountProfile;
  apiKey: string;
}

/* ============ 管理台（仅管理员） ============ */

export interface AdminAccountRow {
  id: string;
  name: string;
  apiKeyPrefix: string;
  creatorUserId: string | null;
  creatorName: string | null;
  sentCount: number;
  receivedCount: number;
  createdAt: string;
  lastActiveAt: string | null;
}

export interface AdminOverviewStats {
  totalAccounts: number;
  totalPackages: number;
  totalRedemptions: number;
  activeAccounts7d: number;
}

export interface AdminOverviewResponse {
  isAdmin: boolean;
  stats: AdminOverviewStats;
  accounts: AdminAccountRow[];
}

/* ============ 反馈与通知 ============ */

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type AnnouncementCategory = 'update' | 'announcement' | 'maintenance';

export type RoadmapItemType = 'feature' | 'bug';

export type RoadmapStatus = 'planned' | 'in_progress' | 'done' | 'wontfix';

export type RoadmapPriority = 'low' | 'medium' | 'high';

/* --- 公告（用户端 + 管理端） --- */

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementListResponse {
  items: AnnouncementItem[];
  latestAt: string | null;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  category: AnnouncementCategory;
  published?: boolean;
}

export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  category?: AnnouncementCategory;
  published?: boolean;
}

/* --- 用户反馈 --- */

export interface CreateFeedbackRequest {
  content: string;
  contact?: string;
}

export interface MyFeedbackItem {
  id: string;
  content: string;
  contact: string;
  status: FeedbackStatus;
  adminReply: string;
  createdAt: string;
}

export interface MyFeedbackListResponse {
  items: MyFeedbackItem[];
}

export interface AdminFeedbackItem {
  id: string;
  content: string;
  contact: string;
  status: FeedbackStatus;
  adminReply: string;
  submitterName: string;
  submitterUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFeedbackListResponse {
  items: AdminFeedbackItem[];
}

export interface UpdateFeedbackRequest {
  status?: FeedbackStatus;
  adminReply?: string;
}

/* --- 改进 / bug 路线图（仅管理端） --- */

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  itemType: RoadmapItemType;
  status: RoadmapStatus;
  priority: RoadmapPriority;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapListResponse {
  items: RoadmapItem[];
}

export interface CreateRoadmapRequest {
  title: string;
  description?: string;
  itemType: RoadmapItemType;
  status?: RoadmapStatus;
  priority?: RoadmapPriority;
}

export interface UpdateRoadmapRequest {
  title?: string;
  description?: string;
  itemType?: RoadmapItemType;
  status?: RoadmapStatus;
  priority?: RoadmapPriority;
}

/* --- 开放接口：项目更新情况（供外部 Agent 只读） --- */

export interface ProjectUpdatesResponse {
  appName: string;
  generatedAt: string;
  announcements: AnnouncementItem[];
  roadmap: RoadmapItem[];
}

/* --- 公开配置：前端拿不到 window.__platform__ 时的 HTTP 回退 --- */

export interface PublicConfigResponse {
  appName: string;
  publicOpenapiGatewayToken: string;
}

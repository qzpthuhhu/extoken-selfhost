/* 前后端共享的类型写在这里 */

/* ============ extoken 内容块 ============ */

export type ExtokenItemType = 'chat' | 'doc' | 'config';

export interface ExtokenItem {
  type: ExtokenItemType;
  title: string;
  content: string;
}

export interface CreateExtokenRequest {
  title: string;
  description?: string;
  items: ExtokenItem[];
  expiresInDays?: number;
}

export interface CreateExtokenResponse {
  id: string;
  code: string;
  title: string;
  itemCount: number;
  expiresAt: string | null;
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
}

export interface PackageDownloadResponse {
  title: string;
  description: string;
  items: ExtokenItem[];
  createdAt: string;
}

/* ============ 我的账户与交换记录 ============ */

export interface AccountProfile {
  id: string;
  name: string;
  apiKey: string;
  sentCount: number;
  receivedCount: number;
  createdAt: string;
  lastActiveAt: string | null;
}

export interface SentPackageItem {
  id: string;
  code: string;
  title: string;
  description: string;
  itemCount: number;
  contentSize: number;
  downloadCount: number;
  expiresAt: string | null;
  createdAt: string;
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

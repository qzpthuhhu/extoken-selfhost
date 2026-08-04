import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { DRIZZLE_DATABASE, PostgresJsDb } from '../../database/drizzle.module';
import {
  siteAnnouncement,
  siteFeedback,
  siteRoadmap,
} from '../../database/schema';
import type {
  AdminFeedbackListResponse,
  AnnouncementCategory,
  AnnouncementItem,
  AnnouncementListResponse,
  CreateAnnouncementRequest,
  CreateFeedbackRequest,
  CreateRoadmapRequest,
  FeedbackStatus,
  MyFeedbackListResponse,
  ProjectUpdatesResponse,
  RoadmapItem,
  RoadmapItemType,
  RoadmapListResponse,
  RoadmapPriority,
  RoadmapStatus,
  UpdateAnnouncementRequest,
  UpdateFeedbackRequest,
  UpdateRoadmapRequest,
} from '../../../shared/api.interface';

const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = ['update', 'announcement', 'maintenance'];
const FEEDBACK_STATUSES: FeedbackStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const ROADMAP_TYPES: RoadmapItemType[] = ['feature', 'bug'];
const ROADMAP_STATUSES: RoadmapStatus[] = ['planned', 'in_progress', 'done', 'wontfix'];
const ROADMAP_PRIORITIES: RoadmapPriority[] = ['low', 'medium', 'high'];

@Injectable()
export class SiteService {
  private readonly logger = new Logger(SiteService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDb) {}

  private toAnnouncement(row: typeof siteAnnouncement.$inferSelect): AnnouncementItem {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category as AnnouncementCategory,
      published: row.published,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  private toRoadmap(row: typeof siteRoadmap.$inferSelect): RoadmapItem {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      itemType: row.itemType as RoadmapItemType,
      status: row.status as RoadmapStatus,
      priority: row.priority as RoadmapPriority,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  /* ============ 开放接口：项目更新情况（对外只读） ============ */

  async getPublicProjectUpdates(appName: string): Promise<ProjectUpdatesResponse> {
    const [announcementRows, roadmapRows] = await Promise.all([
      this.db
        .select()
        .from(siteAnnouncement)
        .where(eq(siteAnnouncement.published, true))
        .orderBy(desc(siteAnnouncement.createdAt))
        .limit(50),
      this.db
        .select()
        .from(siteRoadmap)
        .orderBy(desc(siteRoadmap.createdAt))
        .limit(100),
    ]);
    return {
      appName,
      generatedAt: new Date().toISOString(),
      announcements: announcementRows.map((r) => this.toAnnouncement(r)),
      roadmap: roadmapRows.map((r) => this.toRoadmap(r)),
    };
  }

  /* ============ 公告（用户端） ============ */

  async listPublishedAnnouncements(): Promise<AnnouncementListResponse> {
    const rows = await this.db
      .select()
      .from(siteAnnouncement)
      .where(eq(siteAnnouncement.published, true))
      .orderBy(desc(siteAnnouncement.createdAt))
      .limit(100);
    const items = rows.map((r) => this.toAnnouncement(r));
    return { items, latestAt: items.length > 0 ? items[0].createdAt : null };
  }

  /* ============ 用户反馈 ============ */

  async createFeedback(
    user: { userId: string; username: string; nickname?: string | null } | null,
    dto: CreateFeedbackRequest,
  ): Promise<{ id: string }> {
    if (!user?.userId) {
      throw new UnauthorizedException('请先登录再提交反馈');
    }
    const content = dto.content?.trim();
    if (!content) throw new BadRequestException('反馈内容不能为空');
    const inserted = await this.db
      .insert(siteFeedback)
      .values({
        content,
        contact: dto.contact?.trim() || null,
        status: 'open',
        submitterName: (user.nickname || user.username || '用户').toString().slice(0, 255),
        submitterUserId: user.userId,
        createdBy: user.userId,
      })
      .returning({ id: siteFeedback.id });
    this.logger.log(`site feedback created by ${user.userId} (${user.username})`);
    return { id: inserted[0].id };
  }

  async listMyFeedback(user: { userId: string } | null): Promise<MyFeedbackListResponse> {
    if (!user?.userId) throw new UnauthorizedException('未登录');
    const rows = await this.db
      .select()
      .from(siteFeedback)
      .where(eq(siteFeedback.submitterUserId, user.userId))
      .orderBy(desc(siteFeedback.createdAt))
      .limit(200);
    return {
      items: rows.map((r) => ({
        id: r.id,
        content: r.content,
        contact: r.contact ?? '',
        status: r.status as FeedbackStatus,
        adminReply: r.adminReply ?? '',
        createdAt: new Date(r.createdAt).toISOString(),
      })),
    };
  }

  /* ============ 管理台：反馈处理 ============ */

  async listAllFeedback(): Promise<AdminFeedbackListResponse> {
    const rows = await this.db
      .select()
      .from(siteFeedback)
      .orderBy(desc(siteFeedback.createdAt))
      .limit(500);
    return {
      items: rows.map((r) => ({
        id: r.id,
        content: r.content,
        contact: r.contact ?? '',
        status: r.status as FeedbackStatus,
        adminReply: r.adminReply ?? '',
        submitterName: r.submitterName ?? '匿名用户',
        submitterUserId: r.submitterUserId ?? (r.createdBy as unknown as string | null) ?? null,
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
      })),
    };
  }

  async updateFeedback(id: string, dto: UpdateFeedbackRequest): Promise<{ id: string }> {
    const patch: Partial<typeof siteFeedback.$inferInsert> = { updatedAt: new Date() };
    if (dto.status !== undefined) {
      if (!FEEDBACK_STATUSES.includes(dto.status)) throw new BadRequestException('反馈状态非法');
      patch.status = dto.status;
    }
    if (dto.adminReply !== undefined) patch.adminReply = dto.adminReply.trim();
    const updated = await this.db
      .update(siteFeedback)
      .set(patch)
      .where(eq(siteFeedback.id, id))
      .returning({ id: siteFeedback.id });
    if (updated.length === 0) throw new NotFoundException('反馈不存在');
    return { id: updated[0].id };
  }

  /* ============ 管理台：公告 CRUD ============ */

  async listAllAnnouncements(): Promise<AnnouncementListResponse> {
    const rows = await this.db
      .select()
      .from(siteAnnouncement)
      .orderBy(desc(siteAnnouncement.createdAt))
      .limit(200);
    const items = rows.map((r) => this.toAnnouncement(r));
    return { items, latestAt: items.length > 0 ? items[0].createdAt : null };
  }

  async createAnnouncement(dto: CreateAnnouncementRequest, actorUserId?: string): Promise<{ id: string }> {
    const title = dto.title?.trim();
    const content = dto.content?.trim();
    if (!title || !content) throw new BadRequestException('标题和正文不能为空');
    if (!ANNOUNCEMENT_CATEGORIES.includes(dto.category)) throw new BadRequestException('公告类型非法');
    const inserted = await this.db
      .insert(siteAnnouncement)
      .values({
        title,
        content,
        category: dto.category,
        published: dto.published ?? true,
        createdBy: actorUserId ?? null,
        updatedBy: actorUserId ?? null,
      })
      .returning({ id: siteAnnouncement.id });
    return { id: inserted[0].id };
  }

  async updateAnnouncement(id: string, dto: UpdateAnnouncementRequest, actorUserId?: string): Promise<{ id: string }> {
    const patch: Partial<typeof siteAnnouncement.$inferInsert> = { updatedAt: new Date(), updatedBy: actorUserId ?? null };
    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) throw new BadRequestException('标题不能为空');
      patch.title = title;
    }
    if (dto.content !== undefined) {
      const content = dto.content.trim();
      if (!content) throw new BadRequestException('正文不能为空');
      patch.content = content;
    }
    if (dto.category !== undefined) {
      if (!ANNOUNCEMENT_CATEGORIES.includes(dto.category)) throw new BadRequestException('公告类型非法');
      patch.category = dto.category;
    }
    if (dto.published !== undefined) patch.published = dto.published;
    const updated = await this.db
      .update(siteAnnouncement)
      .set(patch)
      .where(eq(siteAnnouncement.id, id))
      .returning({ id: siteAnnouncement.id });
    if (updated.length === 0) throw new NotFoundException('公告不存在');
    return { id: updated[0].id };
  }

  async deleteAnnouncement(id: string): Promise<{ id: string }> {
    const deleted = await this.db
      .delete(siteAnnouncement)
      .where(eq(siteAnnouncement.id, id))
      .returning({ id: siteAnnouncement.id });
    if (deleted.length === 0) throw new NotFoundException('公告不存在');
    return { id: deleted[0].id };
  }

  /* ============ 管理台：路线图 CRUD ============ */

  async listRoadmap(): Promise<RoadmapListResponse> {
    const rows = await this.db
      .select()
      .from(siteRoadmap)
      .orderBy(desc(siteRoadmap.createdAt))
      .limit(300);
    return { items: rows.map((r) => this.toRoadmap(r)) };
  }

  async createRoadmapItem(dto: CreateRoadmapRequest, actorUserId?: string): Promise<{ id: string }> {
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('标题不能为空');
    if (!ROADMAP_TYPES.includes(dto.itemType)) throw new BadRequestException('类型非法');
    if (dto.status !== undefined && !ROADMAP_STATUSES.includes(dto.status)) throw new BadRequestException('状态非法');
    if (dto.priority !== undefined && !ROADMAP_PRIORITIES.includes(dto.priority)) throw new BadRequestException('优先级非法');
    const inserted = await this.db
      .insert(siteRoadmap)
      .values({
        title,
        description: dto.description?.trim() || '',
        itemType: dto.itemType,
        status: dto.status ?? 'planned',
        priority: dto.priority ?? 'medium',
        createdBy: actorUserId ?? null,
        updatedBy: actorUserId ?? null,
      })
      .returning({ id: siteRoadmap.id });
    return { id: inserted[0].id };
  }

  async updateRoadmapItem(id: string, dto: UpdateRoadmapRequest, actorUserId?: string): Promise<{ id: string }> {
    const patch: Partial<typeof siteRoadmap.$inferInsert> = { updatedAt: new Date(), updatedBy: actorUserId ?? null };
    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) throw new BadRequestException('标题不能为空');
      patch.title = title;
    }
    if (dto.description !== undefined) patch.description = dto.description.trim();
    if (dto.itemType !== undefined) {
      if (!ROADMAP_TYPES.includes(dto.itemType)) throw new BadRequestException('类型非法');
      patch.itemType = dto.itemType;
    }
    if (dto.status !== undefined) {
      if (!ROADMAP_STATUSES.includes(dto.status)) throw new BadRequestException('状态非法');
      patch.status = dto.status;
    }
    if (dto.priority !== undefined) {
      if (!ROADMAP_PRIORITIES.includes(dto.priority)) throw new BadRequestException('优先级非法');
      patch.priority = dto.priority;
    }
    const updated = await this.db
      .update(siteRoadmap)
      .set(patch)
      .where(eq(siteRoadmap.id, id))
      .returning({ id: siteRoadmap.id });
    if (updated.length === 0) throw new NotFoundException('路线图项不存在');
    return { id: updated[0].id };
  }

  async deleteRoadmapItem(id: string): Promise<{ id: string }> {
    const deleted = await this.db
      .delete(siteRoadmap)
      .where(eq(siteRoadmap.id, id))
      .returning({ id: siteRoadmap.id });
    if (deleted.length === 0) throw new NotFoundException('路线图项不存在');
    return { id: deleted[0].id };
  }
}

import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import type {
  CreateAnnouncementRequest,
  CreateFeedbackRequest,
  CreateRoadmapRequest,
  PublicConfigResponse,
  UpdateAnnouncementRequest,
  UpdateFeedbackRequest,
  UpdateRoadmapRequest,
} from '../../../shared/api.interface';
import { SiteService } from './site.service';
import { CurrentUser, RequireAuth, RequireRoles } from '../auth/auth.decorators';
import type { AuthUserPayload } from '../auth/auth.types';

@Controller('api/site')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get('announcements')
  announcements() {
    return this.siteService.listPublishedAnnouncements();
  }

  /**
   * 公开配置：前端拿不到 window.__platform__（如 Nginx 直出静态 index.html，占位符未被
   * @Render 替换）时的 HTTP 回退入口。口径与 view.controller 的 SSR 注入完全一致。
   */
  @Get('public-config')
  publicConfig(): PublicConfigResponse {
    return {
      appName: process.env.APP_NAME || process.env.VITE_APP_NAME || 'Extoken 上下文交换站',
      publicOpenapiGatewayToken:
        process.env.PUBLIC_OPENAPI_GATEWAY_TOKEN?.trim() ||
        process.env.OPENAPI_GATEWAY_TOKEN?.trim() ||
        '',
    };
  }

  @Post('feedback')
  @RequireAuth()
  async submitFeedback(
    @CurrentUser() user: AuthUserPayload | undefined,
    @Body() dto: CreateFeedbackRequest,
  ) {
    if (!user) throw new ForbiddenException('未登录');
    return this.siteService.createFeedback(
      { userId: user.sub, username: user.username, nickname: user.username },
      dto,
    );
  }

  @Get('feedback/mine')
  @RequireAuth()
  async myFeedback(@CurrentUser() user: AuthUserPayload | undefined) {
    if (!user) throw new ForbiddenException('未登录');
    return this.siteService.listMyFeedback({ userId: user.sub });
  }

  /* ---- 管理台：反馈处理 ---- */
  @Get('admin/feedback')
  @RequireRoles('admin')
  adminFeedback() {
    return this.siteService.listAllFeedback();
  }

  @Patch('admin/feedback/:id')
  @RequireRoles('admin')
  patchFeedback(@Param('id') id: string, @Body() dto: UpdateFeedbackRequest) {
    return this.siteService.updateFeedback(id, dto);
  }

  /* ---- 管理台：公告 CRUD ---- */
  @Get('admin/announcements')
  @RequireRoles('admin')
  adminAnnouncements() {
    return this.siteService.listAllAnnouncements();
  }

  @Post('admin/announcements')
  @RequireRoles('admin')
  createAnnouncement(@CurrentUser() user: AuthUserPayload | undefined, @Body() dto: CreateAnnouncementRequest) {
    return this.siteService.createAnnouncement(dto, user?.sub);
  }

  @Patch('admin/announcements/:id')
  @RequireRoles('admin')
  patchAnnouncement(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserPayload | undefined,
    @Body() dto: UpdateAnnouncementRequest,
  ) {
    return this.siteService.updateAnnouncement(id, dto, user?.sub);
  }

  @Delete('admin/announcements/:id')
  @RequireRoles('admin')
  removeAnnouncement(@Param('id') id: string) {
    return this.siteService.deleteAnnouncement(id);
  }

  /* ---- 管理台：路线图 CRUD ---- */
  @Get('admin/roadmap')
  @RequireRoles('admin')
  adminRoadmap() {
    return this.siteService.listRoadmap();
  }

  @Post('admin/roadmap')
  @RequireRoles('admin')
  createRoadmap(@CurrentUser() user: AuthUserPayload | undefined, @Body() dto: CreateRoadmapRequest) {
    return this.siteService.createRoadmapItem(dto, user?.sub);
  }

  @Patch('admin/roadmap/:id')
  @RequireRoles('admin')
  patchRoadmap(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserPayload | undefined,
    @Body() dto: UpdateRoadmapRequest,
  ) {
    return this.siteService.updateRoadmapItem(id, dto, user?.sub);
  }

  @Delete('admin/roadmap/:id')
  @RequireRoles('admin')
  removeRoadmap(@Param('id') id: string) {
    return this.siteService.deleteRoadmapItem(id);
  }
}

import { Controller, Get, Header, Param, Post, Req, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiTags } from '@nestjs/swagger';

import { ExtokenAccountService } from './extoken-account.service';
import { ExtokenService } from './extoken.service';
import { EXTOKEN_SKILL_MARKDOWN } from './extoken-skill.content';
import { EXTOKEN_PACKAGE_DOC_MARKDOWN } from '../../../shared/extoken-package-doc';
import { CurrentUser, RequireAuth, RequireRoles } from '../auth/auth.decorators';
import type { AuthUserPayload } from '../auth/auth.types';

@Controller('api/extoken')
export class ExtokenController {
  constructor(
    private readonly accountService: ExtokenAccountService,
    private readonly extokenService: ExtokenService,
  ) {}

  @Get('skill')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  skill(): string {
    return EXTOKEN_SKILL_MARKDOWN;
  }

  @Get('package-doc')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  packageDoc(): string {
    return EXTOKEN_PACKAGE_DOC_MARKDOWN;
  }

  @Get('me')
  @RequireAuth()
  async me(@CurrentUser() user: AuthUserPayload | undefined) {
    if (!user) throw new ForbiddenException('未登录');
    return this.accountService.myAccount({
      userId: user.sub,
      username: user.username,
      nickname: user.username,
    });
  }

  @Post('me/api-key/rotate')
  @RequireAuth()
  async rotateApiKey(@CurrentUser() user: AuthUserPayload | undefined) {
    if (!user) throw new ForbiddenException('未登录');
    return this.accountService.rotateApiKey({
      userId: user.sub,
      username: user.username,
      nickname: user.username,
    });
  }

  @Get('package/:id/download')
  @RequireAuth()
  async download(@Param('id') id: string, @CurrentUser() user: AuthUserPayload | undefined) {
    if (!user) throw new ForbiddenException('未登录');
    return this.extokenService.downloadForUser(id, {
      userId: user.sub,
      username: user.username,
      nickname: user.username,
    });
  }

  @Get('admin/overview')
  @RequireRoles('admin')
  async adminOverview() {
    return this.accountService.adminOverview();
  }
}

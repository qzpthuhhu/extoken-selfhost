import { Body, Controller, Get, Header, Headers, Post, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ExtokenService } from './extoken.service';
import { EXTOKEN_SKILL_MARKDOWN } from './extoken-skill.content';
import type { CreateExtokenRequest, RedeemExtokenRequest } from '../../../shared/api.interface';
import { OpenapiGatewayGuard } from './extoken.openapi.guard';
import { extractBearerToken } from '../auth/auth.middleware';
import type { AuthUserPayload } from '../auth/auth.types';
import { JwtService } from '../auth/jwt.service';

const API_KEY_HEADER = 'x-extoken-key';

@Controller('openapi/extoken')
@UseGuards(OpenapiGatewayGuard)
export class ExtokenOpenApiController {
  constructor(
    private readonly extokenService: ExtokenService,
    private readonly jwtService?: JwtService,
  ) {}

  @Get('skill')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  skill(): string {
    return EXTOKEN_SKILL_MARKDOWN;
  }

  @Post()
  async create(
    @Body() dto: CreateExtokenRequest,
    @Headers(API_KEY_HEADER) apiKey?: string,
    @Req() req?: Request,
  ) {
    const ctx = this.optionalContextFromReq(req);
    return this.extokenService.create(dto, apiKey, { ownerUserId: ctx?.sub ?? null });
  }

  @Post('redeem')
  async redeem(
    @Body() dto: RedeemExtokenRequest,
    @Headers(API_KEY_HEADER) apiKey?: string,
    @Req() req?: Request,
  ) {
    const ctx = this.optionalContextFromReq(req);
    const ua = req?.headers?.['user-agent'] || '';
    const ip = (req as unknown as { ip?: string })?.ip || req?.socket?.remoteAddress || '';
    return this.extokenService.redeem(dto.code, apiKey, {
      redeemerUserId: ctx?.sub ?? null,
      clientInfo: JSON.stringify({ ip, ua, ts: Date.now() }),
    });
  }

  private optionalContextFromReq(req?: Request): AuthUserPayload | null {
    if (!req || !this.jwtService) return null;
    const t = extractBearerToken(req);
    if (!t) return null;
    try {
      return this.jwtService.verifyAccessToken(t);
    } catch {
      return null;
    }
  }
}

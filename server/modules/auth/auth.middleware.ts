import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { CURRENT_USER_KEY, REQUIRE_AUTH_META, REQUIRE_ROLE_META } from './auth.decorators';
import { JwtService } from './jwt.service';
import type { AuthRole, AuthUserPayload } from './auth.types';

export function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization ?? '';
  if (!header) {
    const q = (req.query.token as string) || (req.query.access_token as string);
    return q || undefined;
  }
  if (/^Bearer\s+/i.test(header)) return header.slice(7).trim();
  if (/^Token\s+/i.test(header)) return header.slice(6).trim();
  return header.trim();
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const token = extractBearerToken(req);
    let user: AuthUserPayload | null = null;
    if (token) {
      try {
        user = this.jwtService.verifyAccessToken(token);
      } catch {
        // token 存在但无效：若该路由没有强制登录则放行，交给业务自己判断
        // 但如果已经是 Bearer + token 且声明了角色，直接抛 401 是合理的，这里先在下面元数据检查里处理
        user = null;
      }
    }

    (req as unknown as { [CURRENT_USER_KEY]?: AuthUserPayload })[CURRENT_USER_KEY] = user as AuthUserPayload | undefined;
    (req as unknown as { user?: AuthUserPayload }).user = user as AuthUserPayload | undefined;

    // 路由级元数据检查（通过 @RequireAuth / @RequireRoles）
    const handler = req.route?.stack?.[0]?.handle;
    const requireAuth = handler ? this.reflector.get<boolean>(REQUIRE_AUTH_META, handler) : undefined;
    const requireRoles = handler ? this.reflector.get<AuthRole[]>(REQUIRE_ROLE_META, handler) : undefined;
    if ((requireAuth || requireRoles) && !user) {
      throw new ForbiddenException('未登录或 access_token 无效');
    }
    if (requireRoles && user && !requireRoles.includes(user.role)) {
      throw new ForbiddenException(`权限不足：要求角色 ${requireRoles.join('|')}，当前为 ${user.role}`);
    }
    next();
  }
}

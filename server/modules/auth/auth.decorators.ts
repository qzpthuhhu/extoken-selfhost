import { createParamDecorator, ExecutionContext, SetMetadata, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthRole, AuthUserPayload } from './auth.types';

export const CURRENT_USER_KEY = '__selfhost_current_user__';
export const REQUIRE_ROLE_META = '__selfhost_require_roles__';
export const REQUIRE_AUTH_META = '__selfhost_require_auth__';

/**
 * 自定义装饰器：读取 req.user（由 AuthMiddleware 注入）
 * 用法：@CurrentUser() user: AuthUserPayload
 *      @CurrentUser('sub') userId: string
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUserPayload | undefined, ctx: ExecutionContext): AuthUserPayload | AuthUserPayload[keyof AuthUserPayload] | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { [CURRENT_USER_KEY]?: AuthUserPayload; user?: AuthUserPayload }>();
    const user = req[CURRENT_USER_KEY] || req.user;
    if (!field) return user;
    return user ? user[field] : undefined;
  },
);

/**
 * 路由级元数据：要求已登录
 * 配合 AuthMiddleware 全局生效，局部强制要求时可以再标注 @RequireAuth()
 */
export const RequireAuth = () => SetMetadata(REQUIRE_AUTH_META, true);

/**
 * 路由级元数据：要求特定角色（隐式已登录）
 */
export const RequireRoles = (...roles: AuthRole[]) => SetMetadata(REQUIRE_ROLE_META, roles);

export function assertAuth<T extends object>(
  req: T,
  opts?: { requireLogin?: boolean; allowRoles?: AuthRole[]; allowAnyOfRoles?: AuthRole[] },
): AuthUserPayload | null {
  const user = (req as unknown as { [CURRENT_USER_KEY]?: AuthUserPayload; user?: AuthUserPayload })[CURRENT_USER_KEY] ||
    (req as unknown as { user?: AuthUserPayload }).user || null;
  const required = opts?.requireLogin ?? false;
  const roles = opts?.allowRoles ?? opts?.allowAnyOfRoles ?? [];

  if (required && !user) {
    throw new UnauthorizedException('未登录，请先通过 POST /api/auth/login 登录获取 access_token');
  }
  if (user && roles.length > 0 && !roles.includes(user.role)) {
    throw new ForbiddenException(`权限不足：要求角色 ${roles.join('|')}，当前为 ${user.role}`);
  }
  return user;
}

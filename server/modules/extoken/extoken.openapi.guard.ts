import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';

/**
 * 开放网关鉴权守卫：
 * 原妙搭 aPaaS 平台会自动校验 Authorization: Bearer <aPaaS 网关 token>，
 * 私有化部署后我们自己校验：Authorization: Bearer <process.env.OPENAPI_GATEWAY_TOKEN>
 * 任何调用 /openapi/extoken/* 的外部 Agent 必须同时带：
 *   Authorization: Bearer <OPENAPI_GATEWAY_TOKEN>
 *   x-extoken-key: exk_xxx（你的账户 API Key）
 */
@Injectable()
export class OpenapiGatewayGuard implements CanActivate {
  private readonly token: string;
  private readonly allowMissingToken: boolean;
  constructor() {
    const t = process.env.OPENAPI_GATEWAY_TOKEN?.trim();
    this.allowMissingToken =
      process.env.NODE_ENV === 'development' &&
      process.env.ALLOW_OPENAPI_WITHOUT_GATEWAY_TOKEN === 'true';

    if (!t && this.allowMissingToken) {
      // eslint-disable-next-line no-console
      console.warn(
        '[OpenapiGatewayGuard] 开发模式下未配置 OPENAPI_GATEWAY_TOKEN，且已显式允许跳过网关鉴权。请勿用于生产环境。',
      );
    }
    this.token = t || '';
  }

  canActivate(ctx: ExecutionContext): boolean {
    if (!this.token) {
      if (this.allowMissingToken) return true;
      throw new ServiceUnavailableException(
        '开放网关未启用：服务端缺少 OPENAPI_GATEWAY_TOKEN 配置',
      );
    }
    const req = ctx.switchToHttp().getRequest<Request>();
    const header = (req.headers as unknown as Record<string, string | undefined>).authorization || '';
    const candidate = /^Bearer\s+/i.test(header) ? header.slice(7).trim() : header.trim();
    if (!candidate || candidate !== this.token) {
      throw new UnauthorizedException(
        '开放网关未授权：请在请求头加上 Authorization: Bearer <你的 OPENAPI_GATEWAY_TOKEN>',
      );
    }
    return true;
  }
}

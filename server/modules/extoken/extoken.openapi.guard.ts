import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

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
  constructor() {
    const t = process.env.OPENAPI_GATEWAY_TOKEN?.trim();
    if (!t) {
      // 避免把 undefined 当 token 用；开发态没配时允许跳过，但会打警告
      // eslint-disable-next-line no-console
      console.warn('[OpenapiGatewayGuard] 未配置 OPENAPI_GATEWAY_TOKEN，将允许 /openapi/extoken/* 匿名访问。生产环境必须配置强随机字符串！');
      this.token = '';
    } else {
      this.token = t;
    }
  }

  canActivate(ctx: ExecutionContext): boolean {
    if (!this.token) return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    const header = (req.headers as Record<string, string | undefined>).authorization || '';
    const candidate = /^Bearer\s+/i.test(header) ? header.slice(7).trim() : header.trim();
    if (!candidate || candidate !== this.token) {
      throw new UnauthorizedException(
        '开放网关未授权：请在请求头加上 Authorization: Bearer <你的 OPENAPI_GATEWAY_TOKEN>',
      );
    }
    return true;
  }
}

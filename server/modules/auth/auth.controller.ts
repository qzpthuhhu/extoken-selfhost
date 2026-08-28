import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from './auth.decorators';
import { EmailVerificationService } from './email-verification.service';
import { JwtService } from './jwt.service';
import type {
  AuthResponse,
  AuthSessionResponse,
  LoginReq,
  RegisterReq,
  ResetPasswordReq,
  SendEmailCodeReq,
  SendEmailCodeResponse,
  UserPublicProfile,
} from './auth.types';
import { UsersService } from './users.service';
import { AuthUserPayload } from './auth.types';
import { RequireAuth } from './auth.decorators';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

@ApiTags('Auth 鉴权（自建账号体系）')
@Controller('/api/auth')
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  private getRefreshCookieOptions() {
    const maxAge = Number(process.env.JWT_REFRESH_TTL || 7 * 24 * 3600) * 1000;
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
      maxAge,
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    };
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie('extoken_refresh_token', refreshToken, this.getRefreshCookieOptions());
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie('extoken_refresh_token', this.getRefreshCookieOptions());
  }

  private toSessionResponse(resp: AuthResponse): AuthSessionResponse {
    return {
      user: resp.user,
      accessToken: resp.accessToken,
      accessTokenExpiresAt: resp.accessTokenExpiresAt,
      tokenType: resp.tokenType,
    };
  }

  @Post('/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '注册新用户（邮箱验证码 + 密码）' })
  async register(
    @Body() body: RegisterReq,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    if (!body || !body.email || !body.emailCode || !body.password) {
      throw new BadRequestException('请求体需包含 email、emailCode 和 password');
    }
    const session = await this.users.register(body);
    this.setRefreshCookie(res, session.refreshToken);
    return this.toSessionResponse(session);
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登录（邮箱/用户名 + 密码），返回 access_token + refresh_token' })
  async login(
    @Body() body: LoginReq,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    if (!body || !body.username || !body.password) {
      throw new BadRequestException('请求体需包含 username 和 password');
    }
    const session = await this.users.login(body);
    this.setRefreshCookie(res, session.refreshToken);
    return this.toSessionResponse(session);
  }

  @Post('/email-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送邮箱验证码（注册 / 重置密码）' })
  sendEmailCode(@Body() body: SendEmailCodeReq, @Res({ passthrough: true }) res: Response): Promise<SendEmailCodeResponse> {
    if (!body?.email || !body?.purpose) {
      throw new BadRequestException('请求体需包含 email 和 purpose');
    }
    return this.emailVerification.sendCode({
      email: body.email,
      purpose: body.purpose,
      clientInfo: {
        ip:
          (res.req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
          res.req.socket.remoteAddress ||
          '',
        userAgent: res.req.headers['user-agent'] || '',
      },
    });
  }

  @Post('/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '使用邮箱验证码重置密码' })
  async resetPassword(@Body() body: ResetPasswordReq): Promise<{ ok: true }> {
    if (!body?.email || !body?.code || !body?.newPassword) {
      throw new BadRequestException('请求体需包含 email、code 和 newPassword');
    }
    await this.users.resetPasswordByEmail(body.email, body.code, body.newPassword);
    return { ok: true };
  }

  @Post('/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '使用 refresh_token 换发新的 access_token + refresh_token' })
  async refresh(
    @Body() body: { refreshToken?: string; refresh_token?: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    const token =
      body?.refreshToken ||
      body?.refresh_token ||
      (res.req as Response['req'] & { cookies?: Record<string, string> }).cookies?.extoken_refresh_token;
    if (!token) throw new BadRequestException('需要 refreshToken 字段');
    const payload = this.jwt.verifyRefreshToken(token);
    const session = await this.users.refresh(payload);
    this.setRefreshCookie(res, session.refreshToken);
    return this.toSessionResponse(session);
  }

  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '退出登录并清理 refresh cookie' })
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    this.clearRefreshCookie(res);
    return { ok: true };
  }

  @Get('/me')
  @HttpCode(HttpStatus.OK)
  @RequireAuth()
  @ApiOperation({ summary: '查看当前登录用户资料（需 access_token）' })
  async me(@CurrentUser() user: AuthUserPayload | undefined): Promise<UserPublicProfile> {
    if (!user) throw new UnauthorizedException();
    const profile = await this.users.findById(user.sub);
    if (!profile) throw new UnauthorizedException('用户不存在');
    return profile;
  }

  @Post('/password')
  @HttpCode(HttpStatus.OK)
  @RequireAuth()
  @ApiOperation({ summary: '修改登录密码（会使旧 refresh_token 全部失效）' })
  changePassword(
    @CurrentUser() user: AuthUserPayload | undefined,
    @Body() body: { oldPassword: string; newPassword: string },
  ): Promise<UserPublicProfile> {
    if (!user) throw new UnauthorizedException();
    if (!body?.oldPassword || !body?.newPassword) {
      throw new BadRequestException('需要 oldPassword 和 newPassword');
    }
    return this.users.changePassword(user.sub, body.oldPassword, body.newPassword);
  }

  @Get('/health')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  health(): { ok: true } {
    return { ok: true };
  }
}

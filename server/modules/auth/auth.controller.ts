import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from './auth.decorators';
import { JwtService } from './jwt.service';
import type { AuthResponse, LoginReq, RegisterReq, UserPublicProfile } from './auth.types';
import { UsersService } from './users.service';
import { AUTH_ROLE_ADMIN, AUTH_ROLE_USER, AuthRole, AuthUserPayload } from './auth.types';
import { RequireAuth, RequireRoles, assertAuth } from './auth.decorators';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

@ApiTags('Auth 鉴权（自建账号体系）')
@Controller('/api/auth')
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  @Post('/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '注册新用户（用户名+密码+昵称）' })
  register(@Body() body: RegisterReq): Promise<AuthResponse> {
    if (!body || !body.username || !body.password) {
      throw new BadRequestException('请求体需包含 username 和 password');
    }
    return this.users.register(body);
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登录（用户名+密码），返回 access_token + refresh_token' })
  login(@Body() body: LoginReq): Promise<AuthResponse> {
    if (!body || !body.username || !body.password) {
      throw new BadRequestException('请求体需包含 username 和 password');
    }
    return this.users.login(body);
  }

  @Post('/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '使用 refresh_token 换发新的 access_token + refresh_token' })
  refresh(@Body() body: { refreshToken?: string; refresh_token?: string }): Promise<AuthResponse> {
    const token = body?.refreshToken || body?.refresh_token;
    if (!token) throw new BadRequestException('需要 refreshToken 字段');
    const payload = this.jwt.verifyRefreshToken(token);
    return this.users.refresh(payload);
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

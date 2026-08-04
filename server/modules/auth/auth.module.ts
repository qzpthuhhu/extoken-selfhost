import { Global, MiddlewareConsumer, Module, NestModule, OnModuleInit, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtService } from './jwt.service';
import { AuthController } from './auth.controller';
import { AuthMiddleware } from './auth.middleware';

@Global()
@Module({
  controllers: [AuthController],
  providers: [JwtService, UsersService, AuthMiddleware],
  exports: [JwtService, UsersService, AuthMiddleware],
})
export class AuthModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  constructor(private readonly users: UsersService) {}

  configure(consumer: MiddlewareConsumer): void {
    // 对除登录/注册/健康/公开静态资源/开放网关外的 API 启用 AuthMiddleware（可选登录，强制元数据决定是否拒绝）
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        '/api/(?!auth/login|auth/register|auth/health).*',
        // site 公开接口、openapi 走自己的双 Key 鉴权，不经过 JWT
      );
  }

  async onModuleInit(): Promise<void> {
    const adminUser = process.env.INIT_ADMIN_USERNAME;
    const adminPwd = process.env.INIT_ADMIN_PASSWORD;
    if (adminUser && adminPwd) {
      try {
        await this.users.ensureAdminIfMissing({
          username: adminUser,
          password: adminPwd,
          nickname: process.env.INIT_ADMIN_NICKNAME,
        });
      } catch (err) {
        this.logger.error(`创建初始管理员失败：${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      this.logger.warn(
        '[AuthModule] 未配置 INIT_ADMIN_USERNAME/INIT_ADMIN_PASSWORD，若数据库里一个用户都没有，请先注册一个用户，或使用 npm run db:init 创建初始管理员',
      );
    }
  }
}

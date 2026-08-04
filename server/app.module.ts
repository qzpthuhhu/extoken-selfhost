import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { DrizzleModule } from './database/drizzle.module';
import { AuthModule } from './modules/auth/auth.module';
import { ExtokenModule } from './modules/extoken/extoken.module';
import { SiteModule } from './modules/site/site.module';
import { ViewModule } from './modules/view/view.module';
import { HelloModule } from './modules/hello/hello.module';

@Module({
  imports: [
    // 配置模块：自动读取 .env，生产环境优先读 OS 环境变量
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? undefined : '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production' && !process.env.LOAD_DOTENV,
      cache: true,
    }),

    // 全局限流：登录/注册/兑换等热点接口防刷
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
    ]),

    // 数据库模块：Drizzle + postgres-js
    DrizzleModule,

    // 认证模块：JWT + 自建用户体系（Global）
    AuthModule,

    // ====== 业务模块 ======
    ExtokenModule,
    SiteModule,
    HelloModule,

    // ⚠️ ViewModule 是兜底路由模块，必须放在最后
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

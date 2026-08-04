import { Global, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createDrizzleClient, DRIZZLE_DATABASE, endDrizzleClient, getDrizzleClient, pingDatabase } from './db-config';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DATABASE,
      useFactory: async (): Promise<PostgresJsDatabase> => {
        const client = createDrizzleClient();
        const ok = await pingDatabase(client);
        if (!ok) {
          throw new Error(
            '无法连接到 PostgreSQL，请检查 .env 中 DATABASE_URL 是否正确，ECS 上请确认 postgresql 服务已启动且密码/数据库名正确',
          );
        }
        return client;
      },
    },
  ],
  exports: [DRIZZLE_DATABASE],
})
export class DrizzleModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleModule.name);

  onModuleInit(): void {
    this.logger.log('DrizzleModule 初始化完成');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('关闭 Drizzle 连接池...');
    await endDrizzleClient();
  }
}

export { DRIZZLE_DATABASE };
export type PostgresJsDb = PostgresJsDatabase;

// 兼容 server/* 其他文件里对 @lark-apaas/fullstack-nestjs-core 里 DRIZZLE_DATABASE 的引用
export const DRIZZLE_DATABASE_ALIAS = DRIZZLE_DATABASE;

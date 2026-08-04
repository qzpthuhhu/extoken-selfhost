import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: process.env.ENV_FILE || '.env' });

function ensure(v: string | undefined, name: string): string {
  if (!v) {
    throw new Error(
      `[drizzle.config] 缺少环境变量 ${name}：请在项目根目录创建 .env，并参考 .env.example 设置 DATABASE_URL`,
    );
  }
  return v;
}

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: ensure(process.env.DATABASE_URL, 'DATABASE_URL'),
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: 'supabase', // 统一用时间戳+语义，跟默认的 serial 都行
    table: '__drizzle_migrations__',
    schema: 'public',
  },
  casing: 'snake_case',
});

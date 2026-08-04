import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

export const DRIZZLE_DATABASE = 'DRIZZLE_DATABASE_TOKEN' as const;

const logger = new Logger('DrizzleDB');

let dbInstance: PostgresJsDatabase | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

export function buildDbConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST ?? '127.0.0.1';
  const port = process.env.DB_PORT ?? '5432';
  const user = process.env.DB_USER ?? 'postgres';
  const pass = process.env.DB_PASSWORD ?? '';
  const name = process.env.DB_NAME ?? 'extoken';
  return `postgresql://${user}:${pass}@${host}:${port}/${name}?schema=public&sslmode=disable`;
}

export function createDrizzleClient(): PostgresJsDatabase {
  if (dbInstance && sqlClient) return dbInstance;
  const url = buildDbConnectionString();
  // 隐去密码打印
  const masked = url.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1****$2');
  logger.log(`Connecting to Postgres: ${masked}`);
  sqlClient = postgres(url, {
    max: Number(process.env.DB_MAX_CONN || 20),
    idle_timeout: Number(process.env.DB_IDLE_TIMEOUT || 20),
    connect_timeout: 10,
    prepare: false,
    onnotice: (notice) => {
      if (process.env.LOG_LEVEL === 'debug') logger.debug(`PG notice: ${notice.message}`);
    },
  });
  dbInstance = drizzle(sqlClient, { schema: {} });
  return dbInstance;
}

export async function pingDatabase(db: PostgresJsDatabase): Promise<boolean> {
  try {
    await db.execute(sql => sql`SELECT 1 AS ping`);
    logger.log('Database connected OK');
    return true;
  } catch (error) {
    logger.error(`Database connection failed: ${String(error)}`);
    return false;
  }
}

export function getDrizzleClient(): PostgresJsDatabase {
  if (!dbInstance) return createDrizzleClient();
  return dbInstance;
}

export async function endDrizzleClient(): Promise<void> {
  if (sqlClient) {
    try {
      await sqlClient.end();
    } catch (_) {}
    sqlClient = null;
  }
  dbInstance = null;
}

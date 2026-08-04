import { randomBytes, createHash } from 'crypto';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { desc, eq, sql, gte, count } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { DRIZZLE_DATABASE, PostgresJsDb } from '../../database/drizzle.module';
import { extokenAccount, extokenPackage, extokenRedemption } from '../../database/schema';
import type { AccountProfile, AdminOverviewResponse, MyAccountResponse } from '../../../shared/api.interface';

const API_KEY_PREFIX = 'exk_';

@Injectable()
export class ExtokenAccountService {
  private readonly logger = new Logger(ExtokenAccountService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDb) {}

  private generateKey(): string {
    return `${API_KEY_PREFIX}${randomBytes(24).toString('hex')}`;
  }

  /**
   * 私有化部署：按 selfhost_users.id 查找或创建 extoken 账户
   * 代替原飞书体系 getOrCreateForUser(creator_user_id, creator_name)
   */
  async getOrCreateForSelfhostUser(args: {
    userId: string;
    username: string;
    nickname?: string | null;
  }): Promise<typeof extokenAccount.$inferSelect> {
    const { userId, username, nickname } = args;
    if (!userId) throw new UnauthorizedException('未登录（JWT 中无 sub）');

    const existing = await this.db
      .select()
      .from(extokenAccount)
      .where(eq(extokenAccount.userId, userId))
      .limit(1);
    if (existing.length > 0) return existing[0];

    const apiKey = this.generateKey();
    const name = (nickname || username || 'Extoken用户').toString().slice(0, 255);
    const inserted = await this.db
      .insert(extokenAccount)
      .values({
        userId,
        name,
        apiKey,
        apiKeyHash: this.hashApiKey(apiKey),
        apiKeyPrefix: apiKey.slice(0, 12),
        creatorUserId: null, // 与飞书脱钩，清空
        creatorName: name,
        registerSource: 'web',
      })
      .returning();
    this.logger.log(`extoken account created for selfhost user id=${userId} username=${username}`);
    return inserted[0];
  }

  async resolveByKey(apiKey: string | undefined): Promise<typeof extokenAccount.$inferSelect> {
    const trimmed = apiKey?.trim();
    if (!trimmed) throw new UnauthorizedException('缺少 API Key，请在请求头携带 x-extoken-key: exk_xxxx');
    // 优先查 hash，再回退直接查 apiKey 列（兼容旧版本数据）
    const hash = this.hashApiKey(trimmed);
    const rows = await this.db
      .select()
      .from(extokenAccount)
      .where(eq(extokenAccount.apiKeyHash, hash))
      .limit(1);
    if (rows.length > 0) return rows[0];
    const rows2 = await this.db
      .select()
      .from(extokenAccount)
      .where(eq(extokenAccount.apiKey, trimmed))
      .limit(1);
    if (rows2.length === 0) throw new UnauthorizedException('API Key 无效（x-extoken-key 不匹配任何账户）');
    return rows2[0];
  }

  async incrementSent(accountId: string): Promise<void> {
    await this.db
      .update(extokenAccount)
      .set({ sentCount: sql`${extokenAccount.sentCount} + 1`, lastActiveAt: new Date() })
      .where(eq(extokenAccount.id, accountId));
  }

  async recordRedemption(
    accountId: string,
    packageId: string,
    packageTitle: string,
    extra?: { redeemerUserId?: string | null; clientInfo?: string },
  ): Promise<void> {
    await this.db.insert(extokenRedemption).values({
      accountId,
      packageId,
      packageTitle,
      redeemerUserId: extra?.redeemerUserId || null,
      redeemerClientInfo: extra?.clientInfo || null,
    });
    await this.db
      .update(extokenAccount)
      .set({ receivedCount: sql`${extokenAccount.receivedCount} + 1`, lastActiveAt: new Date() })
      .where(eq(extokenAccount.id, accountId));
  }

  private toProfile(row: typeof extokenAccount.$inferSelect): AccountProfile {
    return {
      id: row.id,
      name: row.name,
      apiKey: row.apiKey,
      sentCount: row.sentCount,
      receivedCount: row.receivedCount,
      createdAt: new Date(row.createdAt).toISOString(),
      lastActiveAt: row.lastActiveAt ? new Date(row.lastActiveAt).toISOString() : null,
    };
  }

  async adminOverview(): Promise<AdminOverviewResponse> {
    const accountRows = await this.db
      .select()
      .from(extokenAccount)
      .orderBy(desc(extokenAccount.lastActiveAt), desc(extokenAccount.createdAt))
      .limit(500);

    const packageCountRows = await this.db.select({ value: count() }).from(extokenPackage);
    const redemptionCountRows = await this.db.select({ value: count() }).from(extokenRedemption);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const active7dRows = await this.db
      .select({ value: count() })
      .from(extokenAccount)
      .where(gte(extokenAccount.lastActiveAt, sevenDaysAgo));

    return {
      isAdmin: true,
      stats: {
        totalAccounts: accountRows.length,
        totalPackages: Number(packageCountRows[0]?.value ?? 0),
        totalRedemptions: Number(redemptionCountRows[0]?.value ?? 0),
        activeAccounts7d: Number(active7dRows[0]?.value ?? 0),
      },
      accounts: accountRows.map((r) => ({
        id: r.id,
        name: r.name,
        apiKeyPrefix: r.apiKeyPrefix,
        creatorUserId: r.userId ?? null,
        creatorName: r.creatorName ?? null,
        sentCount: r.sentCount,
        receivedCount: r.receivedCount,
        createdAt: new Date(r.createdAt).toISOString(),
        lastActiveAt: r.lastActiveAt ? new Date(r.lastActiveAt).toISOString() : null,
      })),
    };
  }

  async myAccount(user: { userId: string; username: string; nickname?: string | null }): Promise<MyAccountResponse> {
    const account = await this.getOrCreateForSelfhostUser(user);
    const packager = alias(extokenAccount, 'packager');

    const sentRows = await this.db
      .select({
        id: extokenPackage.id,
        code: extokenPackage.code,
        title: extokenPackage.title,
        description: extokenPackage.description,
        itemCount: extokenPackage.itemCount,
        contentSize: extokenPackage.contentSize,
        downloadCount: extokenPackage.downloadCount,
        expiresAt: extokenPackage.expiresAt,
        createdAt: extokenPackage.createdAt,
      })
      .from(extokenPackage)
      .where(eq(extokenPackage.ownerAccountId, account.id))
      .orderBy(desc(extokenPackage.createdAt))
      .limit(100);

    const receivedRows = await this.db
      .select({
        id: extokenRedemption.id,
        packageId: extokenRedemption.packageId,
        packageTitle: extokenRedemption.packageTitle,
        packageDescription: extokenPackage.description,
        packagerName: packager.name,
        createdAt: extokenRedemption.createdAt,
      })
      .from(extokenRedemption)
      .leftJoin(extokenPackage, eq(extokenRedemption.packageId, extokenPackage.id))
      .leftJoin(packager, eq(extokenPackage.ownerAccountId, packager.id))
      .where(eq(extokenRedemption.accountId, account.id))
      .orderBy(desc(extokenRedemption.createdAt))
      .limit(100);

    return {
      account: this.toProfile(account),
      sent: sentRows.map((r) => ({
        id: r.id,
        code: r.code,
        title: r.title,
        description: r.description,
        itemCount: r.itemCount,
        contentSize: r.contentSize,
        downloadCount: r.downloadCount,
        expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
        createdAt: new Date(r.createdAt).toISOString(),
      })),
      received: receivedRows.map((r) => ({
        id: r.id,
        packageId: r.packageId,
        packageTitle: r.packageTitle,
        packageDescription: r.packageDescription ?? '',
        packagerName: r.packagerName ?? '未知',
        redeemedAt: new Date(r.createdAt).toISOString(),
      })),
    };
  }

  private hashApiKey(key: string): string {
    return createHash('sha256').update(key.trim()).digest('hex');
  }
}

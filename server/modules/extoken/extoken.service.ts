import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  createHash,
} from 'crypto';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  GoneException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DRIZZLE_DATABASE, PostgresJsDb } from '../../database/drizzle.module';
import { extokenPackage, extokenRedemption } from '../../database/schema';
import type {
  CreateExtokenRequest,
  CreateExtokenResponse,
  ExtokenItem,
  PackageDownloadResponse,
  RedeemExtokenResponse,
} from '../../../shared/api.interface';
import { ExtokenAccountService } from './extoken-account.service';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_GROUP = 4;
const CODE_GROUPS = 3;
const PBKDF2_ITERATIONS = 120000;
const KEY_LENGTH = 32;

@Injectable()
export class ExtokenService {
  private readonly logger = new Logger(ExtokenService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDb,
    private readonly accountService: ExtokenAccountService,
  ) {}

  private generateCode(): string {
    const groups: string[] = [];
    for (let g = 0; g < CODE_GROUPS; g += 1) {
      const bytes = randomBytes(CODE_GROUP);
      let group = '';
      for (let i = 0; i < CODE_GROUP; i += 1) {
        group += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
      }
      groups.push(group);
    }
    return `EXT-${groups.join('-')}`;
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
  }

  private deriveKey(code: string, salt: Buffer): Buffer {
    return pbkdf2Sync(code.trim().toUpperCase(), salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  }

  async create(
    dto: CreateExtokenRequest,
    apiKey?: string,
    ctx?: { ownerUserId?: string | null },
  ): Promise<CreateExtokenResponse> {
    const account = await this.accountService.resolveByKey(apiKey);

    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('包标题不能为空');
    const items = Array.isArray(dto.items) ? dto.items : [];
    if (items.length === 0) throw new BadRequestException('至少需要一个内容块');

    const plaintext = JSON.stringify(items);
    const contentSize = Buffer.byteLength(plaintext, 'utf8');

    const code = this.generateCode();
    const codeHash = this.hashCode(code);
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = this.deriveKey(code, salt);

    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    let expiresAt: Date | null = null;
    if (dto.expiresInDays && dto.expiresInDays > 0) {
      expiresAt = new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const inserted = await this.db
      .insert(extokenPackage)
      .values({
        codeHash,
        code,
        title,
        description: dto.description?.trim() ?? '',
        cipherText: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        salt: salt.toString('base64'),
        itemCount: items.length,
        contentSize,
        expiresAt,
        ownerAccountId: account.id,
        ownerUserId: ctx?.ownerUserId || null,
      })
      .returning({ id: extokenPackage.id });

    await this.accountService.incrementSent(account.id);

    this.logger.log(`extoken package created: ${inserted[0].id}`);

    return {
      id: inserted[0].id,
      code,
      title,
      itemCount: items.length,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    };
  }

  async redeem(
    code: string,
    apiKey?: string,
    ctx?: { redeemerUserId?: string | null; clientInfo?: string },
  ): Promise<RedeemExtokenResponse> {
    const account = await this.accountService.resolveByKey(apiKey);

    const normalized = code?.trim();
    if (!normalized) throw new BadRequestException('EXtoken取件码不能为空');
    const codeHash = this.hashCode(normalized);

    const rows = await this.db
      .select()
      .from(extokenPackage)
      .where(eq(extokenPackage.codeHash, codeHash))
      .limit(1);

    if (rows.length === 0) throw new NotFoundException('EXtoken取件码无效或包不存在');
    const row = rows[0];

    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
      throw new GoneException('该 extoken 包已过期');
    }

    let items: ExtokenItem[];
    try {
      const salt = Buffer.from(row.salt, 'base64');
      const iv = Buffer.from(row.iv, 'base64');
      const authTag = Buffer.from(row.authTag, 'base64');
      const key = this.deriveKey(normalized, salt);

      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(row.cipherText, 'base64')),
        decipher.final(),
      ]);
      items = JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      this.logger.error(`extoken decrypt failed: ${String(error)}`);
      throw new BadRequestException('解密失败，EXtoken取件码不匹配');
    }

    await this.db
      .update(extokenPackage)
      .set({ downloadCount: sql`${extokenPackage.downloadCount} + 1` })
      .where(eq(extokenPackage.id, row.id));

    await this.accountService.recordRedemption(account.id, row.id, row.title, {
      redeemerUserId: ctx?.redeemerUserId || null,
      clientInfo: ctx?.clientInfo || null,
    });

    return {
      title: row.title,
      description: row.description,
      items,
      createdAt: new Date(row.createdAt).toISOString(),
      downloadCount: row.downloadCount + 1,
    };
  }

  private decryptItems(row: typeof extokenPackage.$inferSelect): ExtokenItem[] {
    try {
      const salt = Buffer.from(row.salt, 'base64');
      const iv = Buffer.from(row.iv, 'base64');
      const authTag = Buffer.from(row.authTag, 'base64');
      const key = this.deriveKey(row.code, salt);

      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(row.cipherText, 'base64')),
        decipher.final(),
      ]);
      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      this.logger.error(`extoken decrypt failed: ${String(error)}`);
      throw new BadRequestException('解密失败，包内容已损坏');
    }
  }

  async downloadForUser(
    packageId: string,
    user: { userId: string; username: string; nickname?: string | null },
  ): Promise<PackageDownloadResponse> {
    const account = await this.accountService.getOrCreateForSelfhostUser(user);

    const rows = await this.db
      .select()
      .from(extokenPackage)
      .where(eq(extokenPackage.id, packageId))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('包不存在');
    const row = rows[0];

    const isOwner = row.ownerAccountId === account.id;
    if (!isOwner) {
      const redeemed = await this.db
        .select({ id: extokenRedemption.id })
        .from(extokenRedemption)
        .where(
          and(
            eq(extokenRedemption.accountId, account.id),
            eq(extokenRedemption.packageId, packageId),
          ),
        )
        .limit(1);
      if (redeemed.length === 0) throw new ForbiddenException('无权下载该包（需先在 /openapi/extoken/redeem 取件）');
    }

    const items = this.decryptItems(row);

    return {
      title: row.title,
      description: row.description,
      items,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }
}

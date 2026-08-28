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
import { extokenPackage, extokenPackageEvent, extokenRedemption } from '../../database/schema';
import type {
  CreateExtokenRequest,
  CreateExtokenResponse,
  ExtokenContinuationContext,
  ExtokenHandoffStatus,
  ExtokenIntegrityProof,
  ExtokenItem,
  ExtokenPackageEnvelope,
  ExtokenWorkspaceIdentity,
  PackageDownloadResponse,
  RedeemExtokenResponse,
} from '../../../shared/api.interface';
import { EXTOKEN_PACKAGE_SCHEMA_VERSION } from '../../../shared/api.interface';
import { ExtokenAccountService } from './extoken-account.service';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_GROUP = 4;
const CODE_GROUPS = 3;
const PBKDF2_ITERATIONS = 120000;
const KEY_LENGTH = 32;
const VALID_HANDOFF_STATUS: readonly ExtokenHandoffStatus[] = [
  'ready',
  'in_progress',
  'blocked',
  'needs_review',
  'archived',
];

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

  private hashPayload(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private deriveKey(code: string, salt: Buffer): Buffer {
    return pbkdf2Sync(code.trim().toUpperCase(), salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  }

  private escrowKey(): Buffer | null {
    const secret =
      process.env.EXTOKEN_CODE_ESCROW_SECRET?.trim() ||
      process.env.JWT_SECRET?.trim() ||
      process.env.OPENAPI_GATEWAY_TOKEN?.trim() ||
      '';
    if (!secret) return null;
    return createHash('sha256').update(secret).digest();
  }

  private encryptCodeForEscrow(code: string): {
    cipherText: string;
    iv: string;
    authTag: string;
  } | null {
    const key = this.escrowKey();
    if (!key) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
    return {
      cipherText: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
    };
  }

  private decryptEscrowedCode(row: typeof extokenPackage.$inferSelect): string {
    if (row.code) return row.code;
    if (!row.codeCipherText || !row.codeIv || !row.codeAuthTag) return '';
    const key = this.escrowKey();
    if (!key) return '';
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(row.codeIv, 'base64'));
      decipher.setAuthTag(Buffer.from(row.codeAuthTag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(row.codeCipherText, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch (error) {
      this.logger.error(`extoken code escrow decrypt failed: ${String(error)}`);
      return '';
    }
  }

  private normalizeContinuation(dto: CreateExtokenRequest): Required<ExtokenContinuationContext> {
    const continuation = dto.continuation ?? {};
    const status = VALID_HANDOFF_STATUS.includes(continuation.handoffStatus as ExtokenHandoffStatus)
      ? (continuation.handoffStatus as ExtokenHandoffStatus)
      : 'ready';
    return {
      sourceAgent: String(continuation.sourceAgent ?? '').slice(0, 255),
      sourceSessionId: String(continuation.sourceSessionId ?? '').slice(0, 255),
      sourceRunId: String(continuation.sourceRunId ?? '').slice(0, 255),
      sourceTurnId: String(continuation.sourceTurnId ?? '').slice(0, 255),
      handoffStatus: status,
      nextActions: Array.isArray(continuation.nextActions)
        ? continuation.nextActions.map((v) => String(v)).filter(Boolean).slice(0, 20)
        : [],
      blockingState: String(continuation.blockingState ?? '').slice(0, 4000),
    };
  }

  private normalizeWorkspace(dto: CreateExtokenRequest): Required<ExtokenWorkspaceIdentity> {
    const workspace = dto.workspace ?? {};
    return {
      projectName: String(workspace.projectName ?? '').slice(0, 255),
      rootHash: String(workspace.rootHash ?? '').slice(0, 255),
      gitRemote: String(workspace.gitRemote ?? '').slice(0, 4000),
      gitBranch: String(workspace.gitBranch ?? '').slice(0, 255),
      gitCommit: String(workspace.gitCommit ?? '').slice(0, 128),
      dirtyFilesHash: String(workspace.dirtyFilesHash ?? '').slice(0, 128),
    };
  }

  private normalizeIntegrity(integrity: ExtokenIntegrityProof | undefined): ExtokenIntegrityProof {
    if (!integrity || typeof integrity !== 'object') return {};
    return {
      payloadSha256: integrity.payloadSha256 ? String(integrity.payloadSha256).slice(0, 128) : undefined,
      filesHash: integrity.filesHash ? String(integrity.filesHash).slice(0, 128) : undefined,
      commandHash: integrity.commandHash ? String(integrity.commandHash).slice(0, 128) : undefined,
      taskStateHash: integrity.taskStateHash ? String(integrity.taskStateHash).slice(0, 128) : undefined,
      toolOperations: Array.isArray(integrity.toolOperations)
        ? integrity.toolOperations
            .map((op) => ({
              toolName: String(op.toolName ?? '').slice(0, 128),
              canonicalArgsHash: op.canonicalArgsHash
                ? String(op.canonicalArgsHash).slice(0, 128)
                : undefined,
              recoveryMode: op.recoveryMode,
              summary: op.summary ? String(op.summary).slice(0, 1000) : undefined,
            }))
            .filter((op) => op.toolName)
            .slice(0, 100)
        : undefined,
    };
  }

  private buildEnvelope(dto: CreateExtokenRequest, createdAt: Date): ExtokenPackageEnvelope {
    const continuation = this.normalizeContinuation(dto);
    const workspace = this.normalizeWorkspace(dto);
    return {
      schemaVersion: EXTOKEN_PACKAGE_SCHEMA_VERSION,
      createdAt: createdAt.toISOString(),
      title: dto.title.trim(),
      description: dto.description?.trim() ?? '',
      continuation,
      workspace,
      integrity: this.normalizeIntegrity(dto.integrity),
      items: dto.items,
    };
  }

  private parseJson<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  private decodeEnvelope(
    row: typeof extokenPackage.$inferSelect,
    code: string,
  ): ExtokenPackageEnvelope {
    let parsed: unknown;
    try {
      const salt = Buffer.from(row.salt, 'base64');
      const iv = Buffer.from(row.iv, 'base64');
      const authTag = Buffer.from(row.authTag, 'base64');
      const key = this.deriveKey(code, salt);

      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(row.cipherText, 'base64')),
        decipher.final(),
      ]);
      parsed = JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      this.logger.error(`extoken decrypt failed: ${String(error)}`);
      throw new BadRequestException('解密失败，EXtoken取件码不匹配');
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as ExtokenPackageEnvelope).schemaVersion === EXTOKEN_PACKAGE_SCHEMA_VERSION &&
      Array.isArray((parsed as ExtokenPackageEnvelope).items)
    ) {
      return parsed as ExtokenPackageEnvelope;
    }

    const legacyItems = Array.isArray(parsed) ? (parsed as ExtokenItem[]) : [];
    return {
      schemaVersion: EXTOKEN_PACKAGE_SCHEMA_VERSION,
      createdAt: new Date(row.createdAt).toISOString(),
      title: row.title,
      description: row.description,
      continuation: {
        sourceAgent: row.sourceAgent || '',
        sourceSessionId: row.sourceSessionId || '',
        sourceRunId: row.sourceRunId || '',
        sourceTurnId: row.sourceTurnId || '',
        handoffStatus: (row.handoffStatus || 'ready') as ExtokenHandoffStatus,
        nextActions: this.parseJson<string[]>(row.nextActions, []),
        blockingState: row.blockingState || '',
      },
      workspace: {
        projectName: row.workspaceProject || '',
        rootHash: row.workspaceRootHash || '',
        gitRemote: row.workspaceGitRemote || '',
        gitBranch: row.workspaceGitBranch || '',
        gitCommit: row.workspaceGitCommit || '',
        dirtyFilesHash: row.workspaceDirtyFilesHash || '',
      },
      integrity: this.parseJson<ExtokenIntegrityProof>(row.integrityProof, {}),
      items: legacyItems,
    };
  }

  private async recordEvent(input: {
    packageId?: string | null;
    accountId?: string | null;
    actorUserId?: string | null;
    eventType: string;
    status?: 'succeeded' | 'failed';
    reason?: string;
    clientInfo?: unknown;
    metadata?: unknown;
  }): Promise<void> {
    try {
      await this.db.insert(extokenPackageEvent).values({
        packageId: input.packageId || null,
        accountId: input.accountId || null,
        actorUserId: input.actorUserId || null,
        eventType: input.eventType,
        status: input.status ?? 'succeeded',
        reason: input.reason ? String(input.reason).slice(0, 255) : '',
        clientInfo: JSON.stringify(input.clientInfo ?? {}),
        metadata: JSON.stringify(input.metadata ?? {}),
      });
    } catch (error) {
      this.logger.warn(`failed to record extoken package event: ${String(error)}`);
    }
  }

  async create(
    dto: CreateExtokenRequest,
    apiKey?: string,
    ctx?: { ownerUserId?: string | null },
  ): Promise<CreateExtokenResponse> {
    let account: Awaited<ReturnType<ExtokenAccountService['resolveByKey']>> | undefined;
    try {
      account = await this.accountService.resolveByKey(apiKey);

      const title = dto.title?.trim();
      if (!title) throw new BadRequestException('包标题不能为空');
      const items = Array.isArray(dto.items) ? dto.items : [];
      if (items.length === 0) throw new BadRequestException('至少需要一个内容块');

      const createdAt = new Date();
      const envelope = this.buildEnvelope({ ...dto, title, items }, createdAt);
      const plaintext = JSON.stringify(envelope);
      const contentSha256 = this.hashPayload(plaintext);

      envelope.integrity = {
        ...envelope.integrity,
        payloadSha256: envelope.integrity.payloadSha256 || contentSha256,
      };
      const finalPlaintext = JSON.stringify(envelope);
      const finalContentSha256 = this.hashPayload(finalPlaintext);

      const code = this.generateCode();
      const codeHash = this.hashCode(code);
      const codeEscrow = this.encryptCodeForEscrow(code);
      const salt = randomBytes(16);
      const iv = randomBytes(12);
      const key = this.deriveKey(code, salt);

      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(finalPlaintext, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      let expiresAt: Date | null = null;
      if (dto.expiresInDays && dto.expiresInDays > 0) {
        expiresAt = new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000);
      }

      const inserted = await this.db
        .insert(extokenPackage)
        .values({
          codeHash,
          schemaVersion: EXTOKEN_PACKAGE_SCHEMA_VERSION,
          code: codeEscrow ? '' : code,
          codeCipherText: codeEscrow?.cipherText ?? '',
          codeIv: codeEscrow?.iv ?? '',
          codeAuthTag: codeEscrow?.authTag ?? '',
          title,
          description: dto.description?.trim() ?? '',
          cipherText: encrypted.toString('base64'),
          iv: iv.toString('base64'),
          authTag: authTag.toString('base64'),
          salt: salt.toString('base64'),
          contentSha256: finalContentSha256,
          itemCount: items.length,
          contentSize: Buffer.byteLength(finalPlaintext, 'utf8'),
          expiresAt,
          ownerAccountId: account.id,
          ownerUserId: ctx?.ownerUserId || null,
          sourceAgent: envelope.continuation.sourceAgent,
          sourceSessionId: envelope.continuation.sourceSessionId,
          sourceRunId: envelope.continuation.sourceRunId,
          sourceTurnId: envelope.continuation.sourceTurnId,
          handoffStatus: envelope.continuation.handoffStatus,
          nextActions: JSON.stringify(envelope.continuation.nextActions),
          blockingState: envelope.continuation.blockingState,
          workspaceProject: envelope.workspace.projectName,
          workspaceRootHash: envelope.workspace.rootHash,
          workspaceGitRemote: envelope.workspace.gitRemote,
          workspaceGitBranch: envelope.workspace.gitBranch,
          workspaceGitCommit: envelope.workspace.gitCommit,
          workspaceDirtyFilesHash: envelope.workspace.dirtyFilesHash,
          integrityProof: JSON.stringify(envelope.integrity),
        })
        .returning({ id: extokenPackage.id });

      await this.accountService.incrementSent(account.id);
      await this.recordEvent({
        packageId: inserted[0].id,
        accountId: account.id,
        actorUserId: ctx?.ownerUserId || null,
        eventType: 'create_succeeded',
        metadata: {
          schemaVersion: EXTOKEN_PACKAGE_SCHEMA_VERSION,
          itemCount: items.length,
          contentSha256: finalContentSha256,
          sourceAgent: envelope.continuation.sourceAgent,
          handoffStatus: envelope.continuation.handoffStatus,
        },
      });

      this.logger.log(`extoken package created: ${inserted[0].id}`);

      return {
        id: inserted[0].id,
        code,
        title,
        itemCount: items.length,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        schemaVersion: EXTOKEN_PACKAGE_SCHEMA_VERSION,
        contentSha256: finalContentSha256,
      };
    } catch (error) {
      await this.recordEvent({
        accountId: account?.id || null,
        actorUserId: ctx?.ownerUserId || null,
        eventType: 'create_failed',
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async redeem(
    code: string,
    apiKey?: string,
    ctx?: { redeemerUserId?: string | null; clientInfo?: string },
  ): Promise<RedeemExtokenResponse> {
    let account: Awaited<ReturnType<ExtokenAccountService['resolveByKey']>> | undefined;
    let row: typeof extokenPackage.$inferSelect | undefined;
    try {
      account = await this.accountService.resolveByKey(apiKey);

      const normalized = code?.trim();
      if (!normalized) throw new BadRequestException('EXtoken取件码不能为空');
      const codeHash = this.hashCode(normalized);

      const rows = await this.db
        .select()
        .from(extokenPackage)
        .where(eq(extokenPackage.codeHash, codeHash))
        .limit(1);

      if (rows.length === 0) throw new NotFoundException('EXtoken取件码无效或包不存在');
      row = rows[0];

      if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
        await this.recordEvent({
          packageId: row.id,
          accountId: account.id,
          actorUserId: ctx?.redeemerUserId || null,
          eventType: 'expired',
          status: 'failed',
          reason: 'package_expired',
          clientInfo: this.parseJson(ctx?.clientInfo, {}),
        });
        throw new GoneException('该 extoken 包已过期');
      }

      const envelope = this.decodeEnvelope(row, normalized);

      await this.db
        .update(extokenPackage)
        .set({ downloadCount: sql`${extokenPackage.downloadCount} + 1` })
        .where(eq(extokenPackage.id, row.id));

      await this.accountService.recordRedemption(account.id, row.id, row.title, {
        redeemerUserId: ctx?.redeemerUserId || null,
        clientInfo: ctx?.clientInfo || null,
      });

      await this.recordEvent({
        packageId: row.id,
        accountId: account.id,
        actorUserId: ctx?.redeemerUserId || null,
        eventType: 'redeem_succeeded',
        clientInfo: this.parseJson(ctx?.clientInfo, {}),
        metadata: {
          schemaVersion: envelope.schemaVersion,
          downloadCount: row.downloadCount + 1,
        },
      });

      return {
        title: row.title,
        description: row.description,
        items: envelope.items,
        createdAt: new Date(row.createdAt).toISOString(),
        downloadCount: row.downloadCount + 1,
        schemaVersion: EXTOKEN_PACKAGE_SCHEMA_VERSION,
        continuation: envelope.continuation,
        workspace: envelope.workspace,
        integrity: envelope.integrity,
      };
    } catch (error) {
      await this.recordEvent({
        packageId: row?.id || null,
        accountId: account?.id || null,
        actorUserId: ctx?.redeemerUserId || null,
        eventType: 'redeem_failed',
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
        clientInfo: this.parseJson(ctx?.clientInfo, {}),
      });
      throw error;
    }
  }

  async downloadForUser(
    packageId: string,
    user: { userId: string; username: string; nickname?: string | null },
  ): Promise<PackageDownloadResponse> {
    const account = await this.accountService.getOrCreateForSelfhostUser(user);
    let row: typeof extokenPackage.$inferSelect | undefined;
    try {

      const rows = await this.db
        .select()
        .from(extokenPackage)
        .where(eq(extokenPackage.id, packageId))
        .limit(1);
      if (rows.length === 0) throw new NotFoundException('包不存在');
      row = rows[0];

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
        if (redeemed.length === 0) {
          throw new ForbiddenException('无权下载该包（需先在 /openapi/extoken/redeem 取件）');
        }
      }

      const storedCode = this.decryptEscrowedCode(row);
      if (!storedCode) {
        throw new BadRequestException('该包没有可用的服务端取件码副本，请使用 EXtoken 取件码通过开放接口取件');
      }
      const envelope = this.decodeEnvelope(row, storedCode);

      await this.recordEvent({
        packageId: row.id,
        accountId: account.id,
        actorUserId: user.userId,
        eventType: 'download_succeeded',
        metadata: { schemaVersion: envelope.schemaVersion },
      });

      return {
        title: row.title,
        description: row.description,
        items: envelope.items,
        createdAt: new Date(row.createdAt).toISOString(),
        schemaVersion: EXTOKEN_PACKAGE_SCHEMA_VERSION,
        continuation: envelope.continuation,
        workspace: envelope.workspace,
        integrity: envelope.integrity,
      };
    } catch (error) {
      await this.recordEvent({
        packageId: row?.id || packageId,
        accountId: account.id,
        actorUserId: user.userId,
        eventType: error instanceof ForbiddenException ? 'permission_denied' : 'download_failed',
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { DRIZZLE_DATABASE, PostgresJsDb } from '../../database/drizzle.module';
import { authEmailCode, users } from '../../database/schema';
import type { EmailCodePurpose, SendEmailCodeResponse } from './auth.types';
import { EmailService } from './email.service';

const CODE_TTL_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDb,
    private readonly emailService: EmailService,
  ) {}

  async sendCode(args: {
    email: string;
    purpose: EmailCodePurpose;
    clientInfo?: unknown;
  }): Promise<SendEmailCodeResponse> {
    const email = this.normalizeEmail(args.email);
    await this.assertPurposeTarget(email, args.purpose);

    const latest = await this.db
      .select()
      .from(authEmailCode)
      .where(and(eq(authEmailCode.email, email), eq(authEmailCode.purpose, args.purpose), isNull(authEmailCode.consumedAt)))
      .orderBy(desc(authEmailCode.createdAt))
      .limit(1);

    const last = latest[0];
    if (last) {
      const ageMs = Date.now() - new Date(last.createdAt).getTime();
      if (ageMs < RESEND_COOLDOWN_SECONDS * 1000) {
        throw new HttpException('验证码发送过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);
    await this.db.insert(authEmailCode).values({
      email,
      purpose: args.purpose,
      codeHash: this.hashCode(email, args.purpose, code),
      expiresAt,
      clientInfo: JSON.stringify(args.clientInfo ?? {}),
    });

    const delivery = await this.emailService.sendVerificationCode({
      to: email,
      code,
      purpose: args.purpose,
      expiresInMinutes: CODE_TTL_SECONDS / 60,
    });

    this.logger.log(`[email-code] purpose=${args.purpose} email=${this.maskEmail(email)} delivery=${delivery}`);
    return { ok: true, expiresInSeconds: CODE_TTL_SECONDS, delivery };
  }

  async consumeCode(emailInput: string, purpose: EmailCodePurpose, codeInput: string): Promise<string> {
    const email = this.normalizeEmail(emailInput);
    const code = String(codeInput || '').trim();
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('验证码格式不正确');
    }

    const rows = await this.db
      .select()
      .from(authEmailCode)
      .where(and(eq(authEmailCode.email, email), eq(authEmailCode.purpose, purpose), isNull(authEmailCode.consumedAt)))
      .orderBy(desc(authEmailCode.createdAt))
      .limit(1);

    const row = rows[0];
    if (!row || new Date(row.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('验证码无效或已过期');
    }
    if (row.attemptCount >= MAX_ATTEMPTS) {
      throw new HttpException('验证码尝试次数过多，请重新获取', HttpStatus.TOO_MANY_REQUESTS);
    }

    const expected = Buffer.from(row.codeHash);
    const actual = Buffer.from(this.hashCode(email, purpose, code));
    const ok = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (!ok) {
      await this.db
        .update(authEmailCode)
        .set({ attemptCount: row.attemptCount + 1 })
        .where(eq(authEmailCode.id, row.id));
      throw new UnauthorizedException('验证码错误');
    }

    await this.db
      .update(authEmailCode)
      .set({ consumedAt: new Date(), attemptCount: row.attemptCount + 1 })
      .where(eq(authEmailCode.id, row.id));

    return email;
  }

  normalizeEmail(input: string): string {
    const email = String(input || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      throw new BadRequestException('邮箱格式不正确');
    }
    return email;
  }

  private async assertPurposeTarget(email: string, purpose: EmailCodePurpose): Promise<void> {
    const rows = await this.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    const exists = rows.length > 0;
    if (purpose === 'register' && exists) {
      throw new ConflictException('该邮箱已被注册');
    }
    if (purpose === 'reset_password' && !exists) {
      throw new BadRequestException('该邮箱尚未注册');
    }
  }

  private hashCode(email: string, purpose: EmailCodePurpose, code: string): string {
    const secret = process.env.EMAIL_CODE_SECRET || process.env.JWT_REFRESH_SECRET || process.env.JWT_ACCESS_SECRET || '';
    return createHash('sha256').update(`${email}:${purpose}:${code}:${secret}`).digest('hex');
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    return `${name.slice(0, 2)}***@${domain}`;
  }
}

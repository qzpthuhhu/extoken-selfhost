import { ConflictException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { count, eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { PostgresJsDb } from '../../database/drizzle.module';
import { DRIZZLE_DATABASE } from '../../database/drizzle.module';
import { users, usersTable } from '../../database/schema';
import type { AuthResponse, AuthUserPayload, LoginReq, RegisterReq, UserPublicProfile } from './auth.types';
import { JwtService } from './jwt.service';
import type { AuthRole } from './auth.types';
import { EmailVerificationService } from './email-verification.service';

export interface CreateUserArg {
  username: string;
  password: string;
  nickname?: string;
  email?: string;
  role?: AuthRole;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDb,
    private readonly jwtService: JwtService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  async findById(id: string): Promise<UserPublicProfile | null> {
    const rows = await this.db.select(this.publicCols()).from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByUsername(username: string): Promise<(typeof users.$inferSelect) | null> {
    const rows = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<(typeof users.$inferSelect) | null> {
    const normalized = this.emailVerification.normalizeEmail(email);
    const rows = await this.db.select().from(users).where(eq(users.email, normalized)).limit(1);
    return rows[0] ?? null;
  }

  async register(req: RegisterReq): Promise<AuthResponse> {
    const email = await this.emailVerification.consumeCode(req.email, 'register', req.emailCode);
    const trimmed = await this.allocateUsername(req.username || email.split('@')[0]);
    if (trimmed.length < 3 || trimmed.length > 64) {
      throw new ConflictException('用户名长度要求 3-64 位');
    }
    this.validatePassword(req.password);
    const existing = await this.findByUsername(trimmed);
    if (existing) {
      throw new ConflictException('该用户名已被注册');
    }
    const hash = await this.hashPassword(req.password);
    const inserted = await this.db
      .insert(users)
      .values({
        username: trimmed,
        nickname: (req.nickname || trimmed).slice(0, 128),
        passwordHash: hash,
        role: 'user',
        email,
        emailVerifiedAt: new Date(),
        status: 'active',
      })
      .returning(this.publicCols());
    const profile = inserted[0]!;
    const tokens = this.jwtService.signTokens({
      userId: profile.id,
      username: profile.username,
      role: profile.role,
      tokenVersion: 0,
    });
    this.logger.log(`[register] new user ${profile.username} id=${profile.id}`);
    await this.touchLastLogin(profile.id);
    return { user: profile, ...tokens };
  }

  async login(req: LoginReq): Promise<AuthResponse> {
    const identifier = req.username.trim();
    const row = await this.findByIdentifier(identifier);
    if (!row || row.status !== 'active') {
      throw new NotFoundException('用户不存在或已停用');
    }
    const ok = await this.verifyPassword(req.password, row.passwordHash);
    if (!ok) {
      throw new ConflictException('用户名或密码错误');
    }
    const tokens = this.jwtService.signTokens({
      userId: row.id,
      username: row.username,
      role: row.role,
      tokenVersion: row.tokenVersion ?? 0,
    });
    await this.touchLastLogin(row.id);
    return { user: this.mapPublic(row), ...tokens };
  }

  async refresh(refreshPayload: AuthUserPayload): Promise<AuthResponse> {
    const row = await this.db.select().from(users).where(eq(users.id, refreshPayload.sub)).limit(1);
    const user = row[0];
    if (!user || user.status !== 'active') {
      throw new NotFoundException('用户不存在或已停用');
    }
    if ((user.tokenVersion ?? 0) !== (refreshPayload.v ?? 0)) {
      throw new UnauthorizedException('refresh_token 已失效，请重新登录');
    }
    const tokens = this.jwtService.signTokens({
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    });
    return { user: this.mapPublic(user), ...tokens };
  }

  async changePassword(userId: string, oldPwd: string, newPwd: string): Promise<UserPublicProfile> {
    this.validatePassword(newPwd);
    const rows = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('用户不存在');
    const ok = await this.verifyPassword(oldPwd, row.passwordHash);
    if (!ok) throw new ConflictException('原密码不正确');
    const newHash = await this.hashPassword(newPwd);
    const updated = await this.db
      .update(users)
      .set({
        passwordHash: newHash,
        tokenVersion: (row.tokenVersion ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning(this.publicCols());
    this.logger.warn(`[changePassword] user=${row.username} id=${userId} 已改密码并使旧 refresh_token 失效`);
    return updated[0];
  }

  async resetPasswordByEmail(emailInput: string, code: string, newPwd: string): Promise<void> {
    this.validatePassword(newPwd);
    const email = await this.emailVerification.consumeCode(emailInput, 'reset_password', code);
    const row = await this.findByEmail(email);
    if (!row || row.status !== 'active') {
      throw new NotFoundException('用户不存在或已停用');
    }
    const newHash = await this.hashPassword(newPwd);
    await this.db
      .update(users)
      .set({
        passwordHash: newHash,
        tokenVersion: (row.tokenVersion ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, row.id));
    this.logger.warn(`[resetPassword] user=${row.username} id=${row.id} 已通过邮箱验证码重置密码`);
  }

  /** 由 admin 直接创建初始管理员或新增用户 */
  async ensureAdminIfMissing(init: { username: string; password: string; nickname?: string }): Promise<void> {
    const total = await this.db.select({ c: count() }).from(users);
    const adminExist = await this.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, 'admin'));
    const anyUser = Number(total[0]?.c ?? 0) > 0;
    const anyAdmin = Number(adminExist[0]?.count ?? 0) > 0;
    if (anyUser && anyAdmin) return;
    if (anyUser && !anyAdmin) {
      this.logger.warn('已有普通用户但没有管理员，请使用数据库直接把某用户 role 改为 admin');
      return;
    }
    const existing = await this.findByUsername(init.username);
    if (existing) {
      if (existing.role !== 'admin') {
        await this.db.update(users).set({ role: 'admin', updatedAt: new Date() }).where(eq(users.id, existing.id));
        this.logger.log(`[ensureAdmin] 将已存在用户 ${existing.username} 升级为 admin`);
      }
      return;
    }
    const hash = await this.hashPassword(init.password);
    await this.db.insert(users).values({
      username: init.username.trim(),
      nickname: (init.nickname || init.username).slice(0, 128),
      passwordHash: hash,
      role: 'admin',
      status: 'active',
    });
    this.logger.log(`[ensureAdmin] 初始管理员已创建：${init.username}`);
  }

  // ---------- 工具方法 ----------

  public async hashPassword(plain: string): Promise<string> {
    // bcrypt 默认 10 轮，对私有化部署性能 + 安全平衡
    return bcrypt.hash(plain, 10);
  }

  public async verifyPassword(plain: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plain, hash);
    } catch {
      return false;
    }
  }

  public validatePassword(plain: string): void {
    if (!plain || plain.length < 8 || plain.length > 72) {
      throw new ConflictException('密码长度要求 8-72 位');
    }
    if (!/[A-Z]/.test(plain) || !/[a-z]/.test(plain) || !/\d/.test(plain)) {
      throw new ConflictException('密码需同时包含大小写字母和数字');
    }
  }

  private async findByIdentifier(identifier: string): Promise<(typeof users.$inferSelect) | null> {
    const trimmed = identifier.trim();
    if (!trimmed) return null;
    const normalizedEmail = trimmed.includes('@') ? this.emailVerification.normalizeEmail(trimmed) : '';
    const rows = await this.db
      .select()
      .from(users)
      .where(
        normalizedEmail
          ? or(eq(users.username, trimmed), eq(users.email, normalizedEmail))
          : eq(users.username, trimmed),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  private async allocateUsername(input: string): Promise<string> {
    const base = input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const fallback = `user-${Math.random().toString(36).slice(2, 8)}`;
    const root = base.length >= 3 ? base : fallback;
    let candidate = root;
    for (let i = 0; i < 20; i += 1) {
      const existing = await this.findByUsername(candidate);
      if (!existing) return candidate;
      candidate = `${root.slice(0, 54)}-${Math.random().toString(36).slice(2, 8)}`;
    }
    throw new ConflictException('用户名已被占用，请更换用户名');
  }

  private async touchLastLogin(id: string): Promise<void> {
    try {
      await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
    } catch (_) {}
  }

  private publicCols() {
    return {
      id: users.id,
      username: users.username,
      nickname: users.nickname,
      avatarUrl: users.avatarUrl,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    };
  }

  private mapPublic(row: typeof users.$inferSelect): UserPublicProfile {
    return {
      id: row.id,
      username: row.username,
      nickname: row.nickname,
      avatarUrl: row.avatarUrl,
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
    };
  }
}

export { usersTable };

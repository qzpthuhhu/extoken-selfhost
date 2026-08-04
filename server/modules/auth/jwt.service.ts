import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import type { AuthTokens, AuthUserPayload, AuthRole } from './auth.types';

/**
 * 轻量 JWT 服务（不依赖 @nestjs/jwt 的 DI，便于复用）
 * access token 有效期短，用于接口鉴权；refresh token 有效期长，只用于 /refresh 换发
 */
@Injectable()
export class JwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtlSec: number;
  private readonly refreshTtlSec: number;

  constructor() {
    this.accessSecret = this.requireEnv('JWT_ACCESS_SECRET', 24);
    this.refreshSecret = this.requireEnv('JWT_REFRESH_SECRET', 24);
    this.accessTtlSec = Number(process.env.JWT_ACCESS_TTL || 15 * 60);
    this.refreshTtlSec = Number(process.env.JWT_REFRESH_TTL || 7 * 24 * 3600);
  }

  signTokens(args: {
    userId: string;
    username: string;
    role: AuthRole;
    tokenVersion: number;
  }): AuthTokens {
    const nowMs = Date.now();
    const accessTtlMs = this.accessTtlSec * 1000;
    const refreshTtlMs = this.refreshTtlSec * 1000;

    const basePayload: Pick<AuthUserPayload, 'sub' | 'username' | 'role' | 'v'> = {
      sub: args.userId,
      username: args.username,
      role: args.role,
      v: args.tokenVersion,
    };

    const accessToken = jwt.sign({ ...basePayload, type: 'access' } satisfies AuthUserPayload, this.accessSecret, {
      expiresIn: this.accessTtlSec,
      issuer: 'extoken-selfhost',
      audience: 'extoken-selfhost',
      jwtid: crypto.randomUUID(),
    });
    const refreshToken = jwt.sign({ ...basePayload, type: 'refresh' } satisfies AuthUserPayload, this.refreshSecret, {
      expiresIn: this.refreshTtlSec,
      issuer: 'extoken-selfhost',
      audience: 'extoken-selfhost',
      jwtid: crypto.randomUUID(),
    });

    return {
      accessToken,
      accessTokenExpiresAt: nowMs + accessTtlMs,
      refreshToken,
      refreshTokenExpiresAt: nowMs + refreshTtlMs,
      tokenType: 'Bearer',
    };
  }

  verifyAccessToken(token: string): AuthUserPayload {
    try {
      return jwt.verify(token, this.accessSecret, {
        issuer: 'extoken-selfhost',
        audience: 'extoken-selfhost',
      }) as AuthUserPayload;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'invalid access token';
      throw new UnauthorizedException(`access_token 无效或已过期：${msg}`);
    }
  }

  verifyRefreshToken(token: string): AuthUserPayload {
    try {
      const payload = jwt.verify(token, this.refreshSecret, {
        issuer: 'extoken-selfhost',
        audience: 'extoken-selfhost',
      }) as AuthUserPayload;
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('refresh token 类型不对');
      }
      return payload;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'invalid refresh token';
      throw new UnauthorizedException(`refresh_token 无效或已过期：${msg}`);
    }
  }

  private requireEnv(name: string, minLen: number): string {
    const v = process.env[name];
    if (!v || v.length < minLen) {
      throw new Error(
        `[JwtService] 环境变量 ${name} 缺失或过短（要求至少 ${minLen} 字符）。生产环境请用 openssl rand -base64 64 生成`,
      );
    }
    return v;
  }
}

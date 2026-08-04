// 私有化部署的登录认证相关类型（给 auth + 其他模块共用）

export const AUTH_ROLE_USER = 'user' as const;
export const AUTH_ROLE_ADMIN = 'admin' as const;
export type AuthRole = typeof AUTH_ROLE_USER | typeof AUTH_ROLE_ADMIN;

/** 经过 JWT 鉴权后，会注入到 req.user 中的结构 */
export interface AuthUserPayload {
  /** selfhost_users.id */
  sub: string;
  username: string;
  role: AuthRole;
  /** token version，用于改密码/全部登出时使 refresh token 失效 */
  v: number;
  /** access token 还是 refresh token */
  type: 'access' | 'refresh';
  /** 签发时间（秒） */
  iat?: number;
  /** 过期时间（秒） */
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: number; // 毫秒时间戳
  refreshToken: string;
  refreshTokenExpiresAt: number;
  tokenType: 'Bearer';
}

export interface UserPublicProfile {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string | null;
  email?: string | null;
  role: AuthRole;
  status: string;
  createdAt: Date | string;
  lastLoginAt?: Date | string | null;
}

/** 通用接口：注册 */
export interface RegisterReq {
  username: string;
  nickname?: string;
  password: string;
  email?: string;
  inviteCode?: string;
}

/** 通用接口：登录 */
export interface LoginReq {
  username: string;
  password: string;
}

/** 登录/注册响应 */
export interface AuthResponse extends AuthTokens {
  user: UserPublicProfile;
}

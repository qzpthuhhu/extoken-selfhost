import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: number;
  tokenType: 'Bearer';
}

export interface AuthUser {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string | null;
  email?: string | null;
  role: 'user' | 'admin';
  status: string;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

export type EmailCodePurpose = 'register' | 'reset_password';

const TOKEN_STORAGE_KEY = 'extoken.selfhost.auth.tokens.v1';
const USER_STORAGE_KEY = 'extoken.selfhost.auth.user.v1';

function getApiBase(): string {
  // 同源部署：前端和后端同一个域名（Nginx 反代 /api 到 3000），所以直接用 ''
  // 如果是 dev 模式 vite proxy 会把 /api 代理到 3000，所以也是 ''
  const envBase = import.meta.env.VITE_API_BASE || '';
  return envBase.replace(/\/$/, '');
}

export function readTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    return null;
  }
}

export function writeTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function readUserCache(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function writeUserCache(user: AuthUser): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

// ===== 刷新 token 的队列 =====
let refreshPromise: Promise<AuthResponse> | null = null;

async function refreshTokens(): Promise<AuthResponse> {
  const base = getApiBase();
  const resp = await fetch(`${base}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: '{}',
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Refresh failed: ${resp.status} ${text}`);
  }
  const data = (await resp.json()) as AuthResponse;
  writeTokens(data);
  if (data.user) writeUserCache(data.user);
  return data;
}

// ===== 创建 axios 实例 =====
export const api = axios.create({
  baseURL: getApiBase(),
  timeout: 30_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

function attachToken(config: InternalAxiosRequestConfig, accessToken: string) {
  if (!config.headers) return;
  if (config.headers.Authorization) return; // 已手动设置
  config.headers.Authorization = `Bearer ${accessToken}`;
}

// 请求拦截：自动带 access token；若快过期（< 60s）先刷新
api.interceptors.request.use(async (config) => {
  const tokens = readTokens();
  if (!tokens) return config;

  const now = Date.now();
  const expiresSoon = tokens.accessTokenExpiresAt - now < 60_000;

  if (expiresSoon) {
    try {
      if (!refreshPromise) {
        refreshPromise = refreshTokens().finally(() => {
          refreshPromise = null;
        });
      }
      const refreshed = await refreshPromise;
      attachToken(config, refreshed.accessToken);
    } catch {
      // 刷新失败，继续用旧 token，响应拦截里 401 会清理
      attachToken(config, tokens.accessToken);
    }
  } else {
    attachToken(config, tokens.accessToken);
  }

  return config;
});

// 响应拦截：401 时自动尝试刷新一次；再失败就清理并抛出
api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const config = error.config;
    const status = error.response?.status;

    if (status === 401 && config && !(config as { _retried?: boolean })._retried) {
      (config as { _retried?: boolean })._retried = true;
      const tokens = readTokens();
      if (tokens) {
        try {
          if (!refreshPromise) {
            refreshPromise = refreshTokens().finally(() => {
              refreshPromise = null;
            });
          }
          const refreshed = await refreshPromise;
          attachToken(config as InternalAxiosRequestConfig, refreshed.accessToken);
          return api.request(config);
        } catch {
          clearTokens();
        }
      } else {
        clearTokens();
      }
    }

    return Promise.reject(error);
  },
);

// ===== 基础 API =====

export async function login(body: { username: string; password: string }): Promise<AuthResponse> {
  const resp = await api.post<AuthResponse>('/api/auth/login', body);
  const data = resp.data;
  writeTokens(data);
  if (data.user) writeUserCache(data.user);
  return data;
}

export async function register(body: {
  username?: string;
  password: string;
  email: string;
  emailCode: string;
  nickname?: string;
}): Promise<AuthResponse> {
  const resp = await api.post<AuthResponse>('/api/auth/register', body);
  const data = resp.data;
  writeTokens(data);
  if (data.user) writeUserCache(data.user);
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const resp = await api.get<AuthUser>('/api/auth/me');
  writeUserCache(resp.data);
  return resp.data;
}

export async function changePassword(body: { oldPassword: string; newPassword: string }) {
  return api.post('/api/auth/password', body);
}

export async function sendEmailCode(body: {
  email: string;
  purpose: EmailCodePurpose;
}): Promise<{ ok: true; expiresInSeconds: number; delivery: 'smtp' | 'log' }> {
  const resp = await api.post('/api/auth/email-code', body);
  return resp.data;
}

export async function resetPasswordByEmail(body: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ ok: true }> {
  const resp = await api.post('/api/auth/reset-password', body);
  return resp.data;
}

export function logout(): void {
  fetch(`${getApiBase()}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined);
  clearTokens();
}

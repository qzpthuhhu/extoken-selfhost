import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AuthResponse,
  AuthTokens,
  AuthUser,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  readTokens,
  readUserCache,
  register as apiRegister,
  writeUserCache,
} from '@client/src/lib/axios';

export const ROLE_SUBJECT = 'global' as const;

export interface AuthAbility {
  can: (role: string, _subject: typeof ROLE_SUBJECT) => boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  error: string | null;
  /** 是否已登录：access token 还在有效期内 */
  isLoggedIn: boolean;
  /** 权限：role 判断 */
  ability: AuthAbility;
  login: (body: { username: string; password: string }) => Promise<AuthResponse>;
  register: (body: {
    username: string;
    password: string;
    nickname?: string;
    email?: string;
  }) => Promise<AuthResponse>;
  logout: () => void;
  refreshMe: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function buildAbility(user: AuthUser | null): AuthAbility {
  return {
    can: (role, _subject) => {
      if (!user) return false;
      if (role === 'user') return true; // 登录即算 user
      if (role === 'admin') return user.role === 'admin';
      return user.role === role;
    },
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokens] = useState<AuthTokens | null>(() => readTokens());
  const [user, setUser] = useState<AuthUser | null>(() => readUserCache());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = useMemo(() => {
    if (!tokens) return false;
    return tokens.accessTokenExpiresAt > Date.now();
  }, [tokens]);

  const ability = useMemo(() => buildAbility(user), [user]);

  // 初次挂载：如果有缓存 token 但没缓存 user，拉一次 me
  useEffect(() => {
    let cancelled = false;
    if (isLoggedIn && !user) {
      setIsLoading(true);
      fetchMe()
        .then((u) => {
          if (cancelled) return;
          setUser(u);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(`获取用户信息失败：${err?.message || String(err)}`);
          apiLogout();
          setTokens(null);
          setUser(null);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (body: { username: string; password: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await apiLogin(body);
      setTokens(resp);
      setUser(resp.user);
      writeUserCache(resp.user);
      return resp;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '登录失败';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (body: {
      username: string;
      password: string;
      nickname?: string;
      email?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await apiRegister(body);
        setTokens(resp);
        setUser(resp.user);
        writeUserCache(resp.user);
        return resp;
      } catch (err: any) {
        const msg = err?.response?.data?.error?.message || err?.message || '注册失败';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    apiLogout();
    setTokens(null);
    setUser(null);
    setError(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const u = await fetchMe();
    setUser(u);
    return u;
  }, []);

  const value: AuthContextValue = {
    user,
    tokens,
    isLoading,
    error,
    isLoggedIn,
    ability,
    login,
    register,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}

/** 为 Layout 提供的 hook：和旧 useCurrentUserProfile 字段兼容 */
export function useCurrentUserProfile():
  | { user_id: string; name: string; avatar?: string }
  | null {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn || !user) return null;
  return {
    user_id: user.id,
    name: user.nickname || user.username,
    avatar: user.avatarUrl || undefined,
  };
}

/** 和旧 toolkit 对齐：返回 APP 标题 */
export function useAppInfo(): { appName: string } {
  const name = (import.meta.env.VITE_APP_NAME as string) || 'Extoken 上下文交换站';
  return { appName: name };
}

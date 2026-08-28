export const ROLE_SUBJECT = { USER: 'user', ADMIN: 'admin' };
export function useAuth() {
  let _cache = null;
  try { if (typeof window !== 'undefined') { const raw = localStorage.getItem('auth_user'); if (raw) _cache = JSON.parse(raw); } } catch(_) {}
  return {
    user: _cache,
    login: (u) => { _cache = u; try { localStorage.setItem('auth_user', JSON.stringify(u)); } catch(_) {} },
    logout: () => { _cache = null; try { localStorage.removeItem('auth_user'); } catch(_) {} },
    subscribe: () => () => {},
  };
}
export default useAuth;

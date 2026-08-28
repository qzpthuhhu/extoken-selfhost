import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Rocket, History, Menu, ShieldCheck, Bell, Lightbulb, LogOut, PackageOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { useAppInfo, useAuth, useCurrentUserProfile, ROLE_SUBJECT } from '@client/src/hooks/useAuth';
import { fetchAnnouncements, logger } from '@client/src/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/src/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@client/src/components/ui/avatar';
import CyberBackground from '@client/src/components/cyber/CyberBackground';

const GUEST_AVATAR =
  'https://lf3-static.bytednsdoc.com/obj/eden-cn/LMfspH/ljhwZthlaukjlkulzlp/miao/no-person.svg';

const ANNO_SEEN_KEY = 'agent-exchange-anno-seen';

const navItems = [
  { path: '/', label: '首页', icon: Rocket, end: true },
  { path: '/package', label: 'Extoken 包', icon: PackageOpen, end: false },
  { path: '/use-cases', label: '使用案例', icon: Lightbulb, end: false },
  { path: '/records', label: '收发记录', icon: History, end: false },
  { path: '/feedback', label: '反馈与通知', icon: Bell, end: false },
];

const Layout = () => {
  const { appName } = useAppInfo();
  const userInfo = useCurrentUserProfile();
  const { ability, isLoading: authLoading, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [latestAnnoAt, setLatestAnnoAt] = useState<string | null>(null);
  const [annoSeenAt, setAnnoSeenAt] = useState<string>(
    () => localStorage.getItem(ANNO_SEEN_KEY) ?? '',
  );
  const [navHidden, setNavHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const reduced = useReducedMotion();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      if (y < 80) {
        setNavHidden(false);
      } else if (y > lastScrollY.current + 4) {
        setNavHidden(true);
      } else if (y < lastScrollY.current - 4) {
        setNavHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetchAnnouncements()
      .then((res) => setLatestAnnoAt(res.latestAt))
      .catch(() => setLatestAnnoAt(null));
  }, []);

  const hasUnreadAnno = Boolean(
    latestAnnoAt && (!annoSeenAt || latestAnnoAt > annoSeenAt),
  );

  useEffect(() => {
    if (location.pathname === '/feedback' && latestAnnoAt) {
      localStorage.setItem(ANNO_SEEN_KEY, latestAnnoAt);
      setAnnoSeenAt(latestAnnoAt);
    }
  }, [location.pathname, latestAnnoAt]);

  const isAdmin = !authLoading && ability.can('admin', ROLE_SUBJECT);

  const visibleNavItems = isAdmin
    ? [
        ...navItems,
        { path: '/admin', label: '管理台', icon: ShieldCheck, end: false },
      ]
    : navItems;

  const handleLogout = () => {
    try {
      logout();
    } catch (e) {
      logger.error('退出登录失败:', e);
    } finally {
      setLogoutOpen(false);
      // 跳回首页
      navigate('/', { replace: true });
      setTimeout(() => window.location.reload(), 50);
    }
  };

  const handleLogin = () => {
    navigate('/login', {
      state: { from: location.pathname + location.search + location.hash },
    });
  };

  const renderNavLinks = (onClick?: () => void) =>
    visibleNavItems.map((item) => {
      const Icon = item.icon;
      return (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          onClick={onClick}
          className="group relative cyber-underline"
        >
          {({ isActive }) => (
            <span
              className={`flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-all ${
                isActive
                  ? 'text-primary cyber-glow-border cyber-text-glow bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="relative">
                <Icon className="size-4" />
                {item.path === '/feedback' && hasUnreadAnno && (
                  <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-[hsl(0_72%_58%)]" />
                )}
              </span>
              {item.label}
            </span>
          )}
        </NavLink>
      );
    });

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <CyberBackground />
      <motion.header
        initial={false}
        animate={{ y: navHidden && !reduced ? '-100%' : '0%' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`fixed top-0 inset-x-0 z-40 h-14 border-b transition-colors duration-300 ${
          scrolled
            ? 'glass-panel-strong border-primary/20'
            : 'bg-card/80 backdrop-blur-sm border-border'
        }`}
      >
        <div className="mx-auto h-full w-full max-w-7xl px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <NavLink to="/" className="flex items-center gap-2 shrink-0">
              <span className="flex items-center justify-center size-8 rounded-sm bg-gradient-to-br from-primary to-[hsl(217_91%_45%)] text-primary-foreground shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path
                    d="M4 8h11l-3-3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 16H9l3 3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-semibold text-sm truncate max-w-[220px]">
                {appName || 'Extoken-Agent信息交换站'}
              </span>
            </NavLink>
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {renderNavLinks()}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {!isLoggedIn && (
              <button
                type="button"
                onClick={handleLogin}
                className="hidden md:inline-flex items-center justify-center min-h-9 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground border border-primary-border hover-elevate active-elevate-2"
              >
                登录
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="size-8">
                  <AvatarImage src={isLoggedIn ? userInfo?.avatar : GUEST_AVATAR} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                    {isLoggedIn ? userInfo?.name?.slice(0, 1) : '客'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {isLoggedIn ? userInfo?.name : '游客'}
                </div>
                {isLoggedIn ? (
                  <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
                    <LogOut className="size-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleLogin}>登录 / 注册</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              className="md:hidden flex items-center justify-center size-8 rounded-sm text-muted-foreground hover-elevate"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="菜单"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden glass-panel-strong border-b border-primary/20 px-4 py-2 flex flex-col gap-1">
            {renderNavLinks(() => setMobileOpen(false))}
          </nav>
        )}
      </motion.header>

      <main className="relative z-10 pt-14">
        <motion.div
          key={location.pathname}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {isHome ? (
            <Outlet />
          ) : (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
              <Outlet />
            </div>
          )}
        </motion.div>
      </main>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
            <AlertDialogDescription>
              退出后需要重新登录才能继续使用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>确认退出</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Layout;

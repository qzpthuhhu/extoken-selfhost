import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, UserPlus, LogIn, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { useAuth, useAppInfo } from '@client/src/hooks/useAuth';
import CyberBackground from '@client/src/components/cyber/CyberBackground';

const LoginPage: React.FC = () => {
  const { appName } = useAppInfo();
  const { login, register, isLoading, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  // 登录表单
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // 注册表单
  const [regUsername, setRegUsername] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      toast.error('请输入用户名和密码');
      return;
    }
    try {
      await login({ username: loginUsername, password: loginPassword });
      toast.success('登录成功');
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || err?.message || '登录失败，请检查用户名和密码';
      toast.error(msg);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword) {
      toast.error('请输入用户名和密码');
      return;
    }
    if (regPassword.length < 6) {
      toast.error('密码至少 6 位');
      return;
    }
    if (regPassword !== regPassword2) {
      toast.error('两次密码输入不一致');
      return;
    }
    try {
      await register({
        username: regUsername,
        nickname: regNickname || regUsername,
        password: regPassword,
        email: regEmail || undefined,
      });
      toast.success('注册成功，已自动登录');
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || err?.message || '注册失败';
      toast.error(msg);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <CyberBackground />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* 顶栏返回 */}
        <div className="flex items-center justify-between p-4 max-w-6xl mx-auto w-full">
          <button
            onClick={() => navigate('/', { replace: true })}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            返回首页
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            <span className="font-medium">{appName}</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <Card className="glass-panel-strong border-primary/20 shadow-xl">
              <CardHeader className="text-center space-y-1.5 pb-4">
                <div className="mx-auto flex items-center justify-center size-12 rounded-sm bg-gradient-to-br from-primary to-[hsl(217_91%_45%)] text-primary-foreground shadow mb-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-6"
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
                </div>
                <CardTitle className="text-xl">登录 / 注册</CardTitle>
                <CardDescription>
                  使用本地账号进入 Extoken 上下文交换站
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid grid-cols-2 mb-5">
                    <TabsTrigger value="login" className="text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <LogIn className="size-4" />
                        登录
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="register" className="text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <UserPlus className="size-4" />
                        注册
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="login-username">用户名</Label>
                        <div className="relative">
                          <Input
                            id="login-username"
                            type="text"
                            autoComplete="username"
                            placeholder="请输入用户名"
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            className="pr-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="login-password">密码</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showLoginPwd ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="请输入密码"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPwd((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showLoginPwd ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {authError && (
                        <div className="text-sm text-[hsl(0_72%_58%)]">{authError}</div>
                      )}

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full cyber-glow-border"
                      >
                        {isLoading ? '登录中...' : '登录'}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        部署时可在 .env 中设置 INIT_ADMIN_USERNAME / INIT_ADMIN_PASSWORD 创建初始管理员
                      </p>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-username">
                          用户名 <span className="text-[hsl(0_72%_58%)]">*</span>
                        </Label>
                        <Input
                          id="reg-username"
                          type="text"
                          autoComplete="username"
                          placeholder="3-32 位字母/数字/下划线"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-nickname">昵称（可选）</Label>
                        <Input
                          id="reg-nickname"
                          type="text"
                          placeholder="显示名称"
                          value={regNickname}
                          onChange={(e) => setRegNickname(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-email">邮箱（可选）</Label>
                        <Input
                          id="reg-email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-password">
                          密码 <span className="text-[hsl(0_72%_58%)]">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="reg-password"
                            type={showRegPwd ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="至少 6 位"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPwd((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showRegPwd ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-password2">
                          确认密码 <span className="text-[hsl(0_72%_58%)]">*</span>
                        </Label>
                        <Input
                          id="reg-password2"
                          type="password"
                          autoComplete="new-password"
                          placeholder="再次输入密码"
                          value={regPassword2}
                          onChange={(e) => setRegPassword2(e.target.value)}
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full cyber-glow-border"
                      >
                        <Lock className="size-4 mr-2" />
                        {isLoading ? '注册中...' : '创建账号并登录'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="text-center text-xs text-muted-foreground py-4">
          © {new Date().getFullYear()} Extoken · 私有化自托管版本 · 数据完全由您自己掌控
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

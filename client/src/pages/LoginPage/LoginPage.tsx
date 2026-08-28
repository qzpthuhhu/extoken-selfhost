import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, UserPlus, LogIn, ArrowLeft, Sparkles, Mail, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { useAuth, useAppInfo } from '@client/src/hooks/useAuth';
import CyberBackground from '@client/src/components/cyber/CyberBackground';
import { resetPasswordByEmail, sendEmailCode } from '@client/src/lib/axios';

function validateRegisterForm(args: {
  email: string;
  emailCode: string;
  password: string;
  password2: string;
}): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email.trim())) {
    return '请输入有效邮箱';
  }
  if (!/^\d{6}$/.test(args.emailCode.trim())) {
    return '请输入 6 位邮箱验证码';
  }
  if (!args.password || args.password.length < 8 || args.password.length > 72) {
    return '密码长度需为 8-72 位';
  }
  if (!/[A-Z]/.test(args.password) || !/[a-z]/.test(args.password) || !/\d/.test(args.password)) {
    return '密码需同时包含大小写字母和数字';
  }
  if (args.password !== args.password2) {
    return '两次密码输入不一致';
  }
  return null;
}

function validateResetForm(args: {
  email: string;
  emailCode: string;
  password: string;
  password2: string;
}): string | null {
  return validateRegisterForm(args);
}

const LoginPage: React.FC = () => {
  const { appName } = useAppInfo();
  const { login, register, isLoading, error: authError, isLoggedIn } = useAuth();
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
  const [regEmailCode, setRegEmailCode] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regCodeCooldown, setRegCodeCooldown] = useState(0);

  // 重置密码表单
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailCode, setResetEmailCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPassword2, setResetPassword2] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetCodeCooldown, setResetCodeCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState<'register' | 'reset_password' | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      navigate(from, { replace: true });
    }
  }, [from, isLoggedIn, navigate]);

  useEffect(() => {
    if (regCodeCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setRegCodeCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [regCodeCooldown]);

  useEffect(() => {
    if (resetCodeCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResetCodeCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resetCodeCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      toast.error('请输入邮箱/用户名和密码');
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

  const handleSendCode = async (purpose: 'register' | 'reset_password') => {
    const email = purpose === 'register' ? regEmail : resetEmail;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('请输入有效邮箱');
      return;
    }
    setSendingCode(purpose);
    try {
      const res = await sendEmailCode({ email, purpose });
      if (purpose === 'register') setRegCodeCooldown(res.expiresInSeconds > 60 ? 60 : res.expiresInSeconds);
      if (purpose === 'reset_password') setResetCodeCooldown(res.expiresInSeconds > 60 ? 60 : res.expiresInSeconds);
      toast.success(res.delivery === 'log' ? '验证码已写入服务端日志' : '验证码已发送，请查收邮箱');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '验证码发送失败';
      toast.error(msg);
    } finally {
      setSendingCode(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regEmailCode || !regPassword) {
      toast.error('请输入邮箱、验证码和密码');
      return;
    }
    const validationError = validateRegisterForm({
      email: regEmail,
      emailCode: regEmailCode,
      password: regPassword,
      password2: regPassword2,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await register({
        username: regUsername || undefined,
        nickname: regNickname || regUsername || regEmail.split('@')[0],
        password: regPassword,
        email: regEmail,
        emailCode: regEmailCode,
      });
      toast.success('注册成功，已自动登录');
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || err?.message || '注册失败';
      toast.error(msg);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateResetForm({
      email: resetEmail,
      emailCode: resetEmailCode,
      password: resetPassword,
      password2: resetPassword2,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await resetPasswordByEmail({
        email: resetEmail,
        code: resetEmailCode,
        newPassword: resetPassword,
      });
      toast.success('密码已重置，请使用新密码登录');
      setLoginUsername(resetEmail);
      setLoginPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '重置密码失败';
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
                  <TabsList className="grid grid-cols-3 mb-5">
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
                    <TabsTrigger value="reset" className="text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <RotateCcw className="size-4" />
                        改密
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="login-username">邮箱或用户名</Label>
                        <div className="relative">
                          <Input
                            id="login-username"
                            type="text"
                            autoComplete="username"
                            placeholder="you@example.com 或用户名"
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
                        <Label htmlFor="reg-email">
                          邮箱 <span className="text-[hsl(0_72%_58%)]">*</span>
                        </Label>
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
                        <Label htmlFor="reg-email-code">
                          邮箱验证码 <span className="text-[hsl(0_72%_58%)]">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="reg-email-code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="6 位验证码"
                            value={regEmailCode}
                            onChange={(e) => setRegEmailCode(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0 gap-1.5"
                            disabled={sendingCode === 'register' || regCodeCooldown > 0}
                            onClick={() => handleSendCode('register')}
                          >
                            <Mail className="size-4" />
                            {regCodeCooldown > 0 ? `${regCodeCooldown}s` : '发送'}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-username">用户名（可选）</Label>
                        <Input
                          id="reg-username"
                          type="text"
                          autoComplete="username"
                          placeholder="留空则按邮箱自动生成"
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
                        <Label htmlFor="reg-password">
                          密码 <span className="text-[hsl(0_72%_58%)]">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="reg-password"
                            type={showRegPwd ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="8-72 位，需含大小写字母和数字"
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
                          <p className="text-xs text-muted-foreground">
                            需同时包含大写字母、小写字母和数字。
                          </p>
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

                  <TabsContent value="reset">
                    <form onSubmit={handleResetPassword} className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="reset-email">
                          邮箱 <span className="text-[hsl(0_72%_58%)]">*</span>
                        </Label>
                        <Input
                          id="reset-email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reset-email-code">
                          邮箱验证码 <span className="text-[hsl(0_72%_58%)]">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="reset-email-code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="6 位验证码"
                            value={resetEmailCode}
                            onChange={(e) => setResetEmailCode(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0 gap-1.5"
                            disabled={sendingCode === 'reset_password' || resetCodeCooldown > 0}
                            onClick={() => handleSendCode('reset_password')}
                          >
                            <Mail className="size-4" />
                            {resetCodeCooldown > 0 ? `${resetCodeCooldown}s` : '发送'}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reset-password">
                          新密码 <span className="text-[hsl(0_72%_58%)]">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="reset-password"
                            type={showResetPwd ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="8-72 位，需含大小写字母和数字"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetPwd((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showResetPwd ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reset-password2">
                          确认新密码 <span className="text-[hsl(0_72%_58%)]">*</span>
                        </Label>
                        <Input
                          id="reset-password2"
                          type="password"
                          autoComplete="new-password"
                          placeholder="再次输入新密码"
                          value={resetPassword2}
                          onChange={(e) => setResetPassword2(e.target.value)}
                        />
                      </div>

                      <Button type="submit" className="w-full cyber-glow-border">
                        <Lock className="size-4 mr-2" />
                        重置密码
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

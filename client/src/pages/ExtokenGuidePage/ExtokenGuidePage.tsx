import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Boxes,
  Check,
  Copy,
  Eye,
  EyeOff,
  History,
  KeyRound,
  MessageSquareCode,
  Network,
  Package,
  Repeat,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

import { fetchAnnouncements, fetchPublicConfig, rotateExtokenApiKey } from "@client/src/api";
import { Badge } from "@client/src/components/ui/badge";
import { Button } from "@client/src/components/ui/button";
import { Card } from "@client/src/components/ui/card";
import { Separator } from "@client/src/components/ui/separator";
import { useAuth } from "@client/src/hooks/useAuth";
import { useExtokenAccount } from "@client/src/hooks/useExtokenAccount";
import type { AnnouncementItem } from "@shared/api.interface";
import PromptExamples from "./PromptExamples";
import OnboardingSteps from "./OnboardingSteps";
import CommandTerminal from "./CommandTerminal";

const ONBOARDING_DISMISS_KEY = "agent-exchange-onboarding-dismissed";
const CMD_COPIED_KEY = "agent-exchange-cmd-copied";

const FEATURE_CARDS = [
  {
    icon: Workflow,
    title: "跨 Agent 无损交接",
    desc: "把对话、改动过的文件和没做完的待办打包成一个交换包，换一个 Agent 也能接着上次的进度继续做，不用从零开局。",
  },
  {
    icon: Repeat,
    title: "一个取件码就接续",
    desc: "新会话拿到取件码，几秒钟还原前因后果，省去复述背景、重贴文件、重讲一遍需求的时间。",
  },
  {
    icon: ShieldCheck,
    title: "私有部署，归属清晰",
    desc: "自托管在你自己的服务器上，公开网关凭证叠加账户 Key 双层鉴权，每一次收发都记在你的账户名下。",
  },
];

const PROCESS_STEPS = [
  {
    step: "01",
    icon: KeyRound,
    title: "领取你的接入指令",
    desc: "登录后自动生成专属账户、API Key，以及一条可直接发给 Agent 的接入指令。",
  },
  {
    step: "02",
    icon: Terminal,
    title: "发给你的 Agent",
    desc: "把指令粘贴给 Cursor、Codex、Trae 等 Agent，它就学会了用 Extoken 打包与取件。",
  },
  {
    step: "03",
    icon: Package,
    title: "打包 → 取件 → 接续",
    desc: "一个 Agent 打包生成取件码，另一个 Agent 凭码取回上下文，无缝接力把剩下的活干完。",
  },
];

const HERO_STATS = [
  { value: "1 条指令", label: "接入任意支持 HTTP 调用的 Agent" },
  { value: "双层鉴权", label: "公开网关凭证 + 个人账户 Key" },
  { value: "私有自托管", label: "数据始终留在你的服务器上" },
];

const CONCEPT_PILLARS = [
  {
    icon: Boxes,
    title: "把协作经验打包",
    desc: "你和 Agent 一起趟过的路——对话、决策、改过的文件、踩过的坑——都装进一个交换包，沉淀成可复用的资产，而不是随会话丢失。",
  },
  {
    icon: Package,
    title: "随时随地可取件",
    desc: "一个取件码，换台电脑、换个工具、隔几天回来，都能秒还原当时的上下文，接着上次继续，不必从头再讲一遍。",
  },
  {
    icon: Share2,
    title: "Agent 经验传递",
    desc: "让一个 Agent 积累的理解与进度，原样传给下一个 Agent。经验在 Agent 之间流动，越用越顺，而不是每次归零。",
  },
  {
    icon: Network,
    title: "跨 Agent 协作",
    desc: "Cursor、Codex、Trae……不同 Agent 各司其职，凭同一个交换包接力同一件事，像一个团队一样协同推进。",
  },
];

function toPlainExcerpt(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*`_\-\[\]\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 110);
}

const SectionHeading: React.FC<{
  eyebrow: string;
  title: string;
  desc?: string;
  className?: string;
}> = ({ eyebrow, title, desc, className }) => (
  <div className={`max-w-2xl space-y-3 ${className ?? ""}`}>
    <Badge variant="outline" className="border-primary/25 bg-primary/8 text-primary">
      {eyebrow}
    </Badge>
    <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
      {title}
    </h2>
    {desc && (
      <p className="text-sm leading-7 text-muted-foreground sm:text-base">{desc}</p>
    )}
  </div>
);

const ExtokenGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { data, loading, error, refresh } = useExtokenAccount();
  const [cmdCopied, setCmdCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
  const [keyFocused, setKeyFocused] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);
  const [oneTimeApiKey, setOneTimeApiKey] = useState("");
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [gatewayTokenFromApi, setGatewayTokenFromApi] = useState("");
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(
    () => localStorage.getItem(ONBOARDING_DISMISS_KEY) === "1",
  );
  const [cmdEverCopied, setCmdEverCopied] = useState<boolean>(
    () => localStorage.getItem(CMD_COPIED_KEY) === "1",
  );

  const apiBase = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin.replace(/\/$/, "");
  }, []);

  const gatewayApiKey =
    (typeof window !== "undefined"
      ? window.__platform__?.publicOpenapiGatewayToken
      : "") ||
    gatewayTokenFromApi ||
    "";

  const openApiBase = `${apiBase}/openapi/extoken`;
  const apiKey = oneTimeApiKey || data?.account.apiKey || "";
  const apiKeyPrefix = data?.account.apiKeyPrefix ?? "";

  useEffect(() => {
    let alive = true;

    fetchAnnouncements()
      .then((res) => {
        if (!alive) return;
        setAnnouncements(res.items.slice(0, 3));
      })
      .catch(() => {
        if (!alive) return;
        setAnnouncements([]);
      })
      .finally(() => {
        if (alive) setAnnouncementsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  // 网关 token 回退：Nginx 直出静态 index.html 时 window.__platform__ 未被 SSR 注入，
  // 此时从公开配置接口拉取，保证「一键接入指令」能拿到网关凭证。
  useEffect(() => {
    const injected =
      typeof window !== "undefined"
        ? window.__platform__?.publicOpenapiGatewayToken
        : "";
    if (injected) return;

    let alive = true;
    fetchPublicConfig()
      .then((res) => {
        if (!alive) return;
        setGatewayTokenFromApi(res.publicOpenapiGatewayToken || "");
      })
      .catch(() => {
        // 静默失败：保留既有「服务端未配置网关」降级提示
      });

    return () => {
      alive = false;
    };
  }, []);

  const oneLiner =
    apiBase && gatewayApiKey && apiKey
      ? `我要接入 extoken（Agent 交换站，用于在 AI 编码 Agent 之间安全传递任务上下文）。该服务为私有化自托管部署，对外调用走 ${openApiBase} 开放网关。每个请求带两个请求头：Authorization: Bearer ${gatewayApiKey}（服务方公开的固定网关凭证，免 SSO 登录），以及 x-extoken-key: ${apiKey}（这是我的 extoken 账号 Key，打包和取件都会归属到我的账号）。请先用 GET 访问 ${openApiBase}/skill（带 Authorization 头）获取完整技能说明，并将其安装为常驻 skill——把返回的 Markdown 原样保存到你的技能目录 skills/extoken/SKILL.md（若你的运行环境无技能目录，则将这份说明纳入长期上下文/记忆），以便后续会话直接复用、无需再次拉取。安装完成后按说明帮我完成打包与取件。注意：网关凭证必须放在 Authorization: Bearer 头里，不要用 X-Api-Key 头——网关只认 Authorization，用错头会持续返回「missing or invalid Authorization header」403，照本指令用 Authorization: Bearer 即可，不用重试或改别的头。`
      : "";

  const copyText = async (
    text: string,
    setFlag: (v: boolean) => void,
    okMsg: string,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      toast.success(okMsg);
      setTimeout(() => setFlag(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  const handleLogin = () => {
    navigate("/login", { state: { from: "/" } });
  };

  const scrollToWorkspace = () => {
    document.getElementById("workspace")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleCopyCmd = () => {
    if (!oneLiner) {
      handleLogin();
      return;
    }

    copyText(oneLiner, setCmdCopied, "已复制接入指令");
    if (!cmdEverCopied) {
      localStorage.setItem(CMD_COPIED_KEY, "1");
      setCmdEverCopied(true);
    }
  };

  const handleRotateKey = async () => {
    setRotatingKey(true);
    try {
      const res = await rotateExtokenApiKey();
      setOneTimeApiKey(res.apiKey);
      setKeyVisible(true);
      toast.success("已生成新的 API Key，请立即复制保存");
    } catch {
      toast.error("轮换 API Key 失败，请稍后重试");
    } finally {
      setRotatingKey(false);
    }
  };

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_DISMISS_KEY, "1");
    setOnboardingDismissed(true);
  };

  const displayHost = useMemo(() => {
    if (!apiBase) return "your-server";
    return apiBase.replace(/^https?:\/\//, "");
  }, [apiBase]);

  return (
    <div className="space-y-0">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_-10%,hsl(var(--cyber-cyan)/0.18),transparent_42%),radial-gradient(circle_at_92%_8%,hsl(var(--cyber-purple)/0.16),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7">
            <Badge className="border-primary/25 bg-primary/12 text-primary">
              Agent 上下文交换站
            </Badge>

            <div className="space-y-5">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
              >
                在不同 AI Agent 之间
                <br />
                安全地接力做事
              </motion.h1>
              <p className="max-w-xl text-base leading-8 text-muted-foreground md:text-lg">
                Extoken 把聊天记录、过程文档、配置和待办打包成一个可交接的交换包。换一个
                Agent、开一个新会话，凭一个取件码就能还原上下文，接着上次继续，而不是每次从头讲一遍。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="gap-2 cyber-glow-border"
                onClick={isLoggedIn ? scrollToWorkspace : handleLogin}
              >
                {isLoggedIn ? "进入我的工作台" : "登录，领取接入指令"}
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => navigate("/package")}
              >
                了解 Extoken 包
              </Button>
            </div>

            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              {HERO_STATS.map((item) => (
                <div
                  key={item.value}
                  className="rounded-md border border-border/60 bg-background/40 p-4 backdrop-blur-sm"
                >
                  <div className="text-lg font-semibold text-foreground">
                    {item.value}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：真实接入指令的终端预览（未登录展示打码占位） */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative"
          >
            <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-[hsl(var(--cyber-purple)/0.12)] blur-2xl" />
            <div className="term-block relative overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-primary/15 px-3 py-2.5">
                <span className="size-2.5 rounded-full bg-[hsl(0_72%_58%)]" />
                <span className="size-2.5 rounded-full bg-[hsl(32_95%_58%)]" />
                <span className="size-2.5 rounded-full bg-[hsl(152_70%_48%)]" />
                <span className="ml-2 font-mono text-[11px] term-tok-dim">
                  extoken — access instruction
                </span>
              </div>
              <div className="space-y-1.5 break-all p-4 font-mono text-xs leading-relaxed">
                <p>
                  <span className="term-tok-dim">$ </span>
                  <span className="term-tok-dim">接入 extoken 开放网关，请求端点：</span>
                </p>
                <p>
                  <span className="term-tok-dim"># endpoint </span>
                  <span className="term-tok-url">
                    https://{displayHost}/openapi/extoken
                  </span>
                </p>
                <p>
                  <span className="term-tok-header">Authorization</span>
                  <span className="term-tok-dim">: Bearer </span>
                  <span className="term-tok-key">
                    {isLoggedIn && gatewayApiKey
                      ? gatewayApiKey
                      : "••••••••••••••••••••"}
                  </span>
                </p>
                <p>
                  <span className="term-tok-header">x-extoken-key</span>
                  <span className="term-tok-dim">: </span>
                  <span className="term-tok-key">
                    {isLoggedIn && apiKey ? apiKey : "exk_••••••••••••••••"}
                  </span>
                </p>
                <p className="pt-1 text-[11px] term-tok-dim">
                  # 先 GET {"{endpoint}"}/skill 获取技能说明并常驻安装，再按说明打包 /
                  取件
                </p>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {isLoggedIn
                ? "这是你的真实接入指令，往下到工作台即可一键复制。"
                : "登录后这里会填上你的专属网关凭证与账户 Key。"}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===================== 核心理念 ===================== */}
      <section className="relative overflow-hidden border-b border-border/60 bg-background/40 px-4 py-16 md:px-6 md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,hsl(var(--cyber-cyan)/0.12),transparent_55%),radial-gradient(circle_at_85%_120%,hsl(var(--cyber-purple)/0.12),transparent_50%)]" />
        <div className="relative mx-auto w-full max-w-7xl space-y-12">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <Badge
              variant="outline"
              className="border-primary/25 bg-primary/8 text-primary"
            >
              核心理念
            </Badge>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              把你和 Agent 协作的经验打包，
              <br className="hidden sm:block" />
              随时随地可取件
            </h2>
            <p className="text-base leading-8 text-muted-foreground">
              经验不该困在某一次会话、某一个工具里。Extoken 让 Agent
              的理解与进度可以传递、可以接力，越用越顺。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {CONCEPT_PILLARS.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                >
                  <Card className="glass-panel h-full p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-medium text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {item.desc}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 登录后：个人工作台（置顶显眼） ============ */}
      <section id="workspace" className="px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          {isLoggedIn ? (
            <>
              <SectionHeading
                eyebrow="我的工作台"
                title="你的账户、API Key 和一键接入指令"
                desc="把下面这条接入指令发给你的 Agent，它就能以你的身份完成打包与取件，记录会自动归到你的账户下。"
              />

              {loading && (
                <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                  <Card className="glass-panel p-6">
                    <div className="h-6 w-40 animate-pulse rounded bg-accent" />
                    <div className="mt-4 h-20 animate-pulse rounded-xl bg-accent" />
                    <div className="mt-4 h-10 animate-pulse rounded-xl bg-accent" />
                  </Card>
                  <Card className="glass-panel p-6">
                    <div className="h-6 w-52 animate-pulse rounded bg-accent" />
                    <div className="mt-4 h-40 animate-pulse rounded-xl bg-accent" />
                  </Card>
                </div>
              )}

              {!loading && data && (
                <div className="space-y-6">
                  {!onboardingDismissed && (
                    <OnboardingSteps
                      hasCopiedCmd={cmdEverCopied}
                      hasSentPackage={data.account.sentCount > 0}
                      onDismiss={dismissOnboarding}
                    />
                  )}

                  <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                    <Card className="glass-panel p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            当前账户
                          </p>
                          <h3 className="mt-2 text-2xl font-medium text-foreground">
                            {data.account.name}
                          </h3>
                        </div>
                        <Badge className="border-primary/20 bg-primary/12 text-primary">
                          已登录
                        </Badge>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <Card className="border-border/60 bg-background/50 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            已发包
                          </p>
                          <div className="mt-2 text-3xl font-semibold text-foreground">
                            {data.account.sentCount}
                          </div>
                        </Card>
                        <Card className="border-border/60 bg-background/50 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            已取件
                          </p>
                          <div className="mt-2 text-3xl font-semibold text-foreground">
                            {data.account.receivedCount}
                          </div>
                        </Card>
                      </div>

                      <Separator className="my-6" />

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <KeyRound className="size-4 text-primary" />
                          你的 API Key
                        </div>
                        <div className="flex items-start gap-2">
                          <code
                            tabIndex={0}
                            onFocus={() => setKeyFocused(true)}
                            onBlur={() => setKeyFocused(false)}
                            className={`flex-1 break-all rounded-xl border px-3 py-3 font-mono text-xs leading-6 outline-none transition-colors ${
                              keyFocused
                                ? "border-primary/40 bg-primary/8"
                                : "border-border/60 bg-background/50"
                            }`}
                          >
                            {apiKey
                              ? keyVisible
                                ? apiKey
                                : "•".repeat(Math.min(apiKey.length, 40))
                              : `已隐藏明文，仅保留前缀 ${apiKeyPrefix || "exk_***"}`}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setKeyVisible((v) => !v)}
                            disabled={!apiKey}
                            aria-label={keyVisible ? "隐藏 API Key" : "显示 API Key"}
                          >
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={keyVisible ? "eye-off" : "eye"}
                                initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                                transition={{ duration: 0.18 }}
                              >
                                {keyVisible ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </motion.span>
                            </AnimatePresence>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copyText(apiKey, setKeyCopied, "已复制 API Key")
                            }
                            disabled={!apiKey}
                            aria-label="复制 API Key"
                            className={
                              keyCopied
                                ? "border-success bg-success/10 text-success"
                                : undefined
                            }
                          >
                            {keyCopied ? (
                              <Check className="size-4" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          这是代表你身份的 Key。新生成的 Key 只显示一次；如果当前已隐藏，请轮换后立即复制保存。
                        </p>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={handleRotateKey}
                          disabled={rotatingKey}
                        >
                          <RefreshCw className={`size-4 ${rotatingKey ? "animate-spin" : ""}`} />
                          轮换 API Key
                        </Button>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => navigate("/records")}
                        >
                          <History className="size-4" />
                          查看收发记录
                        </Button>
                        <Button
                          variant="ghost"
                          className="gap-2"
                          onClick={() => navigate("/use-cases")}
                        >
                          <MessageSquareCode className="size-4" />
                          常用提示词
                        </Button>
                      </div>
                    </Card>

                    <Card className="glass-panel p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            一键接入指令
                          </p>
                          <h3 className="mt-2 text-2xl font-medium text-foreground">
                            把这条发给你的 Agent
                          </h3>
                        </div>
                        <Terminal className="size-5 text-primary" />
                      </div>

                      <div className="relative mt-5">
                        <CommandTerminal
                          openApiBase={openApiBase}
                          gatewayKey={gatewayApiKey}
                          extokenKey={apiKey}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className={`absolute right-2 top-2 ${
                            cmdCopied
                              ? "border-success bg-success/10 text-success"
                              : ""
                          }`}
                          onClick={handleCopyCmd}
                          disabled={!oneLiner}
                          aria-label="复制指令"
                        >
                          {cmdCopied ? (
                            <Check className="size-4" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </Button>
                      </div>

                      {!gatewayApiKey && (
                        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/8 p-4 text-sm leading-6 text-muted-foreground">
                          当前服务端尚未配置公开网关凭证，接入指令暂不可用。请先在服务端配置
                          <code className="mx-1 font-mono">
                            PUBLIC_OPENAPI_GATEWAY_TOKEN
                          </code>
                          和
                          <code className="mx-1 font-mono">
                            OPENAPI_GATEWAY_TOKEN
                          </code>
                          。
                        </div>
                      )}

                      {gatewayApiKey && !apiKey && (
                        <div className="mt-4 rounded-xl border border-primary/25 bg-primary/8 p-4 text-sm leading-6 text-muted-foreground">
                          出于安全策略，当前 API Key 明文已不再保存。请先轮换 API Key，再复制新的接入指令。
                        </div>
                      )}

                      <Button
                        className="mt-5 w-full gap-2"
                        onClick={handleCopyCmd}
                        disabled={!oneLiner}
                      >
                        {cmdCopied ? "已复制，去发给 Agent" : "一键复制接入指令"}
                        <ArrowRight className="size-4" />
                      </Button>
                    </Card>
                  </div>
                </div>
              )}

              {!loading && error && !data && (
                <Card className="glass-panel p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-medium text-foreground">
                        登录成功，但账户数据还没拉到
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        这通常是首次刷新时网络抖动导致的，再试一次即可，不需要重新登录。
                      </p>
                    </div>
                    <Button className="gap-2" onClick={() => void refresh()}>
                      重新加载工作台
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <>
              <SectionHeading
                eyebrow="为什么用 Extoken"
                title="让上下文跟着任务走，而不是困在某一个 Agent 里"
                desc="换工具、换会话、换同事，都能把之前的进度原样带过去。"
              />
              <div className="grid gap-4 lg:grid-cols-3">
                {FEATURE_CARDS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card
                      key={item.title}
                      className="glass-panel h-full p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
                    >
                      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <h3 className="mt-5 text-xl font-medium text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {item.desc}
                      </p>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ===================== 如何接入（三步） ===================== */}
      <section className="border-y border-border/60 bg-background/40 px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto w-full max-w-7xl space-y-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="接入只要三步"
              title="从领取指令到完成第一次交接"
            />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/use-cases")}
            >
              看完整案例库
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {PROCESS_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.step} className="glass-panel p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {item.step}
                    </span>
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-xl font-medium text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.desc}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== 提示词示例 ===================== */}
      <section className="px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto w-full max-w-7xl space-y-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="拿来即用"
              title="不用记接口，把这些话直接发给 Agent"
              desc="接入完成后，用自然语言就能让 Agent 帮你打包和取件。"
            />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/use-cases")}
            >
              查看全部场景
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <PromptExamples />
        </div>
      </section>

      {/* ===================== 产品动态 ===================== */}
      <section className="border-y border-border/60 bg-background/40 px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto w-full max-w-7xl space-y-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow="产品动态" title="最近更新" />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/feedback")}
            >
              打开反馈与通知
              <Bell className="size-4" />
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {announcementsLoading &&
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="glass-panel p-6">
                  <div className="h-5 w-24 animate-pulse rounded bg-accent" />
                  <div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-accent" />
                  <div className="mt-3 h-20 animate-pulse rounded bg-accent" />
                </Card>
              ))}

            {!announcementsLoading &&
              announcements.map((item) => (
                <Card key={item.id} className="glass-panel p-6">
                  <div className="flex items-center justify-between gap-3">
                    <Badge
                      variant="outline"
                      className="border-border/60 bg-background/50"
                    >
                      {item.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-medium text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {toPlainExcerpt(item.content) || "查看这条公告的完整内容。"}
                  </p>
                </Card>
              ))}

            {!announcementsLoading && announcements.length === 0 && (
              <Card className="glass-panel p-6 lg:col-span-3">
                <p className="text-sm leading-7 text-muted-foreground">
                  目前还没有公开通知。后续产品更新会展示在这里。
                </p>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* ===================== 结尾 CTA（仅未登录） ===================== */}
      {!isLoggedIn && (
        <section className="relative overflow-hidden px-4 py-20 md:px-6 md:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--cyber-cyan)/0.14),transparent_55%)]" />
          <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
            <Sparkles className="size-7 text-primary" />
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              准备好让 Agent 接力干活了吗？
            </h2>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              登录后立刻拿到你的专属账户、API Key 和一键接入指令，几分钟就能完成第一次跨
              Agent 交接。
            </p>
            <Button
              size="lg"
              className="gap-2 cyber-glow-border"
              onClick={handleLogin}
            >
              登录，开始使用
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

export default ExtokenGuidePage;

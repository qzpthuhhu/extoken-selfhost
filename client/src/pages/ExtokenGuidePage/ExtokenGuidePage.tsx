import React, { useEffect, useMemo, useState } from "react";
import {
  Rocket,
  Copy,
  Check,
  FileDown,
  Terminal,
  KeyRound,
  Globe,
  LogIn,
  ShieldAlert,
  UserRound,
  Mail,
  Eye,
  EyeOff,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { AnimatePresence, motion } from "framer-motion";
import { resolveAppUrl } from "@lark-apaas/client-toolkit/utils/resolveAppUrl";
import { getDataloom } from "@lark-apaas/client-toolkit/dataloom";

import { Card } from "@client/src/components/ui/card";
import { Button } from "@client/src/components/ui/button";
import MarkdownDoc from "@client/src/components/cyber/MarkdownDoc";
import { fetchExtokenSkill } from "@client/src/api";
import { useExtokenAccount } from "@client/src/hooks/useExtokenAccount";
import PromptExamples from "./PromptExamples";
import OnboardingSteps from "./OnboardingSteps";
import CommandTerminal from "./CommandTerminal";
import Reveal from "@client/src/components/cyber/Reveal";
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const GATEWAY_API_KEY = "Ox7WYVxpcwiBJ0LIRDP9-UpY5g6q-TKrQQx-bNI6BA8";
const ONBOARDING_DISMISS_KEY = "agent-exchange-onboarding-dismissed";
const CMD_COPIED_KEY = "agent-exchange-cmd-copied";

const ExtokenGuidePage: React.FC = () => {
  const { data, loading, error } = useExtokenAccount();
  const [copied, setCopied] = useState(false);
  const [cmdCopied, setCmdCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
  const [keyFocused, setKeyFocused] = useState(false);
  const [rawSkill, setRawSkill] = useState<string | null>(null);
  const [skillLoading, setSkillLoading] = useState(true);
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(
    () => localStorage.getItem(ONBOARDING_DISMISS_KEY) === "1",
  );
  const [cmdEverCopied, setCmdEverCopied] = useState<boolean>(
    () => localStorage.getItem(CMD_COPIED_KEY) === "1",
  );

  const apiBase = useMemo(() => {
    try {
      return resolveAppUrl("/").replace(/\/$/, "");
    } catch {
      return "";
    }
  }, []);

  const openApiBase = `${apiBase}/openapi/extoken`;
  const apiKey = data?.account.apiKey ?? "";

  useEffect(() => {
    let alive = true;
    fetchExtokenSkill()
      .then((text) => {
        if (alive) setRawSkill(text);
      })
      .catch(() => {
        if (alive) toast.error("加载技能说明失败");
      })
      .finally(() => {
        if (alive) setSkillLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const skillMarkdown = useMemo(() => {
    if (!rawSkill) return "";
    return apiBase
      ? rawSkill
          .replace(/API_BASE/g, apiBase)
          .replace(/https:\/\/<your-app-host>/g, apiBase)
      : rawSkill;
  }, [rawSkill, apiBase]);

  const oneLiner = apiBase
    ? `我要接入 extoken（Agent 交换站，用于在 AI 编码 Agent 之间安全传递任务上下文）。该服务部署在飞书 aPaaS 上，对外调用走 ${openApiBase} 开放网关。每个请求带两个请求头：Authorization: Bearer ${GATEWAY_API_KEY}（服务方公开的固定网关凭证，穿透飞书 SSO），以及 x-extoken-key: ${apiKey}（这是我的 extoken 账号 Key，打包和取件都会归属到我的账号）。请先用 GET 访问 ${openApiBase}/skill（带 Authorization 头）获取完整技能说明，并将其安装为常驻 skill——把返回的 Markdown 原样保存到你的技能目录 skills/extoken/SKILL.md（若你的运行环境无技能目录，则将这份说明纳入长期上下文/记忆），以便后续会话直接复用、无需再次拉取。安装完成后按说明帮我完成打包与取件。注意：网关凭证必须放在 Authorization: Bearer 头里，不要用 X-Api-Key 头——网关只认 Authorization，用错头会持续返回「missing or invalid Authorization header」403，照本指令用 Authorization: Bearer 即可，不用重试或改别的头。`
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

  const handleDownload = () => {
    const blob = new Blob([skillMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SKILL.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("已下载 SKILL.md");
  };

  const handleDownloadPackage = async () => {
    if (!skillMarkdown) return;
    try {
      const zip = new JSZip();
      zip.file("extoken/SKILL.md", skillMarkdown);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "extoken.skill";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("已下载最新 extoken.skill 安装包");
    } catch {
      toast.error("安装包生成失败，请重试");
    }
  };

  const handleLogin = async () => {
    const dataloom = await getDataloom();
    dataloom.service.session.redirectToLogin();
  };

  const handleCopyCmd = () => {
    copyText(oneLiner, setCmdCopied, "已复制接入指令");
    if (!cmdEverCopied) {
      localStorage.setItem(CMD_COPIED_KEY, "1");
      setCmdEverCopied(true);
    }
  };

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_DISMISS_KEY, "1");
    setOnboardingDismissed(true);
  };

  const header = (
    <header className="space-y-2">
      <div className="flex items-center gap-2">
        <Rocket className="size-5 text-primary" />
        <h1 className="text-lg font-semibold cyber-text-glow">
          EXtoken · 简介 & 快速上手
        </h1>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
        <p>
          EXtoken 是 Agent 之间的便捷信息交换站，用于安全、快速地传递 agent 工作的任务上下文。
        </p>
        <p>
          简单来说，就是把你和一个 agent 协作沟通的记录、文档、skill 配置等过程产物打包为一组密钥，发送给另外一个需要的 agent，它便能快速掌握你之前的工作，跨平台、跨设备。
        </p>
        <p>
          <span className="text-foreground font-medium">使用方法：</span>在用飞书账号登录后，复制你的专属接入指令发给 Agent（如 Cursor、Codex，字节的 Aily、Coze、Trae 等），agent 学会该 skill 后，后续的所有发包、取包都会自动记录在你的账户下。
        </p>
        <p className="text-xs">
          <span className="text-foreground font-medium">一句话提示词：</span>把当前 xxx 主题的任务打包；把最近的 10 次对话记录打包为 extoken，去掉密钥信息。
        </p>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        {header}
        <Card className="p-6 border border-border rounded-sm bg-card">
          <p className="text-sm text-muted-foreground">加载账户信息中...</p>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        {header}
        <Card className="p-6 border border-border rounded-sm bg-card flex flex-col items-center gap-4 text-center">
          <ShieldAlert className="size-8 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-medium">请先登录飞书账号</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              登录后系统会为你自动创建 extoken 账户，并生成专属的一键接入指令。
            </p>
          </div>
          <Button className="gap-1" onClick={handleLogin}>
            <LogIn className="size-4" />
            飞书登录
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {header}

      {!onboardingDismissed && (
        <OnboardingSteps
          hasCopiedCmd={cmdEverCopied}
          hasSentPackage={data.account.sentCount > 0}
          onDismiss={dismissOnboarding}
        />
      )}

      <Reveal className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          你的专属 extoken 账号
        </h2>
        <Card className="glass-panel p-4 rounded-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium truncate">
              {data.account.name}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              已发 {data.account.sentCount} · 已取 {data.account.receivedCount}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <code
              tabIndex={0}
              onFocus={() => setKeyFocused(true)}
              onBlur={() => setKeyFocused(false)}
              className={`flex-1 px-3 py-2 rounded-sm font-mono text-xs leading-relaxed break-all outline-none transition-all duration-300 ${
                keyFocused
                  ? "cyber-glow-border bg-gradient-to-r from-primary/10 to-accent/20"
                  : "bg-background/60 border border-primary/15"
              }`}
            >
              {keyVisible ? apiKey : "•".repeat(Math.min(apiKey.length, 40))}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 cyber-magnetic"
              onClick={() => setKeyVisible((v) => !v)}
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
              className={`shrink-0 cyber-magnetic transition-colors ${
                keyCopied
                  ? "border-success text-success bg-success/10"
                  : "cyber-pulse"
              }`}
              onClick={() => copyText(apiKey, setKeyCopied, "已复制 API Key")}
              aria-label="复制 API Key"
            >
              {keyCopied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            这是代表你身份的 extoken API Key，请勿分享到公开渠道。
          </p>
        </Card>
      </Reveal>

      <Reveal className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Terminal className="size-4 text-primary" />
          第一步 · 复制指令发给 Agent
        </h2>
        <Card className="glass-panel p-4 rounded-sm space-y-3">
          <div className="relative">
            <CommandTerminal
              openApiBase={openApiBase}
              gatewayKey={GATEWAY_API_KEY}
              extokenKey={apiKey}
            />
            <Button
              variant="outline"
              size="icon"
              className={`absolute top-2 right-2 size-8 cyber-magnetic transition-colors ${
                cmdCopied
                  ? "border-success text-success bg-success/10"
                  : "cyber-pulse"
              }`}
              onClick={handleCopyCmd}
              aria-label="复制指令"
            >
              {cmdCopied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              className="w-full gap-1 bg-success text-success-foreground hover:bg-success/90 transition-colors cyber-magnetic"
              onClick={handleCopyCmd}
            >
              {cmdCopied ? (
                <>
                  <Check className="size-4" />
                  已复制，去发给 Agent
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  一键复制接入指令
                </>
              )}
            </Button>
          </motion.div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
            <Globe className="size-3.5 mt-0.5 shrink-0 text-primary" />
            <span>
              指令已内置服务方公开的网关凭证（
              <code className="font-mono text-foreground/80">Authorization: Bearer</code>
              ）和你的账号 Key（
              <code className="font-mono text-foreground/80">x-extoken-key</code>
              ）。Agent 用它打包/取件时，记录会自动归到你的账户，可在「交换记录」页查看。
            </span>
          </div>
        </Card>
      </Reveal>

      <PromptExamples />

      <Reveal className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          进阶 · 安装 SKILL.md（能力更完整）
        </h2>
        <Card className="glass-panel rounded-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-primary/15 bg-background/40">
            <span className="font-mono text-xs text-muted-foreground">
              SKILL.md
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={!skillMarkdown}
                onClick={() =>
                  copyText(skillMarkdown, setCopied, "已复制 SKILL.md 内容")
                }
              >
                {copied ? (
                  <Check className="size-4 text-success" />
                ) : (
                  <Copy className="size-4" />
                )}
                复制
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={!skillMarkdown}
                onClick={handleDownload}
              >
                <FileDown className="size-4" />
                下载 .md
              </Button>
              <Button
                size="sm"
                className="gap-1"
                disabled={!skillMarkdown}
                onClick={handleDownloadPackage}
              >
                <Package className="size-4" />
                下载安装包
              </Button>
            </div>
          </div>
          <div className="p-6">
            {skillLoading ? (
              <p className="text-sm text-muted-foreground">加载技能说明中...</p>
            ) : skillMarkdown ? (
              <MarkdownDoc content={skillMarkdown} showToc />
            ) : (
              <p className="text-sm text-muted-foreground">
                技能说明加载失败，请稍后重试。
              </p>
            )}
          </div>
        </Card>
      </Reveal>

      <Reveal className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <UserRound className="size-4 text-primary" />
          关于我
        </h2>
        <Card className="glass-panel p-4 rounded-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">秦展鹏</span>
            <span className="text-xs text-muted-foreground">Owner</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Lark Business Platform - AI Agents Services
          </p>
          <UniversalLink
            to="mailto:zhanpeng.2026@bytedance.com"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-mono break-all"
          >
            <Mail className="size-3.5 shrink-0" />
            zhanpeng.2026@bytedance.com
          </UniversalLink>
        </Card>
      </Reveal>
    </div>
  );
};

export default ExtokenGuidePage;

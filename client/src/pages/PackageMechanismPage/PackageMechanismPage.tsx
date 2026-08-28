import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Boxes,
  Braces,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Fingerprint,
  GitBranch,
  KeyRound,
  Layers3,
  LockKeyhole,
  Network,
  Copy,
  Download,
  PackageOpen,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@client/src/components/ui/badge";
import { Button } from "@client/src/components/ui/button";
import { Card } from "@client/src/components/ui/card";
import { Separator } from "@client/src/components/ui/separator";
import { EXTOKEN_PACKAGE_DOC_MARKDOWN } from "@shared/extoken-package-doc";

const lifecycle = [
  {
    step: "01",
    title: "采集任务现场",
    desc: "Agent 先把当前任务的关键事实整理出来：用户目标、已做决策、文件改动、命令结果、阻塞点和下一步动作。",
    icon: ClipboardCheck,
  },
  {
    step: "02",
    title: "归一化为协议块",
    desc: "内容被拆成带类型的 items，而不是一整段自由文本。每个块都有 type、title、content 和可选 metadata。",
    icon: Braces,
  },
  {
    step: "03",
    title: "生成包信封",
    desc: "服务端补齐 schemaVersion、createdAt、continuation、workspace、integrity，形成可接续的 Envelope。",
    icon: PackageOpen,
  },
  {
    step: "04",
    title: "加密存储并发码",
    desc: "正文以加密内容保存，账户身份和事件审计留在服务端。发包方拿到一个取件码，用于后续交接。",
    icon: LockKeyhole,
  },
  {
    step: "05",
    title: "取件并恢复上下文",
    desc: "接手 Agent 凭取件码读取包，先比对 workspace 和 integrity，再按 continuation 与 items 恢复任务状态。",
    icon: RefreshCw,
  },
];

const itemTypes = [
  ["chat", "关键对话", "保留用户目标、约束、重要澄清和最终确认，不要求完整逐字稿。"],
  ["doc", "过程文档", "保存 PRD、方案、说明、会议纪要、研究摘要等长文本材料。"],
  ["config", "配置说明", "记录环境变量名、服务入口、运行方式、开关项；只放脱敏信息。"],
  ["file_diff", "文件变更", "描述文件路径、变更目的、关键 diff 摘要和需要复查的位置。"],
  ["decision", "决策记录", "记录为什么选某个方案、排除了什么方案，以及约束条件。"],
  ["todo", "待办状态", "列出已完成、进行中、未完成、阻塞任务和验收标准。"],
  ["tool_result", "工具结果", "保存命令、API、搜索、构建、测试等工具输出的结论性摘要。"],
  ["env_note", "环境提示", "说明本地/服务器/浏览器/账号状态、路径、部署位置和注意事项。"],
  ["error", "错误现场", "记录错误码、堆栈摘要、复现步骤、已尝试修复和下一步排查方向。"],
  ["token_usage", "用量线索", "可记录模型、会话、token 或成本摘要，用于长任务复盘。"],
  ["permission", "权限边界", "记录哪些动作需要用户确认、哪些服务需要授权、哪些数据不能访问。"],
];

const envelopeFields = [
  ["schemaVersion", "协议版本", "当前为 v1。让未来升级时仍能识别旧包结构。"],
  ["title / description", "人类可读摘要", "给用户和接手 Agent 快速判断这个包解决什么任务。"],
  ["continuation", "接续语义", "说明来源 Agent、会话标识、交接状态、阻塞原因和下一步动作。"],
  ["workspace", "项目身份", "记录项目名、git remote、branch、commit、dirtyFilesHash 等工作区线索。"],
  ["integrity", "完整性证明", "保存 payloadSha256、filesHash、commandHash、taskStateHash 和工具操作摘要。"],
  ["items", "上下文内容块", "真正承载任务现场的结构化内容列表。"],
];

const minContract = [
  "schemaVersion、title、description、createdAt",
  "至少一个 items 内容块，且每个块有 type、title、content",
  "服务端生成的包 ID、取件码、归属账户、过期策略",
  "内容大小、块数量、payloadSha256 或服务端 contentSha256",
  "创建事件，后续取件/下载/失败事件进入审计日志",
];

const maxContract = [
  "完整 continuation：sourceAgent、sourceSessionId、sourceRunId、sourceTurnId、handoffStatus、nextActions、blockingState",
  "完整 workspace：projectName、rootHash、gitRemote、gitBranch、gitCommit、dirtyFilesHash",
  "完整 integrity：filesHash、commandHash、taskStateHash、toolOperations 与 recoveryMode",
  "覆盖 11 类 items：chat、doc、config、file_diff、decision、todo、tool_result、env_note、error、token_usage、permission",
  "足够让接手 Agent 判断是否能继续、是否需要用户确认、是否需要重新验证环境",
];

const safetyRules = [
  "长期 API Key、邮箱授权码、SSH 私钥、Cookie、数据库连接串不进入包内容。",
  "需要描述环境时，只写变量名、用途、配置位置和脱敏示例。",
  "tool_result 记录结论和关键摘要，不盲目塞入超长日志。",
  "file_diff 记录变更意图和关键片段，不替代 Git 仓库本身。",
  "permission 明确哪些动作需要用户重新授权或人工确认。",
];

const recoveryModes = [
  ["replay_safe", "可安全重放", "例如只读查询或幂等检查。"],
  ["idempotent", "幂等操作", "重复执行不会改变最终状态，或有明确幂等键。"],
  ["reconcile", "需要对账", "先检查当前状态，再决定是否继续。"],
  ["reattach", "重新接入", "连接到已有任务、会话、部署或外部资源。"],
  ["outcome_unknown", "结果未知", "上一轮可能成功也可能失败，必须先核验。"],
  ["never_auto_retry", "禁止自动重试", "涉及付款、删除、发布、权限变更等高风险动作。"],
];

const jsonExample = `{
  "schemaVersion": 1,
  "title": "登录体系改造交接",
  "description": "邮箱验证码注册、登录和改密已完成，等待线上验证。",
  "continuation": {
    "sourceAgent": "Trae",
    "sourceSessionId": "session-20260828",
    "handoffStatus": "needs_review",
    "nextActions": ["检查 SMTP 送达", "验证注册页移动端"]
  },
  "workspace": {
    "projectName": "Extoken",
    "gitBranch": "main",
    "gitCommit": "a1b2c3d",
    "dirtyFilesHash": "sha256:..."
  },
  "integrity": {
    "payloadSha256": "sha256:...",
    "filesHash": "sha256:...",
    "toolOperations": [
      {
        "toolName": "shell",
        "canonicalArgsHash": "sha256:...",
        "recoveryMode": "reconcile",
        "summary": "build passed, deployment pending"
      }
    ]
  },
  "items": [
    {
      "type": "decision",
      "title": "验证码只保存 hash",
      "content": "避免数据库泄露后直接拿到验证码明文。"
    }
  ]
}`;

const AGENT_DOC_URL = "/api/extoken/package-doc";
const AGENT_DOC_CURL = `curl -L https://extoken.aishangai.shop${AGENT_DOC_URL}`;

const SectionTitle: React.FC<{
  eyebrow: string;
  title: string;
  desc?: string;
}> = ({ eyebrow, title, desc }) => (
  <div className="max-w-3xl space-y-3">
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

const PackageMechanismPage: React.FC = () => {
  const copyAgentDoc = async () => {
    try {
      await navigator.clipboard.writeText(EXTOKEN_PACKAGE_DOC_MARKDOWN);
      toast.success("已复制 Agent Markdown 文档");
    } catch {
      toast.error("复制失败，请使用下载入口");
    }
  };

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_DOC_CURL);
      toast.success("已复制 Agent 读取命令");
    } catch {
      toast.error("复制失败，请手动复制接口地址");
    }
  };

  const downloadMarkdown = () => {
    const blob = new Blob([EXTOKEN_PACKAGE_DOC_MARKDOWN], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extoken-package-protocol-v1.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("已下载 Markdown 文档");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-16">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div className="space-y-6">
          <Badge className="border-primary/25 bg-primary/12 text-primary">
            Extoken Package Protocol v1
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              Extoken 包如何把 Agent 任务变成可接续资产
            </h1>
            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              Extoken 包不是简单压缩聊天记录。它是一个带协议版本、接续语义、工作区身份、完整性证明、内容块类型和审计事件的上下文信封，用来让另一个 Agent 判断“我能不能继续、从哪里继续、哪些动作不能直接重放”。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="glass-panel p-4">
              <p className="text-xs text-muted-foreground">核心对象</p>
              <p className="mt-2 text-lg font-semibold text-foreground">Envelope</p>
            </Card>
            <Card className="glass-panel p-4">
              <p className="text-xs text-muted-foreground">事实来源</p>
              <p className="mt-2 text-lg font-semibold text-foreground">Event Log</p>
            </Card>
            <Card className="glass-panel p-4">
              <p className="text-xs text-muted-foreground">交接目标</p>
              <p className="mt-2 text-lg font-semibold text-foreground">Resume</p>
            </Card>
          </div>
        </div>

        <Card className="glass-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-primary/15 px-4 py-3">
            <span className="size-2.5 rounded-full bg-[hsl(0_72%_58%)]" />
            <span className="size-2.5 rounded-full bg-[hsl(32_95%_58%)]" />
            <span className="size-2.5 rounded-full bg-[hsl(152_70%_48%)]" />
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              extoken-envelope.json
            </span>
          </div>
          <pre className="max-h-[520px] overflow-auto p-5 text-xs leading-6 text-muted-foreground">
            <code>{jsonExample}</code>
          </pre>
        </Card>
      </section>

      <section className="space-y-8">
        <SectionTitle
          eyebrow="打包机制"
          title="从任务现场到可取用交换包"
          desc="打包的关键不是多塞内容，而是把状态整理成接手者能验证、能恢复、能继续执行的结构。"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {lifecycle.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.step} className="glass-panel p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-primary">
                    {item.step}
                  </span>
                  <Icon className="size-5 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {item.desc}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-5">
          <SectionTitle
            eyebrow="包信封"
            title="Envelope 决定这个包是否可恢复"
            desc="items 负责承载内容，Envelope 负责给内容提供版本、来源、身份、校验和接续边界。"
          />
          <Card className="glass-panel p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Layers3 className="size-5" />
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                一个成熟的 Agent 交接包，需要同时服务人和机器：人能读懂标题、简介、下一步；机器能识别 schema、类型、hash、工作区和可恢复状态。
              </p>
            </div>
          </Card>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {envelopeFields.map(([field, title, desc]) => (
            <Card key={field} className="glass-panel p-5">
              <code className="text-xs text-primary">{field}</code>
              <h3 className="mt-3 text-base font-medium text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionTitle
          eyebrow="内容块类型"
          title="items 不是随手贴文本，而是类型化上下文"
          desc="类型化的好处是接手 Agent 可以按优先级读取：先看 decision、todo、error 和 continuation，再展开 chat、doc、file_diff 等细节。"
        />
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm">
          <div className="grid grid-cols-[0.72fr_0.86fr_1.6fr] border-b border-border/70 bg-background/50 px-4 py-3 text-xs font-medium text-muted-foreground max-md:hidden">
            <span>type</span>
            <span>语义</span>
            <span>应放内容</span>
          </div>
          {itemTypes.map(([type, label, desc]) => (
            <div
              key={type}
              className="grid gap-2 border-b border-border/50 px-4 py-4 last:border-b-0 md:grid-cols-[0.72fr_0.86fr_1.6fr] md:items-start"
            >
              <code className="text-xs text-primary">{type}</code>
              <div className="text-sm font-medium text-foreground">{label}</div>
              <p className="text-sm leading-6 text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <PackageOpen className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Minimum Viable Package</p>
              <h2 className="text-xl font-semibold text-foreground">至少会包含什么</h2>
            </div>
          </div>
          <Separator className="my-5" />
          <div className="space-y-3">
            {minContract.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[hsl(var(--cyber-purple)/0.14)] text-[hsl(var(--cyber-purple))]">
              <Boxes className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Full Handoff Package</p>
              <h2 className="text-xl font-semibold text-foreground">最多可包含什么</h2>
            </div>
          </div>
          <Separator className="my-5" />
          <div className="space-y-3">
            {maxContract.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[hsl(var(--cyber-purple))]" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <Workflow className="size-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">接续语义</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            continuation 是包里最接近 Agent Runtime 的部分。它告诉接手者：来源是谁、来自哪个会话、任务当前是 ready / in_progress / blocked / needs_review / archived，下一步应该优先做什么。如果 blocked，blockingState 必须写清楚阻塞条件，而不是只写“卡住了”。
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {["ready", "in_progress", "blocked", "needs_review", "archived"].map((status) => (
              <div key={status} className="rounded-xl border border-border/60 bg-background/45 px-3 py-2 font-mono text-xs text-muted-foreground">
                {status}
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <Fingerprint className="size-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">完整性证明</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            integrity 不承诺“自动复现一切”，它承诺“接手前能核验关键状态”。payloadSha256 用于校验包内容，filesHash / commandHash / taskStateHash 用于判断文件、命令结果和任务状态是否仍匹配。
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {["payloadSha256", "filesHash", "commandHash", "taskStateHash"].map((field) => (
              <div key={field} className="rounded-xl border border-border/60 bg-background/45 px-3 py-2 font-mono text-xs text-muted-foreground">
                {field}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="rounded-2xl border border-primary/25 bg-card/75 p-5 shadow-[0_0_48px_hsl(var(--primary)/0.08)] backdrop-blur-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Bot className="size-6" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Agent 阅读入口
                </h2>
                <Badge variant="outline" className="border-primary/25 text-primary">
                  text/markdown
                </Badge>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                如果接手的是 Agent，不需要解析网页 DOM。直接读取 Markdown 接口，或下载本文档作为长期上下文。
              </p>
              <code className="block overflow-x-auto rounded-xl border border-border/60 bg-background/55 px-3 py-2 text-xs text-muted-foreground">
                {AGENT_DOC_CURL}
              </code>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <Button variant="outline" className="gap-2" onClick={copyCurl}>
              <Copy className="size-4" />
              复制接口命令
            </Button>
            <Button variant="outline" className="gap-2" onClick={copyAgentDoc}>
              <Copy className="size-4" />
              复制 Markdown
            </Button>
            <Button className="gap-2" onClick={downloadMarkdown}>
              <Download className="size-4" />
              下载 MD
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <SectionTitle
          eyebrow="工具副作用边界"
          title="不是所有工具调用都能自动重放"
          desc="Extoken 用 recoveryMode 标注工具操作的恢复策略，让接手 Agent 知道应该重放、对账、重新接入，还是必须等待用户确认。"
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {recoveryModes.map(([mode, title, desc]) => (
            <Card key={mode} className="glass-panel p-5">
              <code className="text-xs text-primary">{mode}</code>
              <h3 className="mt-3 text-base font-medium text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-[hsl(152_68%_45%)]" />
            <h2 className="text-xl font-semibold text-foreground">安全边界</h2>
          </div>
          <div className="mt-5 space-y-3">
            {safetyRules.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[hsl(32_95%_58%)]" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-panel p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/45 p-4">
              <KeyRound className="size-5 text-primary" />
              <h3 className="mt-3 text-base font-medium text-foreground">取件码</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                取件码是一次交接能力，不等于长期身份凭证。它用于读取指定包，并受过期策略约束。
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/45 p-4">
              <Database className="size-5 text-primary" />
              <h3 className="mt-3 text-base font-medium text-foreground">事件日志</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                创建、取件、下载、失败、过期、权限拒绝都会进入事件日志，统计和排障以事件为事实源。
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/45 p-4">
              <GitBranch className="size-5 text-primary" />
              <h3 className="mt-3 text-base font-medium text-foreground">工作区身份</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                接手者应先比对 git remote、branch、commit 和 dirtyFilesHash，避免在错误项目上继续。
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/45 p-4">
              <Network className="size-5 text-primary" />
              <h3 className="mt-3 text-base font-medium text-foreground">跨 Agent 协议</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                协议只要求 HTTP 和 JSON，不绑定某个 IDE 或 Agent 产品，方便不同工具接续同一任务。
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="rounded-2xl border border-primary/20 bg-primary/8 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Terminal className="size-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">接手 Agent 的正确读取顺序</h2>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              先读 continuation 判断任务状态，再读 workspace 确认项目身份，然后看 integrity 判断是否需要重新核验，最后按 decision、todo、error、file_diff、tool_result、chat、doc 的顺序恢复上下文。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono text-muted-foreground">
            {["continuation", "workspace", "integrity", "items"].map((item, index) => (
              <div key={item} className="flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-3 py-2">
                <span>{item}</span>
                {index < 3 && <ArrowRight className="size-3 text-primary" />}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PackageMechanismPage;

export type BlockType = "chat" | "doc" | "config";

export interface UseCaseItem {
  id: string;
  title: string;
  pain: string;
  packPrompt: string;
  redeemPrompt: string;
  blocks: BlockType[];
  audience: string;
}

export interface UseCaseCategory {
  key: string;
  label: string;
  iconName: "repeat" | "users" | "graduationCap" | "library";
  desc: string;
  cases: UseCaseItem[];
}

export const BLOCK_META: Record<
  BlockType,
  { label: string; dotClass: string }
> = {
  chat: { label: "chat 聊天记录", dotClass: "text-primary" },
  doc: { label: "doc 过程文档", dotClass: "text-success" },
  config: { label: "config 配置", dotClass: "text-[hsl(32_95%_55%)]" },
};

export const USE_CASE_CATEGORIES: UseCaseCategory[] = [
  {
    key: "handoff",
    label: "跨工具 / 跨机器接续",
    iconName: "repeat",
    desc: "换个 Agent、换台设备、开个新会话，任务都能无损接着干，不用再从头交代背景。",
    cases: [
      {
        id: "multi-agent-handoff",
        title: "多个 Agent 任务接力",
        pain: "一个任务想让擅长不同环节的 Agent 分工协作：一个做规划、一个写代码、一个跑测试。接力时不想每一个都从头再讲一遍来龙去脉。",
        packPrompt:
          "用 extoken 把我们这段对话、已确认的方案、改过的文件清单和剩下的待办打包成一个交换包，生成 EXtoken 取件码发我。我要把这个任务交给下一个 Agent 接着做。",
        redeemPrompt:
          "这是上一个 Agent 交接给我的 EXtoken 取件码：<粘贴取件码>。用 extoken 取回上下文，理解已定方案和当前进度后，接着把我负责的这一环做完。",
        blocks: ["chat", "doc"],
        audience: "分工协作的下一个 Agent（规划 → 编码 → 测试）",
      },
      {
        id: "two-machines",
        title: "公司 / 家里两台机器",
        pain: "公司电脑排查线上问题到一半就下班了，想回家换台机器接着查，又不想丢掉现场。",
        packPrompt:
          "把我这次排查的过程、已确认的现象和复现步骤用 extoken 打包，生成 EXtoken 取件码，我回家换台机器继续查。",
        redeemPrompt:
          "取回这个 EXtoken 取件码里的排查上下文：<粘贴取件码>，按里面的复现步骤接着定位根因。",
        blocks: ["chat", "doc"],
        audience: "自己的另一台设备",
      },
      {
        id: "context-limit",
        title: "上下文 / 额度用尽换会话",
        pain: "当前会话窗口快满、额度也见底，但任务还没做完，直接开新会话又会丢掉前情。",
        packPrompt:
          "用 extoken 把当前进度、关键决策和未完成事项打包成交换包，生成 EXtoken 取件码，我要开个新会话无损接续。",
        redeemPrompt:
          "取回 EXtoken 取件码 <粘贴取件码> 的上下文，恢复到刚才的进度继续工作。",
        blocks: ["chat", "config"],
        audience: "自己的新会话 / 新模型",
      },
    ],
  },
  {
    key: "team",
    label: "团队任务交接",
    iconName: "users",
    desc: "在不同人的 Agent 之间传递上下文，少一些反复对齐，交接一次就位。",
    cases: [
      {
        id: "req-to-dev",
        title: "需求 → 开发交接",
        pain: "产品把需求澄清完了，开发接手时又要把口径从头问一遍。",
        packPrompt:
          "把这次需求澄清对话和验收标准用 extoken 打包，生成 EXtoken 取件码，我要分享给开发同学的 Agent。",
        redeemPrompt:
          "取回这个需求交接包 <粘贴取件码>，理解已澄清的需求和验收标准后开始实现。",
        blocks: ["chat", "doc"],
        audience: "开发同学的 Agent",
      },
      {
        id: "fe-be-contract",
        title: "前后端联调对接",
        pain: "前后端分头开发，接口字段和错误码口径老是对不齐。",
        packPrompt:
          "把这份接口契约（字段 / 出入参 / 错误码）和联调约定用 extoken 打包，生成 EXtoken 取件码给对端。",
        redeemPrompt:
          "取回联调对接包 <粘贴取件码>，按里面的接口契约实现我这一端，保持字段和错误码一致。",
        blocks: ["doc", "config"],
        audience: "对端（前端 / 后端）的 Agent",
      },
      {
        id: "bug-handoff",
        title: "Bug 排查交接",
        pain: "值班同事复现了问题但没空修，得原样交给负责人接手。",
        packPrompt:
          "把这次 bug 的现象、已定位的根因线索和复现路径用 extoken 打包，生成 EXtoken 取件码交接出去。",
        redeemPrompt:
          "取回这个 bug 交接包 <粘贴取件码>，按复现路径确认问题后修复。",
        blocks: ["chat", "doc"],
        audience: "负责修复的同学的 Agent",
      },
    ],
  },
  {
    key: "onboarding",
    label: "新人 / Agent 上手",
    iconName: "graduationCap",
    desc: "把项目背景和约定打成一个包，让新加入的人或 Agent 几分钟进入状态。",
    cases: [
      {
        id: "project-onboarding",
        title: "项目上手包",
        pain: "新同事的 Agent 对项目一无所知，环境、约定都得一点点摸。",
        packPrompt:
          "把项目结构说明、环境搭建步骤和关键约定用 extoken 打包成永久有效的上手包（有效期设 0），生成 EXtoken 取件码。",
        redeemPrompt:
          "取回项目上手包 <粘贴取件码>，据此了解项目结构、搭好环境并遵循约定。",
        blocks: ["doc", "config"],
        audience: "新同事的 Agent",
      },
      {
        id: "agent-config",
        title: "Agent 配置迁移",
        pain: "自己调好的一套编码规范和工具配置，别人想直接照搬复用。",
        packPrompt:
          "把我这套 system prompt、工具配置和编码规范用 extoken 打包（config 类型），生成 EXtoken 取件码分享出去。",
        redeemPrompt:
          "取回这套 Agent 配置 <粘贴取件码>，按里面的规范和配置来工作。",
        blocks: ["config", "doc"],
        audience: "想复用配置的同学的 Agent",
      },
    ],
  },
  {
    key: "knowledge",
    label: "知识沉淀 / 长期复用",
    iconName: "library",
    desc: "把经验和决策做成永久有效的包，随取随用，避免重复踩坑。",
    cases: [
      {
        id: "pitfall-library",
        title: "踩坑经验库",
        pain: "同一个诡异报错换个人又踩一遍，解法却散落在各处。",
        packPrompt:
          "把这个报错的根因和已验证的解法用 extoken 打包成永久有效的经验包（有效期设 0），生成 EXtoken 取件码存档。",
        redeemPrompt:
          "我遇到了类似报错，取回这个经验包 <粘贴取件码>，按里面验证过的解法处理。",
        blocks: ["doc", "chat"],
        audience: "未来遇到同类问题的任何 Agent",
      },
      {
        id: "adr",
        title: "架构决策记录（ADR）",
        pain: "接手的人不清楚当初为什么选 A 不选 B，一不小心就推翻重来。",
        packPrompt:
          "把这次技术选型的对比、理由和关键依赖版本用 extoken 打包成决策记录，生成 EXtoken 取件码同步给协作方。",
        redeemPrompt:
          "取回架构决策包 <粘贴取件码>，理解设计意图后再在此基础上继续，不要推翻既有决策。",
        blocks: ["doc", "config"],
        audience: "后续接手 / 协作的 Agent",
      },
    ],
  },
];

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
    desc: "同一个人换了 Agent 或换了设备，无损接着干。",
    cases: [
      {
        id: "switch-ide",
        title: "换 IDE 接力",
        pain: "在 Cursor 里干到一半，想回家用 Claude Code 接着写，又不想重新讲一遍来龙去脉。",
        packPrompt:
          "用 extoken 把我们这段对话、改过的文件清单和剩下的待办打包成一个交换包，生成 EXtoken取件码发我。这是发给我自己另一个 Agent 的。",
        redeemPrompt:
          "这是我在另一台机器打包的 EXtoken取件码：<粘贴取件码>。用 extoken 取回上下文，理解进度和待办后继续把剩下的做完。",
        blocks: ["chat", "doc"],
        audience: "自己的另一个 Agent（Cursor → Claude Code）",
      },
      {
        id: "two-machines",
        title: "公司 / 家里两台机器",
        pain: "公司电脑排查线上问题到一半下班了，想回家接着查。",
        packPrompt:
          "把我这次排查的过程、已确认的现象和复现步骤用 extoken 打包，生成 EXtoken取件码，我回家换台机器继续查。",
        redeemPrompt:
          "取回这个 EXtoken取件码里的排查上下文：<粘贴取件码>，按里面的复现步骤接着定位根因。",
        blocks: ["chat", "doc"],
        audience: "自己的另一台设备",
      },
      {
        id: "context-limit",
        title: "上下文 / 额度用尽换会话",
        pain: "当前会话窗口快满或额度见底，但任务还没做完。",
        packPrompt:
          "用 extoken 把当前进度、关键决策和未完成事项打包成交换包，生成 EXtoken取件码，我要开个新会话无损接续。",
        redeemPrompt:
          "取回 EXtoken取件码 <粘贴取件码> 的上下文，恢复到刚才的进度继续工作。",
        blocks: ["chat", "config"],
        audience: "自己的新会话 / 新模型",
      },
    ],
  },
  {
    key: "team",
    label: "团队任务交接",
    iconName: "users",
    desc: "不同人的 Agent 之间传递，减少反复对齐。",
    cases: [
      {
        id: "req-to-dev",
        title: "需求 → 开发交接",
        pain: "产品把需求澄清完了，开发接手时又要从头问一遍口径。",
        packPrompt:
          "把这次需求澄清对话和验收标准用 extoken 打包，生成 EXtoken取件码，我要发给开发同学的 Agent。这是分享给他人的。",
        redeemPrompt:
          "取回这个需求交接包 <粘贴取件码>，理解已澄清的需求和验收标准后开始实现。",
        blocks: ["chat", "doc"],
        audience: "开发同学的 Agent",
      },
      {
        id: "fe-be-contract",
        title: "前后端联调对接",
        pain: "前后端分头开发，接口字段和错误码口径对不齐。",
        packPrompt:
          "把这份接口契约（字段 / 出入参 / 错误码）和联调约定用 extoken 打包，生成 EXtoken取件码给对端。",
        redeemPrompt:
          "取回联调对接包 <粘贴取件码>，按里面的接口契约实现我这一端，保持字段和错误码一致。",
        blocks: ["doc", "config"],
        audience: "对端（前端 / 后端）的 Agent",
      },
      {
        id: "bug-handoff",
        title: "Bug 排查交接",
        pain: "值班同事复现了问题但没空修，得交给负责人接手。",
        packPrompt:
          "把这次 bug 的现象、已定位的根因线索和复现路径用 extoken 打包，生成 EXtoken取件码交接出去。",
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
    desc: "让新加入的人或 Agent 几分钟进入状态。",
    cases: [
      {
        id: "project-onboarding",
        title: "项目上手包",
        pain: "新同事的 Agent 对项目一无所知，环境和约定都要慢慢摸。",
        packPrompt:
          "把项目结构说明、环境搭建步骤和关键约定用 extoken 打包成永久有效的上手包（有效期设 0），生成 EXtoken取件码。",
        redeemPrompt:
          "取回项目上手包 <粘贴取件码>，据此了解项目结构、搭好环境并遵循约定。",
        blocks: ["doc", "config"],
        audience: "新同事的 Agent",
      },
      {
        id: "agent-config",
        title: "Agent 配置迁移",
        pain: "自己调好的一套编码规范和工具配置，别人想直接复用。",
        packPrompt:
          "把我这套 system prompt、工具配置和编码规范用 extoken 打包（config 类型），生成 EXtoken取件码分享出去。",
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
    desc: "把经验和决策做成永久包，随取随用。",
    cases: [
      {
        id: "pitfall-library",
        title: "踩坑经验库",
        pain: "同一个诡异报错换个人又踩一遍，解法散落在各处。",
        packPrompt:
          "把这个报错的根因和已验证的解法用 extoken 打包成永久有效的经验包（有效期设 0），生成 EXtoken取件码存档。",
        redeemPrompt:
          "我遇到了类似报错，取回这个经验包 <粘贴取件码>，按里面验证过的解法处理。",
        blocks: ["doc", "chat"],
        audience: "未来遇到同类问题的任何 Agent",
      },
      {
        id: "adr",
        title: "架构决策记录（ADR）",
        pain: "接手的人不清楚当初为什么选 A 不选 B，容易推翻重来。",
        packPrompt:
          "把这次技术选型的对比、理由和关键依赖版本用 extoken 打包成决策记录，生成 EXtoken取件码同步给协作方。",
        redeemPrompt:
          "取回架构决策包 <粘贴取件码>，理解设计意图后再在此基础上继续，不要推翻既有决策。",
        blocks: ["doc", "config"],
        audience: "后续接手 / 协作的 Agent",
      },
    ],
  },
];

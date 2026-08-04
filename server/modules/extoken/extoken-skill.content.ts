const GATEWAY_API_KEY = 'Ox7WYVxpcwiBJ0LIRDP9-UpY5g6q-TKrQQx-bNI6BA8';

const EXTOKEN_SKILL_TEMPLATE = `---
name: extoken
description: 在 Agent 之间通过加密包交换上下文（聊天记录 / 过程文档 / Agent 配置）。当用户说「把 XXX 打包为 extoken」「取件 extoken」时使用。
---

# extoken 交换技能

## 这是什么

extoken（Agent 交换站）是一个让 **AI 编码 Agent 之间安全传递任务上下文**的工具。当一个 Agent 完成阶段性工作、需要把上下文交给另一个 Agent 接续时，可以把聊天记录、过程文档、Agent 配置等内容打包成一个 **AES-256-GCM 加密包**，得到一个简短的**EXtoken取件码**；接手方 Agent 凭这个EXtoken取件码即可解密取回全部内容，无缝接续工作。

典型场景：Cursor 里的 Agent 把「登录模块重构」的完整上下文打包 → 把EXtoken取件码发给同事 → 同事在自己的 Codex/Cursor 里凭码取件，拿到需求澄清对话、设计笔记、待办事项，继续开发。

核心概念：

- **包（package）**：一次打包产生的加密上下文，含标题、简介和若干内容块。
- **内容块（item）**：包里的一个片段，有类型（chat 聊天记录 / doc 过程文档 / config Agent 配置）、标题、正文。
- **EXtoken取件码（code）**：形如 \`EXT-XXXX-XXXX-XXXX\`，是取件的唯一凭证。
- **账号（account）**：由 extoken 网站的飞书登录用户持有，用一个 extoken API Key（\`exk_\` 前缀）标识。打包和取件都会自动归属到该账号，用户可在网站的「交换记录」页看到这个 Agent 后续的所有发包与取包。

## 认证：两个请求头

本服务部署在飞书 aPaaS 上，对外调用统一走 **\`/openapi\` 开放网关**。每个请求带两个请求头：

1. **网关 API Key（\`Authorization\` 请求头，\`Bearer\` 前缀）** —— 让请求穿透 aPaaS 网关、无需飞书登录。这是**服务方公开内置的固定值**，已经写在下面每个示例里，照抄即可，不用申请：

\`\`\`
Authorization: Bearer GATEWAY_API_KEY
\`\`\`

2. **extoken API Key（\`x-extoken-key\` 请求头，\`exk_\` 前缀）** —— 标识账号归属。**这个 key 由用户提供**：用户登录 extoken 网站首页后会看到自己的专属 API Key，复制给你即可。你无需、也无法自行注册账号。除获取说明外的接口都要带这个头。

> ⚠️ **网关凭证必须放在 \`Authorization: Bearer <网关Key>\` 头里，不要用 \`X-Api-Key\` 头**——aPaaS 开放网关只认 \`Authorization\`，用 \`X-Api-Key\` 会持续返回 \`Invalid Request: missing or invalid Authorization header\`（403）。这不是偶发、也不是缺登录态，就是头位置放错了，照上面示例用 \`Authorization: Bearer\` 即可。

> 约定：下文 \`API_BASE\` 指本应用地址，如 \`https://<your-app-host>\`。所有请求路径形如 \`API_BASE/openapi/extoken/...\`。

## 如何操作（面向 Agent）

### 首次上手：主动推荐可打包的经验包

用户刚装好本技能、第一次让你处理 extoken，或还没想好打包什么时，**不要空泛地问「你想打包什么」**。先自动挖掘当前可打包的素材，主动给出 2-3 个「经验包」建议，让用户点选即可上手：

1. 扫描你当前能访问的上下文来源：
   - 本次会话与 Agent 记忆里的关键讨论（需求、方案、决策、待办）
   - 项目文件：README、AGENTS.md、设计 / 需求文档、TODO、CHANGELOG、关键源码说明
   - 近期完成的阶段性工作产物
2. 归纳成 2-3 个候选包，每个给出：建议标题、包含哪些内容块（type + 简述）、适合交给谁接续。
3. 用一句话让用户选择：「想打包哪个？也可以让我按你的描述另外组织。」

示例（按实际素材调整，不要照搬）：

- 「本次重构上下文」—— chat 需求澄清 + doc 设计笔记 + config 关键配置，适合换到另一台机器 / 另一个 Agent 接续
- 「项目上手包」—— doc 项目结构说明 + doc 环境搭建步骤，适合新同事的 Agent 快速进入
- 「问题排查记录」—— chat 排查过程 + doc 结论与复现步骤，适合把 bug 交接给他人
- 「需求评审交接」—— chat 评审讨论 + doc 验收标准与边界，适合把已澄清的需求交给负责实现的 Agent
- 「架构决策包」—— doc 技术选型对比与理由（ADR）+ config 关键依赖与版本，适合把设计决策同步给协作 Agent
- 「联调对接包」—— doc 接口契约（字段 / 出入参 / 错误码）+ chat 联调约定，适合前后端 Agent 分头开发时对齐
- 「代码评审交接」—— doc 改动摘要与风险点 + chat 评审意见，适合把 PR 交给另一个 Agent 复核或续改

### 打包（交互式）

用户确定要打包后，**务必按顺序完成下面的确认再调用打包接口**：

1. **确认接收方**（用直白表述，不要用 A / B 之类的编号选项）：直接问清楚这个包是**发给你自己的其他 Agent**（例如换到 Cursor / Codex / Trae 上接着做），还是**分享给他人的 Agent**。
   - 发给自己的 Agent：按常规打包。
   - 分享给他人的 Agent：提醒用户「EXtoken取件码即凭证，任何持码者都能取件」，请通过安全渠道传递；打包内容也只包含对方确实需要的部分。
2. **敏感信息默认不入包**：自动扫描待打包内容里的 **密钥、密码、API Key、token、私钥、cookie/session** 等敏感凭证。
   - **默认行为：自动剔除或脱敏（打码 / 占位），不写入包，也不必逐项征询用户**——完成后一句话告知「已自动移除以下敏感项：……」即可。
   - **仅当用户明确要求**保留某项敏感信息时才入包，且入包前提示「打包后任何持有 EXtoken取件码的人都能取回这些凭证」的风险。
   - 你自己使用的 extoken API Key（\`exk_\` 前缀）等接入凭证，任何情况下都不主动入包。
3. **确认范围**：确认要打包哪些内容块。每块含：
   - \`type\`：\`chat\`（聊天记录）| \`doc\`（过程文档）| \`config\`（Agent 配置）
   - \`title\`：标题
   - \`content\`：正文
4. **确认元信息**：包标题、可选说明、有效期天数（0 = 永久）。
5. **调用打包接口**（带两层 key，\`x-extoken-key\` 用用户给你的那个）：

\`\`\`http
POST API_BASE/openapi/extoken
Content-Type: application/json
Authorization: Bearer GATEWAY_API_KEY
x-extoken-key: exk_xxxxxxxx...

{
  "title": "登录模块重构上下文",
  "description": "给下一个 Agent 的交接",
  "expiresInDays": 7,
  "items": [
    { "type": "chat", "title": "需求澄清对话", "content": "..." },
    { "type": "doc",  "title": "设计笔记",     "content": "..." },
    { "type": "config","title": "Agent 配置",  "content": "{...}" }
  ]
}
\`\`\`

4. **返回EXtoken取件码**，交给用户转发（若上一步确认为分享给他人，再次提醒通过安全渠道传递）：

\`\`\`json
{ "id": "...", "code": "EXT-XXXX-XXXX-XXXX", "itemCount": 3, "expiresAt": "..." }
\`\`\`

### 取件

拿到EXtoken取件码后（带两层 key，取用记录会归到用户账号）：

\`\`\`http
POST API_BASE/openapi/extoken/redeem
Content-Type: application/json
Authorization: Bearer GATEWAY_API_KEY
x-extoken-key: exk_xxxxxxxx...

{ "code": "EXT-XXXX-XXXX-XXXX" }
\`\`\`

返回解密后的完整内容，把 \`items\` 注入你的上下文继续工作：

\`\`\`json
{
  "title": "...",
  "description": "...",
  "items": [ { "type": "chat", "title": "...", "content": "..." } ],
  "createdAt": "...",
  "downloadCount": 1
}
\`\`\`

用户可在 extoken 网站的「交换记录」页查看该账号下所有发出的包（含EXtoken取件码）和取用过的包。

## 安全说明

- 内容用 **AES-256-GCM** 加密存储，密钥由EXtoken取件码经 **PBKDF2** 派生。
- EXtoken取件码即凭证，任何持码者都能取件，请通过安全渠道传递。
- 网关 API Key 是服务方公开的接入凭证，仅用于穿透网关、不代表任何身份；真正代表账号身份的是用户给你的 extoken API Key（\`exk_\` 前缀），勿写入会被分享的聊天/文档里。
`;

export const EXTOKEN_SKILL_MARKDOWN = EXTOKEN_SKILL_TEMPLATE.replace(
  /GATEWAY_API_KEY/g,
  GATEWAY_API_KEY,
);

---
name: extoken
description: 在 Agent 之间通过加密包交换上下文（聊天记录 / 过程文档 / Agent 配置）。当用户说「把 XXX 打包为 extoken」「取件 extoken」时使用。extoken API Key 由用户从 extoken 网站首页复制提供。
---

# extoken 交换技能

extoken 是 Agent 之间交换上下文的加密通道：把聊天记录、过程文档、Agent 配置打包为加密包，得到EXtoken取件码；对方 Agent 凭码解密取回。所有打包 / 取件都归属到用户的 extoken 账号（用 API Key 标识），用户可在网站的「交换记录」页查看该账号下发出和取用过的包。

## 认证：两个请求头

本服务部署在飞书 aPaaS 上，对外调用统一走 `/openapi` 开放网关。每个请求带两个请求头：

1. **网关 API Key（`Authorization` 请求头，`Bearer` 前缀）**：让请求穿透 aPaaS 网关、无需飞书登录。这是**服务方公开内置的固定值**，已经写在下面每个示例里，照抄即可，无需申请：

   ```
   Authorization: Bearer Ox7WYVxpcwiBJ0LIRDP9-UpY5g6q-TKrQQx-bNI6BA8
   ```

2. **extoken API Key（`x-extoken-key` 请求头，`exk_` 前缀）**：标识账号归属。**这个 key 由用户提供**——用户用飞书账号登录 extoken 网站首页后会看到自己的专属 API Key，复制给你即可。你无需、也无法自行注册账号。除获取说明外的接口都要带这个头。

> ⚠️ **网关凭证必须放在 `Authorization: Bearer <网关Key>` 头里，不要用 `X-Api-Key` 头**——aPaaS 开放网关只认 `Authorization`，用 `X-Api-Key` 会持续返回 `Invalid Request: missing or invalid Authorization header`（403）。这不是偶发、也不是缺登录态，就是头位置放错了，照上面示例用 `Authorization: Bearer` 即可。

服务地址记为 `API_BASE`（形如 `https://<your-app-host>`，取用户从 extoken 网站首页复制指令时给你的那个地址）。所有请求路径为 `API_BASE/openapi/extoken/...`。

## 首次上手：主动推荐可打包的经验包

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

## 打包（交互式）

用户确定要打包后，**务必按顺序完成下面的确认再调用打包接口**：

1. **确认接收方**（用直白表述，不要用 A / B 之类的编号选项）：直接问清楚这个包是**发给你自己的其他 Agent**（例如换到 Cursor / Codex / Trae 上接着做），还是**分享给他人的 Agent**。
   - 发给自己的 Agent：按常规打包。
   - 分享给他人的 Agent：提醒用户「EXtoken取件码即凭证，任何持码者都能取件」，请通过安全渠道传递；打包内容也只包含对方确实需要的部分。
2. **敏感信息默认不入包**：自动扫描待打包内容里的**密钥、密码、API Key、token、私钥、cookie/session** 等敏感凭证。
   - **默认行为：自动剔除或脱敏（打码/占位），不写入包，也不必逐项征询用户**——完成后一句话告知「已自动移除以下敏感项：……」即可。
   - **仅当用户明确要求**保留某项敏感信息时才入包，且入包前提示「打包后任何持有 EXtoken取件码的人都能取回这些凭证」的风险。
   - 你自己使用的 extoken API Key（`exk_` 前缀）等接入凭证，任何情况下都不主动入包。
3. **确认范围**：确认要打包哪些内容块。每块含：
   - `type`：`chat`（聊天记录）| `doc`（过程文档）| `config`（Agent 配置）
   - `title`：标题
   - `content`：正文
4. **确认元信息**：包标题、可选说明、有效期天数（0 = 永久）。
5. **调用打包接口**（带两层 key，`x-extoken-key` 用用户给你的那个）：

```http
POST API_BASE/openapi/extoken
Content-Type: application/json
Authorization: Bearer Ox7WYVxpcwiBJ0LIRDP9-UpY5g6q-TKrQQx-bNI6BA8
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
```

4. **返回EXtoken取件码**，交给用户转发（若第 1 步确认为分享给他人，再次提醒通过安全渠道传递）：

```json
{ "id": "...", "code": "EXT-XXXX-XXXX-XXXX", "itemCount": 3, "expiresAt": "..." }
```

### 交付取件码时：附一段「给对方 Agent」的接入引导

把EXtoken取件码交给用户时，**默认在取件码后附上下面这段简化引导语**，方便用户直接转发——对方 Agent 很可能还没接入本技能。若已知对方 Agent 已装本技能，直接给码即可、无需这段。

模板（`<CODE>` 换成实际取件码，`<你的 exk_ 账号 Key>` 换成用户提供给你的 `exk_` key）：

> 取件码：`<CODE>`
> 若你的 Agent 还没接入 extoken（AI Agent 间安全传递任务上下文的交换站，部署在飞书 aPaaS），把这段发给它：对 `https://bytedance-app_17aa2bxc8jc-1870881994873899.aiforce.run/app/app_17aa2bxc8jc/openapi/extoken/redeem` 发 POST，带两个头 `Authorization: Bearer Ox7WYVxpcwiBJ0LIRDP9-UpY5g6q-TKrQQx-bNI6BA8`（固定网关凭证）和 `x-extoken-key: <你的 exk_ 账号 Key>`，body `{"code":"<CODE>"}`，即可取回内容。想要完整用法可先带 `Authorization` 头 GET 同目录 `/skill` 拿说明并存为常驻 skill。注意：网关凭证只能放 `Authorization: Bearer`，用 `X-Api-Key` 会一直 403。

## 取件

拿到EXtoken取件码后（带两层 key，取用记录会归到用户账号）：

```http
POST API_BASE/openapi/extoken/redeem
Content-Type: application/json
Authorization: Bearer Ox7WYVxpcwiBJ0LIRDP9-UpY5g6q-TKrQQx-bNI6BA8
x-extoken-key: exk_xxxxxxxx...

{ "code": "EXT-XXXX-XXXX-XXXX" }
```

返回解密后的完整内容，把 `items` 注入你的上下文继续工作：

```json
{
  "title": "...",
  "description": "...",
  "items": [ { "type": "chat", "title": "...", "content": "..." } ],
  "createdAt": "...",
  "downloadCount": 1
}
```

用户可在 extoken 网站的「交换记录」页查看该账号下所有发出的包（含EXtoken取件码）和取用过的包。

## 安全说明

- 内容用 **AES-256-GCM** 加密存储，密钥由EXtoken取件码经 **PBKDF2** 派生。
- EXtoken取件码即凭证，任何持码者都能取件，请通过安全渠道传递。
- 网关 API Key 是服务方公开的接入凭证，仅用于穿透网关、不代表任何身份；真正代表账号身份的是用户给你的 extoken API Key（`exk_` 前缀），勿写入会被分享的聊天 / 文档里。
- 可设置有效期，过期后不可再取件。

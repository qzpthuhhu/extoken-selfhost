export const EXTOKEN_PACKAGE_DOC_MARKDOWN = `# Extoken Package Protocol v1

Extoken 包是用于 Agent 间交接任务上下文的结构化信封。它不是聊天记录转存，也不是文件仓库备份，而是把一个任务在当前时刻的可接续状态整理成机器可读、人类可审计、可校验、可恢复的上下文资产。

## 1. 打包目标

一个合格的 Extoken 包应帮助接手 Agent 回答四个问题：

1. 这个任务的目标、约束和当前状态是什么？
2. 前一个 Agent 已经做了哪些决策、修改、验证和排查？
3. 当前工作区是否和打包时一致，是否需要先核验环境？
4. 哪些动作可以继续执行，哪些动作需要用户确认，哪些动作禁止自动重试？

## 2. 包生命周期

1. 采集任务现场：收集用户目标、关键对话、决策、文件改动、命令结果、错误现场、阻塞状态和下一步动作。
2. 归一化为协议块：把内容拆成类型化 items，而不是塞进一段自由文本。
3. 生成 Envelope：补齐 schemaVersion、createdAt、continuation、workspace、integrity。
4. 加密存储并发码：服务端保存加密内容，发包方获得取件码。
5. 取件恢复：接手 Agent 凭取件码读取包，先核验 workspace 和 integrity，再恢复上下文。
6. 事件审计：创建、取件、下载、失败、过期、权限拒绝等事件进入 extoken_package_event。

## 3. Envelope 结构

\`\`\`json
{
  "schemaVersion": 1,
  "createdAt": "2026-08-28T00:00:00.000Z",
  "title": "登录体系改造交接",
  "description": "邮箱验证码注册、登录和改密已完成，等待线上验证。",
  "continuation": {
    "sourceAgent": "Trae",
    "sourceSessionId": "session-20260828",
    "sourceRunId": "run-001",
    "sourceTurnId": "turn-014",
    "handoffStatus": "needs_review",
    "nextActions": ["检查 SMTP 送达", "验证注册页移动端"],
    "blockingState": ""
  },
  "workspace": {
    "projectName": "Extoken",
    "rootHash": "sha256:...",
    "gitRemote": "git@github.com:example/extoken.git",
    "gitBranch": "main",
    "gitCommit": "a1b2c3d",
    "dirtyFilesHash": "sha256:..."
  },
  "integrity": {
    "payloadSha256": "sha256:...",
    "filesHash": "sha256:...",
    "commandHash": "sha256:...",
    "taskStateHash": "sha256:...",
    "toolOperations": [
      {
        "toolName": "shell",
        "canonicalArgsHash": "sha256:...",
        "recoveryMode": "reconcile",
        "summary": "typecheck and build passed; deployment pending"
      }
    ]
  },
  "items": [
    {
      "type": "decision",
      "title": "验证码只保存 hash",
      "content": "避免数据库泄露后直接拿到验证码明文。",
      "metadata": {
        "risk": "security"
      }
    }
  ]
}
\`\`\`

## 4. 字段语义

| 字段 | 含义 | 作用 |
|---|---|---|
| schemaVersion | 协议版本 | 当前为 v1，用于未来兼容升级 |
| title | 包标题 | 给人和 Agent 快速判断包的主题 |
| description | 包简介 | 说明任务背景、当前状态和交接目的 |
| createdAt | 创建时间 | 判断上下文新鲜度 |
| continuation | 接续语义 | 告诉接手 Agent 从哪里继续、是否阻塞 |
| workspace | 工作区身份 | 判断当前项目是否与打包现场一致 |
| integrity | 完整性证明 | 核验内容、文件、命令和任务状态是否匹配 |
| items | 内容块 | 承载真正的上下文信息 |

## 5. items 类型

| type | 语义 | 建议内容 |
|---|---|---|
| chat | 关键对话 | 用户目标、约束、澄清、验收口径 |
| doc | 过程文档 | PRD、方案、说明、研究摘要 |
| config | 配置说明 | 环境变量名、服务入口、运行方式、开关项；只放脱敏信息 |
| file_diff | 文件变更 | 文件路径、变更目的、关键 diff 摘要、复查点 |
| decision | 决策记录 | 为什么选某方案、排除什么、依赖哪些约束 |
| todo | 待办状态 | 已完成、进行中、未完成、阻塞任务和验收标准 |
| tool_result | 工具结果 | 命令/API/搜索/构建/测试等工具输出的结论性摘要 |
| env_note | 环境提示 | 本地/服务器/浏览器/账号状态、路径、部署位置 |
| error | 错误现场 | 错误码、堆栈摘要、复现步骤、已尝试修复、下一步排查 |
| token_usage | 用量线索 | 模型、会话、token 或成本摘要 |
| permission | 权限边界 | 需要用户确认、服务授权、不可访问数据 |

## 6. 最小可用包

一个 Extoken 包至少应包含：

1. schemaVersion、title、description、createdAt。
2. 至少一个 items 内容块，且每个块有 type、title、content。
3. 服务端生成的包 ID、取件码、归属账户、过期策略。
4. 内容大小、块数量、payloadSha256 或服务端 contentSha256。
5. 创建事件，后续取件、下载、失败、过期和权限拒绝事件进入审计日志。

## 7. 完整交接包

一个完整的 Agent 交接包可以包含：

1. 完整 continuation：sourceAgent、sourceSessionId、sourceRunId、sourceTurnId、handoffStatus、nextActions、blockingState。
2. 完整 workspace：projectName、rootHash、gitRemote、gitBranch、gitCommit、dirtyFilesHash。
3. 完整 integrity：payloadSha256、filesHash、commandHash、taskStateHash、toolOperations。
4. 覆盖 11 类 items：chat、doc、config、file_diff、decision、todo、tool_result、env_note、error、token_usage、permission。
5. 足够让接手 Agent 判断是否能继续、是否需要用户确认、是否需要重新验证环境。

## 8. continuation 接续语义

handoffStatus 可取：

- ready：可直接接手。
- in_progress：任务正在进行，接手前先读取 nextActions。
- blocked：任务阻塞，blockingState 必须写明阻塞条件。
- needs_review：需要用户或接手 Agent 复核后继续。
- archived：归档包，主要用于查询和复盘。

接手 Agent 应先读取 continuation，再读取 workspace 和 integrity，最后展开 items。

## 9. workspace 工作区身份

workspace 用来减少“在错误项目上继续”的风险。建议包含：

- projectName：项目名。
- rootHash：项目根身份 hash。
- gitRemote：Git 远端地址。
- gitBranch：当前分支。
- gitCommit：当前提交。
- dirtyFilesHash：未提交变更摘要 hash。

如果当前工作区与包内 workspace 不一致，Agent 应先提示用户确认，不应直接继续修改文件或部署。

## 10. integrity 完整性证明

integrity 不承诺自动复现一切，它承诺接手前能核验关键状态：

- payloadSha256：包内容摘要。
- filesHash：关键文件列表或摘要 hash。
- commandHash：关键命令和输出摘要 hash。
- taskStateHash：任务状态摘要 hash。
- toolOperations：重要工具调用摘要。

toolOperations.recoveryMode 可取：

- replay_safe：可安全重放。
- idempotent：幂等操作。
- reconcile：先对账，再决定是否继续。
- reattach：重新接入已有任务、会话、部署或外部资源。
- outcome_unknown：上一轮结果未知，必须先核验。
- never_auto_retry：禁止自动重试，常见于付款、删除、发布、权限变更。

## 11. 事件日志作为事实源

Extoken 使用 extoken_package_event 记录包生命周期事件。事件日志用于统计、审计和排障，不应只依赖最终包内容。

典型事件包括：

- created：创建包。
- redeemed：取件成功。
- downloaded：下载包。
- failed：操作失败。
- expired：包过期。
- forbidden：权限拒绝。
- api_key_rotated：账户 Key 轮换。

## 12. 安全边界

默认不应进入 Extoken 包的内容：

- 明文密码。
- 长期 API Key。
- 邮箱 SMTP 授权码。
- SSH 私钥。
- Cookie。
- 数据库连接串。
- 可直接登录第三方服务的凭证。

需要说明环境时，只写变量名、用途、配置位置和脱敏示例。Extoken 包应传递上下文，不应成为秘密凭证仓库。

## 13. Agent 推荐读取顺序

1. 读取 continuation，判断任务状态、阻塞原因和下一步动作。
2. 读取 workspace，确认当前项目、分支和提交是否匹配。
3. 读取 integrity，判断是否需要重新跑检查或对账。
4. 优先读取 decision、todo、error、file_diff、tool_result。
5. 再展开 chat、doc、config、env_note、token_usage、permission。
6. 如果 recoveryMode 是 never_auto_retry 或 outcome_unknown，先请求用户确认或执行只读核验。

## 14. 公开读取入口

Agent 可以直接读取本文档：

\`\`\`bash
curl -L https://extoken.aishangai.shop/api/extoken/package-doc
\`\`\`

如果已接入开放网关，也可以读取：

\`\`\`bash
curl -L \\
  -H "Authorization: Bearer <PUBLIC_OPENAPI_GATEWAY_TOKEN>" \\
  https://extoken.aishangai.shop/openapi/extoken/package-doc
\`\`\`
`;

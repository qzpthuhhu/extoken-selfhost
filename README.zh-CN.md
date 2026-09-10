# Extoken Selfhost

[English](README.md) | 简体中文

Extoken 是一个面向 AI Agent 的加密上下文包系统，用于在不同 Agent、IDE、会话和自动化环境之间交接任务现场。

官网：<https://extoken.aishangai.shop>

Extoken 解决的是一个很具体的问题：一个 Agent 已经理解了目标、代码库、错误现场、关键决策和下一步动作，但当任务切换到另一个 Agent、另一个工具或另一个会话时，这些上下文经常丢失。Extoken 把任务现场打包成可审计、可取件、可被 Agent 读取的上下文包。

## 它能做什么

- **上下文包协议**：把任务状态整理成版本化 Envelope，包含 `continuation`、`workspace`、`integrity` 和类型化 `items`。
- **跨 Agent 交接**：通过取件码把上下文交给另一个 Agent，让接手方恢复目标、决策、错误现场和下一步动作。
- **加密交换**：存储加密后的包内容，并围绕取件流程提供过期时间、取件次数限制和事件日志。
- **Agent 可读文档**：以 Markdown 暴露包协议说明，Agent 不需要解析网页 DOM。
- **可自托管应用**：包含 React 前端、NestJS 后端、PostgreSQL 数据库、邮箱登录、API Key 和开放网关接口。

## 线上入口

- 首页：<https://extoken.aishangai.shop>
- Extoken 包协议：<https://extoken.aishangai.shop/package>
- 使用案例：<https://extoken.aishangai.shop/use-cases>
- 收发记录：<https://extoken.aishangai.shop/records>
- Agent Markdown 文档：<https://extoken.aishangai.shop/api/extoken/package-doc>

Agent 可以直接读取公开协议文档：

```bash
curl -L https://extoken.aishangai.shop/api/extoken/package-doc
```

已接入开放网关的 Agent 可以使用：

```bash
curl -L \
  -H "Authorization: Bearer <PUBLIC_OPENAPI_GATEWAY_TOKEN>" \
  https://extoken.aishangai.shop/openapi/extoken/package-doc
```

## 包模型

一个 Extoken 包是任务交接工件。最小可用包应该描述：

- 包标题、摘要、协议版本和创建时间
- 加密后的上下文内容
- 取件码、包 ID、归属用户 ID、过期时间和使用策略
- 用于校验体积、内容块数量和完整性的摘要信息

更完整的交接包可以包含：

- 对话记录、未决决策、阻塞原因和下一步动作
- 工作区指纹、项目路径、环境提示和依赖说明
- 文件改动、命令结果、工具调用副作用和恢复策略
- 来源 Agent、目标 Agent、会话 ID、运行 ID 和事件日志引用

它不应该包含明文密码、长期 API Key、SMTP 授权码、SSH 私钥、Cookie 或数据库连接串。

## 架构

```text
client/       React + Vite 前端
server/       NestJS API、认证、包交换、OpenAPI 网关
shared/       共享包协议文档和类型
scripts/      CLI 和部署辅助脚本
docs/         项目补充文档
```

核心后端模块：

- `server/modules/auth`：邮箱验证、JWT 会话、API Key
- `server/modules/package`：包创建、取件、记录、事件日志
- `server/modules/openapi`：外部 Agent 访问的网关接口
- `server/database`：PostgreSQL schema 和迁移

## 技术栈

- Frontend：React、Vite、Tailwind CSS 4、Framer Motion
- Backend：NestJS、Express、PostgreSQL、Drizzle ORM
- Auth：bcrypt 密码哈希、JWT access token、HttpOnly refresh cookie
- Mail：SMTP 邮箱验证码
- Runtime：Node.js 20+、npm 10+

## 本地开发

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev
```

常用命令：

```bash
npm run type:check
npm run build:server
npm run build:client
npm run build:prod
npm run test
```

## 环境变量

从 `.env.example` 开始配置。生产环境启用邮箱验证码时需要配置 SMTP：

```env
EMAIL_CODE_SECRET=replace-with-a-random-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@example.com
SMTP_PASS=replace-with-provider-password-or-app-code
SMTP_FROM="Extoken <no-reply@example.com>"
```

不要提交真实 `.env` 文件。仓库已忽略 `.env`、`.env.*`、构建产物、本地 Agent 状态和 zip 备份。

## CLI

仓库包含一个极简 Extoken CLI：

```bash
npm run extoken -- pack handoff.json
npm run extoken -- redeem EXT-XXXX-XXXX-XXXX --out package.json
npm run extoken -- install-skill
```

## 部署说明

当前公开生产站点：

```text
https://extoken.aishangai.shop
```

生产服务器内存有限，前端构建建议在本地完成后同步到服务器。涉及后端接口或 shared 类型变更时，需要同步 `dist/server`、`dist/shared` 并重启 `extoken` 服务。

## 安全

Extoken 包用于传递任务上下文，不是凭证仓库。安全问题报告和处理方式见 [SECURITY.md](SECURITY.md)。

## 贡献

Extoken 仍处在早期阶段，而且协议语义比较重要。修改包语义前，请先阅读包协议页面，并尽量保持向后兼容。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 授权

Copyright 2026 Extoken contributors. 除非后续单独添加授权协议，否则保留所有权利。

# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 0. 应用架构概览（Agent信息交换站-Extoken）

AI 编码 Agent 之间交接任务上下文的管理工具。**面向飞书用户**：用飞书账号登录后系统自动创建其专属 extoken 账户（一个飞书用户绑定一个账户），登录首页即可复制含专属 apiKey 的一键接入指令给外部 Agent（Cursor/Codex/Aily/Coze/Trae 等）；该 Agent 后续走开放网关的所有打包/取件都自动归属到该账户，可在「交换记录」页查看。另有「反馈与通知」页收集用户反馈与展示产品公告。支持 6 套主题，全局顶部导航。取件码对用户统一表述为「EXtoken取件码」。

- **数据表**：`extoken_account`（交换账户，一个飞书用户一条：`api_key` 明文 Key 仅登录本人可见、`api_key_hash`/`api_key_prefix` 保留列、`creator_user_id` 绑定登录用户 miaoda userId 并加唯一索引 `idx_extoken_account_creator`、`creator_name` 记用户名、`register_source` 恒为 web）；`extoken_package`（加密交换包，AES-256-GCM 密文 + 取件码哈希 + `code` 明文取件码供归属账户查看 + `owner_account_id` 归属）；`extoken_redemption`（取用记录）。extoken 三表额外开放 anon 的 INSERT/UPDATE policy，业务鉴权由 service 层 API Key 完成。反馈通知三表：`site_feedback`（用户反馈：content/contact/status[open/in_progress/resolved/closed]/admin_reply/submitter_name，提交人记 `_created_by`）、`site_announcement`（产品公告：title/content[Markdown]/category[update/announcement/maintenance]/published）、`site_roadmap`（管理员改进&bug 路线图：title/description/item_type[feature/bug]/status[planned/in_progress/done/wontfix]/priority[low/medium/high]），均标准 RLS + anon SELECT
- **后端模块**：`server/modules/extoken/` 与 `server/modules/site/`。extoken 模块：`ExtokenController`(`@Controller('api/extoken')`)：`GET /skill` 公开免登录返回技能说明 Markdown（内容源 `extoken-skill.content.ts`，含打包前接收方确认+密钥二次确认流程）、`GET /me`(@NeedLogin，据 req.userContext 自动 getOrCreate 账户并返回账户+发包(含明文 code)+取包记录)、`GET /admin/overview`(@NeedLogin + @CanRole(['admin'])，平台 admin 角色鉴权，非管理员由框架返回 403)、`GET /package/:id/download`(@NeedLogin，据 req.userContext getOrCreate 账户后校验 owner 或曾取用过该包，用库内明文 code 解密返回 `PackageDownloadResponse`{title/description/items/createdAt}，供收发记录页解密下载)；`ExtokenOpenApiController`(`@Controller('openapi/extoken')`)：`GET /skill`、`POST /`打包、`POST /redeem`取件，供外部 Agent 走开放网关 api-key 鉴权调用（docs/openapi.json 维护 spec）。`ExtokenService` 负责加解密+明文 code 落库+归属计数，`ExtokenAccountService` 负责按飞书 userId getOrCreateForUser、apiKey 鉴权、myAccount 与 adminOverview。site 模块：`SiteController`(`@Controller('api/site')`) + `SiteService`：公告 `GET /announcements`（公开）、反馈 `POST /feedback`+`GET /feedback/mine`（@NeedLogin，按 `_created_by` 过滤本人）、管理台 `GET|PATCH /admin/feedback[/:id]`、`GET|POST|PATCH|DELETE /admin/announcements[/:id]`、`GET|POST|PATCH|DELETE /admin/roadmap[/:id]`（均 @NeedLogin + @CanRole(['admin']) 平台 admin 角色鉴权，非管理员由框架返回 403）。`SiteOpenApiController`(`@Controller('openapi/site')`)：`GET /project-updates` 公开只读（网关 api-key 鉴权，不加 @NeedLogin/不区分用户），复用 `SiteService.getPublicProjectUpdates` 返回已发布公告+路线图（`ProjectUpdatesResponse`），供外部 Agent（如用户自己的 aily agent）读取项目更新情况，docs/openapi.json 维护 spec
- **共享类型**：`shared/api.interface.ts`（extoken 内容块/打包取件/`MyAccountResponse`/`AdminOverviewResponse`；反馈通知 `AnnouncementItem`/`AnnouncementCategory`/`MyFeedbackItem`/`AdminFeedbackItem`/`FeedbackStatus`/`RoadmapItem` 及各 CRUD 请求类型）；插件类型 `shared/plugin-types.ts`
- **前端页面（5 个业务页）**：`ExtokenGuidePage`(`/` index 快速上手：顶部 `OnboardingSteps` 可跳过 3 步新手引导(进度由账号已建/是否复制过接入指令[localStorage key=agent-exchange-cmd-copied]/sentCount>0 驱动，跳过态存 key=agent-exchange-onboarding-dismissed)→账号卡(全宽)→接入指令大按钮(运行绿 `bg-success` CTA)→`PromptExamples` 案例 3 卡→进阶折叠区 SKILL.md 复制下载(正文用 `MarkdownDoc` 渲染并开启右侧悬浮目录)→页面最下方「关于我」卡)、`ExchangeRecordPage`(`/records` 交换记录：Tabs 切换已发出/已取用，支持搜索标题简介、日期范围筛选(Popover+Calendar)、简介展开预览、复制 EXtoken取件码与复制完整信息；已发出/已取用的包均有「下载」按钮，调 `download-package.ts` 的 downloadDecryptedPackage→`GET /package/:id/download` 解密后拼成 Markdown 触发浏览器下载)、`FeedbackHubPage`(`/feedback` 反馈与通知：Tabs 分产品通知(MarkdownDoc/cyber-prose 渲染 Markdown+彩色类型徽标)/我的反馈(提交表单+我的反馈列表+状态徽标+官方回复)，子组件 AnnouncementList/MyFeedbackPanel)、`AdminConsolePage`(`/admin` 管理台仅平台 admin 角色可见：Tabs 分概览(AdminStatCards+AdminAccountTable)/用户反馈(AdminFeedbackPanel 改状态+回复)/公告管理(AdminAnnouncementPanel+AnnouncementFormDialog 增删改+发布开关)/路线图(AdminRoadmapPanel+RoadmapFormDialog 增删改))。Layout 顶部导航含快速上手/使用案例/收发记录/反馈与通知(未读公告红点，localStorage key=agent-exchange-anno-seen)/管理台(据 useAuth 平台 admin 角色显隐)。账户数据由 `hooks/useExtokenAccount.tsx` 跨页共享；`utils/format.ts` 提供 formatBytes。另有 `UseCasesPage`(`/use-cases` 典型使用案例：纯静态展示页，Tabs 按 4 类场景[跨工具接续/团队交接/新人上手/知识沉淀]分组，每案例卡含痛点+内容块徽标+接收方+打包/取件双提示词一键复制，数据源 `use-cases.data.ts`，无后端依赖)
- **Skill 文件**：`skills/extoken/SKILL.md` 为可安装到外部 Agent 的正式 skill，指导 Agent 用**用户提供的** apiKey 打包/取件；打包流程含首次上手主动推荐 2-3 个经验包、接收方确认（自己的 Agent vs 他人的 Agent）、敏感信息默认剔除不入包（仅用户明确要求才保留）；交付取件码时默认在码后附一段简化的「给对方 Agent 的接入引导语」（含网关地址+两个请求头，方便未接入本 skill 的对方 Agent 直接取件，已接入则省略）
- **API 层**：`client/src/api/index.ts`（axiosForBackend 封装：extoken 的 fetchMyAccount/downloadPackage/fetchExtokenSkill/fetchAdminOverview；site 的 fetchAnnouncements/submitFeedback/fetchMyFeedback/fetchAdminFeedback/updateFeedback/公告与路线图 CRUD）
- **权限鉴权**：管理台采用平台 RBAC 静态角色鉴权。平台已创建 `admin` 角色（管理员）。后端管理台端点用 `@NeedLogin()` + `@CanRole(['admin'])`（来自 `@lark-apaas/fullstack-nestjs-core`）把关；前端 Layout 导航与 AdminConsolePage 用 `useAuth()` + `ability.can('admin', ROLE_SUBJECT)`（来自 `@lark-apaas/client-toolkit/auth`）判断显隐并处理 isLoading；`client/src/api/index.ts` 管理台请求在 response 层拦截 403 抛明确无权限错误。授权入口：开发态用 miaoda-auth-cli MOCK 调试，线上去角色面板授权。**已彻底移除原 ADMIN_USER_IDS 硬编码方案**
- **主题系统**：`hooks/useTheme.tsx`（ThemeProvider + useTheme）**固定使用 `cyber` 单主题**（Cyber/Technical 风格），进入应用即在 `<html>` 上设 `data-theme="cyber"`（覆盖历史 localStorage 残留），不再提供多主题切换以保证视觉稳定；cyber 主题变量定义在 `index.css` 的 `[data-theme="cyber"]`（霓虹青 hsl(190 100% 50%) + 紫 hsl(271 91% 65%) + 深底 hsl(240 24% 5%)）。已移除顶部导航的 `ThemeSwitcher` 调色板切换器（组件已删除）
- **Cyber 视觉基建**：`index.css` 提供全站 cyber 工具类——`cyber-ambient`/`cyber-noise`（fixed 动态网格+径向光晕+SVG 噪点背景）、`glass-panel`/`glass-panel-strong`（玻璃拟态 backdrop-blur）、`cyber-glow-border`/`cyber-text-glow`（发光边框/文字）、`cyber-underline`（hover 渐变下划线）、`term-block`+`term-tok-*`（终端代码块+URL/Header/Key 语法高亮）、`cyber-pulse`（脉冲）、`cyber-ring-flow`（进度环流动）、`cyber-magnetic`（按钮 hover 缩放+发光）、`cyber-cursor-*`（自定义磁吸光标）。所有动画均在 `prefers-reduced-motion` 与触摸设备（hover:none/pointer:coarse）下自动降级
- **全局动效组件**：`components/cyber/`——`CyberBackground`（环境背景，挂在 Layout 根）、`CyberCursor`（磁吸光标，touch/reduced-motion 自动禁用并恢复系统光标）、`Reveal`（framer-motion 进入视口淡入+缩放包装器，reduced-motion 下静态渲染）
- **长文阅读排版**：`markdown.css` 定义 `.cyber-prose` 作用域样式（一级标题霓虹青紫渐变文字、二级标题 3px 竖线、内联/代码块霓虹边框与左侧竖条、无序列表霓虹小圆点、有序列表数字圆背景、blockquote 提示💡/警告⚠️ callout、链接 hover 下划线动画、悬浮目录 `.cyber-toc`）；`components/cyber/MarkdownDoc.tsx` 包装 Streamdown，自动改写 h1/h2/h3 加锚点、根据 blockquote 文本关键词分提示/警告 callout、`showToc` 开启时解析 ATX 标题生成右侧悬浮目录（平滑滚动跳转，reduced-motion 下禁用平滑）。公告列表与 SKILL.md 展示区均用它渲染（SKILL 开 showToc）
- **通用组件**：`components/StatusBadge.tsx` 为全局统一状态徽标(secondary Badge + 左侧 `bg-current` 色点，色点继承传入 className 的文字色)，反馈状态/公告分类/路线图类型状态优先级/发布状态均用它渲染，满足「颜色+文字+色点」多重编码可及性要求


## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: AI 工程师/开发者，在多 Agent 协作中管理任务交接上下文
- **核心目的**: 高效传递结构化上下文、减少信息丢失、建立协作信任
- **情绪基调**: 专注 / 掌控感；避免焦虑、混乱、廉价科技感

### 1.2 设计方向

- **Design Style**: Cyber / Technical — 工程师工具的秩序感叠加赛博视觉语言：动态网格底纹、玻璃拟态卡片、霓虹青紫渐变强调、发光态与克制动效并存
- **Application Type**: Admin/SaaS — 多页面持久导航 + 高密度信息展示
- **Aesthetic Direction**: 深黑底（#0a0a0f 系）+ 霓虹青(#00d4ff)/紫(#a855f7)渐变强调 + 玻璃层次，状态色语义清晰，动效服务于反馈而非炫技

## 2. Color System (色彩系统)

**色彩关系**: 深蓝灰主色 + 冷调中性底 + 科技蓝交互色 + 三态语义色
**配色设计理由**: 概要设计要求"深色克制中性底+科技蓝强调"，契合工程师工具的高效专注氛围
**主色推导**: 科技蓝 `hsl(217 91% 60%)` 对应 AI 生成、保存等核心行动，与代码编辑器高亮色同源
**使用比例**: 70% 中性底色 / 20% 卡片与边框 / 10% 科技蓝仅用于主按钮、激活态、关键链接

### 2.1 主题颜色

| Token                | HSL 值              | 说明                           |
| -------------------- | ------------------- | ------------------------------ |
| `background`         | hsl(222 20% 12%)    | 深色中性底，克制不刺眼         |
| `card`               | hsl(222 18% 16%)    | 卡片/容器背景，微亮区分层级    |
| `foreground`         | hsl(210 20% 92%)    | 主文字，off-white 避免纯白眩光 |
| `muted-foreground`   | hsl(215 15% 55%)    | 次要文字/占位符                |
| `primary`            | hsl(217 91% 60%)    | 科技蓝主交互色                 |
| `primary-foreground` | hsl(0 0% 100%)      | 主按钮文字                     |
| `accent`             | hsl(217 40% 18%)    | hover/focus/骨架屏背景         |
| `accent-foreground`  | hsl(210 20% 85%)    | accent 上文字                  |
| `border`             | hsl(220 15% 22%)    | 分隔线与边框                   |

### 2.2 导航区配色

- **基调关系**: 复用主配色，导航栏背景 `card` 色 + 底部 `border` 细线分隔
- **关键状态**: 激活项文字 `primary` + 底部 2px 指示条；Hover 使用 `accent` 背景；对比度 ≥ 4.5:1
- **边界与背景**: 非透明 `card` 背景，底部单线分隔，无阴影

### 2.3 语义颜色

| 用途     | HSL 值             | 衍生说明                      |
| -------- | ------------------ | ----------------------------- |
| 已完成   | hsl(152 68% 45%)   | 绿色系，徽标/标签用此色       |
| 进行中   | hsl(217 91% 60%)   | 复用 primary，保持一致性      |
| 待接手   | hsl(32 95% 55%)    | 橙色系，醒目但不刺眼          |
| 错误     | hsl(0 72% 58%)     | 表单校验/失败状态             |

## 3. Typography (字体排版)

- **Heading**: Inter, system-ui, -apple-system, sans-serif
- **Body**: Inter, system-ui, -apple-system, sans-serif
- **Mono**: JetBrains Mono, 'Fira Code', monospace — 仅用于 Git 分支、文件路径、代码片段、指标数字
- **字体策略**: Inter 保证屏幕可读性与工程气质；等宽字体强化代码上下文辨识度；标题 font-bold / 正文 font-normal 形成明确层级

## 4. Layout Strategy (布局策略)

- **导航意图**: 全局顶部导航（快速上手 / 交换记录 / 管理台[仅管理员]），非透明背景，至多一套；未登录时页面内引导飞书登录
- **页面架构**: 统一 `max-w-6xl`（内容页 `max-w-3xl`）容器，左右留白对称；快速上手页纵向分区块（账号卡 / 接入指令 / 案例 / SKILL.md），交换记录页纵向堆叠（统计卡 + 发包列表 + 取包列表）
- **响应式**: 移动端双栏折叠为单栏纵向堆叠；导航收纳为汉堡菜单；指标卡横向滚动

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `rounded-sm (2px)` · 阴影 `shadow-none` · 间距基调 `compact (gap-3/gap-4)`
- **识别签名**: 等宽数字指标 · 状态胶囊徽标带左侧色点 · 网格辅助线（1px border-b/border-r 虚线）
- **装饰策略**: 仅在图表区和空状态使用极简几何线条，无渐变无插画
- **动效原则**: 状态切换与 Toast 150ms ease-out；AI 生成加载用骨架屏脉冲
- **可及性**: 深色模式所有文字对比度 ≥ 4.5:1；状态徽标同时使用颜色+文字标签双重编码

## 6. Component Principles (组件原则)

- **状态完整性**: Button/Input/Select/Card/Badge 覆盖 Default/Hover/Focus/Disabled/Error；Focus ring 使用 `ring-2 ring-primary/50 offset-2`
- **层级清晰**: Primary 按钮填充 `bg-primary`；Secondary/Ghost 使用 `accent` hover；状态徽标胶囊形 + 左侧色点 + 文字标签
- **一致性**: 表单标签 `text-sm text-muted-foreground` 统一置于输入框上方；所有卡片 `p-4 border border-border rounded-sm bg-card`

## 7. Image Direction (图片与视觉资产)

- **Image Role**: 无强制图片需求
- **Image Art Direction**: 优先通过排版、网格线、状态色点和等宽数字建立视觉记忆点；若未来需要空状态插图，采用单色线性图标风格
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 避免通用 AI 机器人插画、紫色渐变科技图、商务人物素材、3D 渲染图标

## 8. 应避免 (Anti-patterns)

- ❌ 状态仅靠颜色区分而不加文字标签（色盲不可达）——状态徽标必须颜色+文字+色点多重编码
- ❌ 动画 width/height/top/left 等触发 layout 的属性，只用 transform + opacity
- ❌ 遗漏 prefers-reduced-motion 与触摸设备降级——所有 cyber 动效/自定义光标必须可降级
- ❌ 发光/渐变/玻璃层堆叠过度导致正文对比度不足（文字对比度须 ≥ 4.5:1）
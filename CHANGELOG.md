# Changelog

本项目是从 [PAKIKNOWLEDGE/dsh-notify-skill](https://github.com/PAKIKNOWLEDGE/dsh-notify-skill) fork 的加固版。
This is a hardened fork of [PAKIKNOWLEDGE/dsh-notify-skill](https://github.com/PAKIKNOWLEDGE/dsh-notify-skill).

## 1.3.0 — 适配 DSH 0.2.0-rc.2（设置页 slot 重命名 + 设置 API 移除）

对照实际发布的 DSH `0.2.0-rc.2`（当前 npm `latest`）逐项核对宿主端与客户端 API。1.2.1 是针对
`0.1.2-rc.1` 修的，本轮发现两处**在新版上必然失效**的调用。

### 修复的 bug
- **设置面板在 DSH 0.2.0-rc.2 上永远不显示**：客户端注册的 slot `settings.plugin.item` 已从 DSH 中
  **整体移除**（全量检索 `@deepseek-ai/*` 零命中）。`ctx.slots.inject()` 会等待 slot 声明，声明永不出现时
  它**静默不注册**——不报错，也没有任何界面。现改为注册到当前契约 `settings.section`（`list` 类型，
  用 `id` 寻址），即 **设置 → 邮件推送** 一个独立设置页。这也与在用的第三方插件 `@xmanrui/dsh-im@4.34.2`
  的做法一致。
  - 旧 slot 是 **keyed** 用 `key` 寻址；新 slot 是 **list** 用 `id` 寻址。若只改名字不改寻址字段，
    `register()` 会直接抛 `list slot "plugins.section" requires options.id`。
  - 新版 `settings.section` 是整页（owner props 为 `{ close }`），因此移除了"列表卡片 + Modal"的两段式 UI，
    改为直接渲染设置页；`@deepseek-ai/dsh-client-ui-primitives` 的 `Modal` 依赖随之去掉（客户端现在只
    `require("react")`，而 `react` 是浏览器基座内置的 seed 模块，无需任何 external 声明）。
- **宿主端启动崩溃**：`index.mjs` 调用 `sctx.settings.register(ns, schema)` 让卡片渲染。DSH 0.2.0-rc.2 的
  `@deepseek-ai/dsh-settings` 只导出 `SettingsForms`，**没有 `register()`**（只有 `configure()`）——
  该调用会抛 `TypeError: sctx.settings.register is not a function` 并带崩插件加载。已整体移除：
  本插件的配置真相在 `config.json`，UI 走自己的 HTTP 路由，**不需要**注册任何 DSH 设置命名空间。
  `@deepseek-ai/dsh-settings` 与 `@deepseek-ai/schemastery` 两个依赖也一并从 `peerDependencies` 去掉。

### 清单（package.json）加固
- **`dsh.client.inject` 里有一个不存在的包**：`@deepseek-ai/dsh-client-runtime` 在 0.2.0-rc.2 中已无此包
  （`@xmanrui/dsh-im` 也带着同一个过时名字）。`inject` 只是加载顺序提示、未命中会被静默跳过，所以它
  不是崩溃原因，但属于误导；现已删除该项（本客户端只依赖 seed 模块，不需要 `inject`/`external`）。
- **peerDependencies 改为真实范围**：`"*"` 在兼容性校验里恒为真，等于关掉了 DSH 的保护；现改为
  `@deepseek-ai/dsh-skill-filesystem: ">=0.2.0-rc.2 <0.3.0-0"`，让不兼容的 DSH 在**安装阶段**就被明确拒绝
  （`dsh: installation rejected: ...`），而不是运行期静默出问题。
- 补充 `dsh.manifestVersion: 1`、`dsh.compatibility`、`engines.dsh`、`publishConfig.access: public`。
- `files` 补上 `SECURITY.md`（此前会被漏出 npm tarball）。
- 版本号 1.2.1 → 1.3.0（含破坏性变更：不再支持 `< 0.2.0-rc.2`）。

### 验证（全部针对真实 DSH 0.2.0-rc.2 运行时）
- `npm run verify` 三个文件语法通过。
- 直接调用 DSH 自身的 `evaluatePluginCompatibility(manifest, {}, "0.2.0-rc.2")` → 返回 `undefined`（兼容）。
- 用 DSH 自身的 `loadProfile`/`--dump-config` 在**隔离的 DSH_HOME** 里真实安装（`dsh plugin --profile web add link:...`）
  并展开 profile 树：插件被写入 `dsh.profile.bundles`，其补丁层贡献了 `- id: dsh-email-push-master` 行，
  退出码 0、stderr 为空、无 `disabled`、无 incompatibility 提示。
- 在真实 cordis 应用里以 DSH 自己的 `skills`(dsh-skill) 与 `webServer`(dsh-host-webserver) 服务启动插件：
  `notify` skill 注册成功且内容来自 `skills/notify/SKILL.md`；`/dsh-email-push/config` GET/POST 正常读写
  `config.json`（写在包目录之外）；授权码只返回掩码、原文不进响应体、留空提交保留原值；跨源 POST 403；
  `GET /test` 405；SMTP 不可达时 `/test` 返回 502 与结构化错误。

## 1.2.1 — 修复 dsh 0.1.2-rc.1 启动崩溃（settingsNamespace 移除）

### 修复的 bug
- **dsh 升级到 0.1.2-rc.1 后启动崩溃**：`@deepseek-ai/dsh-settings@0.1.2-rc.1` 移除了对 `settingsNamespace` 的命名导出（内部改为 `parseSettingsNamespace`）。插件在 `index.mjs` 顶层 `import { settingsNamespace } ...`，导致 `dsh-start` 每次自动更新后 ESM 加载失败并整体退出。现在改为直接向 `sctx.settings.register(EMAIL_PUSH_NS, ...)` 传入命名空间字符串——`SettingsProvider.register()` 内部会用同样的 `/^[a-z][a-z0-9-]*$/` 校验，行为不变，且不再依赖任何版本中易变的内部导出。
- 插件不再需要 `@deepseek-ai/dsh-settings` 的任何导出，避免未来 dsh-settings 再变动时重复崩。

### 验证
- `node --check index.mjs` 通过；直接 `import('./index.mjs')` 成功。

## 1.2.0 — 修复设置面板不显示 + 配置持久化

### 修复的 bug
- **设置 → 插件 → 「邮件推送」面板不显示**：DSH 的 `settings.plugin.item` 卡片只会被派发给 **Host 实际提供服务**（`settings.describe` 返回）的命名空间。此前插件只注册了 HTTP 路由和 skill，从未注册 `dsh-email-push` 设置命名空间，因此客户端卡片永远被过滤掉。现在在主机端注册该命名空间，面板即可正常出现在「可配置」页。
- **重装插件/依赖后配置丢失、agent 找不到配置文件**：`config.json` 原本写在插件包目录（`node_modules`）里，任何一次 `pnpm install`（例如新增别的插件）都会把它连同整个包目录一起删掉。现在配置改存到**持久路径** `~/.config/dsh-email-push-master/config.json`（可用 `DSH_EMAIL_PUSH_CONFIG` 覆盖），写入时自动建目录，重装不再丢失。
- **修复本身不再被重装冲掉**：安装方（profile）用 `patchedDependencies` 把上述两处修复固化为每次安装自动重放。

### 行为变化
- `config.json` 位置：`<包目录>/config.json` → `~/.config/dsh-email-push-master/config.json`。旧的配置在安装后若已存在会被忽略，请到 设置 → 插件 → 邮件推送 重新填写一次。

## 1.0.0 — 稳定性 / 严谨性加固

### 修复的 bug
- **去掉 `535` 自动重试**：旧版在 `535` 时换 `AUTH PLAIN` 重试，但 `535` 是永久性错误（授权码错 / 账号风控 / SMTP 服务未开启），重试只会**加剧账号风控锁定**。现在只在瞬态错误（网络 / 超时 / `421` / `451`）时重试一次。
- **修复 `subject`/`text` 未定义崩溃**：`sendMail()` 引用了 `subject`/`text` 却未从 `opts` 提取，导致 `ReferenceError`。

### 新增
- **连接超时(15s) + 空闲超时(30s)**：服务器不响应时不再永久挂起。
- **`--check` 自检命令**：`node sender.mjs --check` 只验证配置 + SMTP 认证，不真正发信（替代临时探测脚本）。
- **结构化错误分类**：`ConfigError` / `AuthError(535)` / `PermissionError(550)` / `TransientError` / `ProtocolError`，各自带 `smtpCode`，CLI 输出精确一句话。
- **完整邮件头**：`From / To / Date / Message-ID / MIME`（旧版只有 Subject）。
- **配置校验**：邮箱格式、端口合法性、主机推断；`loadConfig` 与 `sendMail` 共用同一套校验（去重）。

### 退出码
`0` 成功 · `2` 配置错误 · `3` 认证失败(535) · `4` 无权限(550) · `5` 瞬态失败

## 1.1.0 — 图形化配置面板

- 新增 **Web GUI 设置面板**（设置 → 插件 → 「邮件推送」）：展开后可直接填写 **服务商**（163/QQ/自定义）、**发送服务器地址**、**发件邮箱**、**密钥（SMTP 授权码）**、**收件邮箱**，无需再手改 `config.json`。
- 面板通过主机端 `/dsh-email-push/config`（GET/POST）与 `/dsh-email-push/test`（POST）路由读写配置并做认证自检；密钥从不出现在浏览器回显中（回显掩码 + `hasAuthCode` 标记，留空即保留原值）。
- 复用 `sender.mjs` 的 `checkAuth` / `readConfigFile` / `writeConfigFile`，配置与 SMTP 逻辑仍是单一来源。

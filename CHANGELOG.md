# Changelog

本项目是从 [PAKIKNOWLEDGE/dsh-notify-skill](https://github.com/PAKIKNOWLEDGE/dsh-notify-skill) fork 的加固版。
This is a hardened fork of [PAKIKNOWLEDGE/dsh-notify-skill](https://github.com/PAKIKNOWLEDGE/dsh-notify-skill).

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

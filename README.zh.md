# dsh-email-push-master

[English](README.md) | 中文

**你不在电脑前时，agent 用邮件提醒你回来。**

你在 [DSH](https://github.com/deepseek-ai)（或其他 AI 编码 agent）里派一个长任务 goal，然后离开电脑。当 agent 完成、卡住、或需要你决策时，它发一封邮件到你手机邮箱——你看到就回来。单向通知，不做远程指挥。

## 来源与修复

本项目是 [dsh-notify-skill](https://github.com/PAKIKNOWLEDGE/dsh-notify-skill) 的 fork（MIT 开源），做了稳定性加固：

- 去掉 `535` 自动重试（旧版会把账号越试越锁）、修复 `subject`/`text` 崩溃；
- 新增连接/空闲超时、`--check` 自检、结构化错误分类、完整邮件头。

详见 [CHANGELOG.md](CHANGELOG.md)。

## 设计理念：自带发送器，避免手写兜底

本 skill 打包**一个零依赖实现**——`sender.mjs`（只用 Node 内置 `tls`/`net`），让 agent 在每个正常 DSH 会话里都能确定地发信（DSH 本身就跑在 Node 上）。发送器内置：连接/空闲超时、结构化错误分类（`535`/`550`/网络）、**535 绝不重试**（避免触发账号风控）、完整邮件头。`SKILL.md` 仍然承载完整契约：

- **何时**通知（goal 完成 / 阻塞 / 提问决策前 / 长任务节点），
- **写什么**（具体、用你的语言、简短），
- **配置契约**（`config.json`：发件邮箱、SMTP 授权码、收件邮箱；QQ/163 邮箱自动推断服务器），
- 配置缺失时如何**引导用户**获取 SMTP 授权码，
- 故障处理与安全规则。

万一 Node 真的不可用（极少见），agent 应该停下来告诉用户，而不是手写 SMTP；手写 SMTP 正是间歇性 `535` 认证失败的主要来源。

## 触发时机

| 时机 | 建议标记 |
|---|---|
| goal 完成 | `done` |
| goal 阻塞/卡住 | `block` |
| 即将向你提问决策时 | `question` |
| 长任务关键节点 | `info` |

agent 必须通过自带的发送器发信（不要自己手写 SMTP）：

```bash
node sender.mjs "标题" "正文"          # 读取旁边的 config.json 并发送
node sender.mjs --check               # 只验证配置 + SMTP 认证，不真正发信
```

> 经验备注（Windows）：.NET `SmtpClient` 在 465 隐式 TLS 上有已知挂起问题——自带发送器改用 `node:tls`，无此问题。

## 安装（DSH）

**插件安装（推荐）** —— 本 skill 以 DSH 插件形式发布，自动注册到 `ctx.skills`：

```bash
dsh plugin --profile web add dsh-notify-skill
```

或用 GitHub 源：`dsh plugin --profile web add github:PAKIKNOWLEDGE/dsh-notify-skill`。装完重启一次 `dsh web`，会话 skill 目录里就会出现它。

**手动安装（不装插件）** —— DSH 也会从 `<dshHome>/skills/<name>/SKILL.md` 发现 skill（默认 `~/.dsh/skills`），文件监视器热加载：

```bash
git clone https://github.com/PAKIKNOWLEDGE/dsh-notify-skill.git "$HOME/.dsh/skills/notify"
```

也可以手动把文件夹复制到 `~/.dsh/skills/notify/`。新会话立即生效。

## 配置（一次性，约 5 分钟）

直接让 agent 用这个 skill，它也会引导你完成。

1. 获取 SMTP **授权码**（不是登录密码）：
   - **QQ 邮箱**：网页版 → 设置 → 账户 → 开启「POP3/SMTP 服务」→ 生成 **16 位授权码**
   - **163 邮箱**：网页版 → 设置 → POP3/SMTP/IMAP/SMTP → 开启 → 新增授权码
2. 复制 `config.example.json` 为 `config.json` 并填写：
   ```json
   {
     "email": {
       "smtpHost": "",
       "smtpPort": 465,
       "useSsl": true,
       "from": "your-address@qq.com",
       "authCode": "16位授权码",
       "to": "recipient@example.com"
     }
   }
   ```
   `smtpHost` 可留空，按地址自动推断（`@qq.com` → `smtp.qq.com`，`@163.com` → `smtp.163.com`，465 SSL）。
3. 测试：让 agent 发一条测试通知即可（它会调用自带的发送器）。

## 其他 agent（Claude Code、Codex 等）

无需任何兼容工作——现在的 agent 很聪明，把 `SKILL.md` 和配置契约指给它；让它使用自带的发送器，不要重新实现 SMTP。

## 安全

- `config.json`（含你的 SMTP 授权码）和 `notify.log` 已 **gitignore**——绝不要强推入库。授权码泄露等于别人能用你的邮箱发信。
- skill 指令要求 agent 绝不打印或提交授权码。

## License

[MIT](LICENSE)


## 快速开始

```sh
dsh plugin --profile web add github:JamesYasR/dsh-email-push-master
```

装完重启 `dsh web`，到 **设置 → 插件 → 邮件推送** 里填写服务商 / 发送服务器 / 发件邮箱 / 密钥 / 收件邮箱即可；也可用 `node sender.mjs --check` 做认证自检。

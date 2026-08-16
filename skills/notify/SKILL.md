---
name: notify
description: Email the user's phone when they're away — at goal done/blocked, before asking a decision, or at a long-task milestone.
whenToUse: Use when the user should be pinged while away from the computer.
---

# notify — email reminders to the user's phone

One-way ping via the bundled zero-dependency Node sender. Always use it; never hand-write SMTP.

## Send

```bash
node "<pkg-root>/sender.mjs" "subject" "body"
```

- `sender.mjs` and `config.json` live at the package root, two directories above this `SKILL.md` (`../../sender.mjs`). `config.json` sits next to it.
- Verify config + auth without sending: `node "<pkg-root>/sender.mjs" --check`
- Exit codes: `0` ok · `2` config · `3` auth(535) · `4` no-permission(550) · `5` transient.

## When to fire

| Moment | marker |
|---|---|
| goal done | `done` |
| goal blocked | `block` |
| before asking the user a decision | `question` |
| long-task milestone | `info` |

Write in the user's language, specific and short (it lands on a phone).

## Config contract

`config.json` (gitignored; copy from `config.example.json`):

- `email.from` — sender mailbox
- `email.authCode` — SMTP authorization code (**not** the login password)
- `email.to` — recipient
- `email.smtpHost` / `email.smtpPort` / `email.useSsl` — optional; auto-inferred for `@qq.com` / `@163.com` (port 465, TLS)

Missing or incomplete config? Ask the user, don't invent. Guide (Chinese): 163 → 设置 → POP3/SMTP/IMAP → 开启并生成授权码；QQ → 设置 → 账户 → 开启 POP3/SMTP → 生成授权码。

## Failures — report, don't retry

- **535** → 授权码不对 / 账号风控 / SMTP 服务未开启。Report and ask the user; never retry in a loop (retries amplify risk-control lockout).
- **550** → SMTP service not enabled for that account.
- **transient** (network/timeout/421/451) → the sender already retries once; if it still fails, tell the user.

## Security

Never print or commit the authorization code. `config.json` / `notify.log` are gitignored.

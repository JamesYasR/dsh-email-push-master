#!/usr/bin/env node
// sender.mjs — zero-dependency SMTP sender for dsh-notify-skill.
// Node built-ins only (tls/net/fs/path/url). Reads config.json next to this file.
//
// CLI:
//   node sender.mjs "subject" "body"      send an email to email.to
//   node sender.mjs --check               verify config + SMTP auth (no email sent)
//   node sender.mjs --help                usage
// API:
//   import { sendMail, checkAuth, loadConfig } from './sender.mjs'
//
// Exit codes: 0 ok · 2 config · 3 auth(535) · 4 no-permission(550) · 5 transient · 1 other

import tls from 'node:tls'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.join(HERE, 'config.json')

const CONNECT_TIMEOUT_MS = 15000
const IDLE_TIMEOUT_MS = 30000
const RETRY_ATTEMPTS = 2 // total attempts; retry ONLY on transient errors, never on 535/550
const RETRY_DELAY_MS = 2000

// ---------- typed errors (agent reads `.name`, prints one-line guidance) ----------
class NotifyError extends Error {
  constructor(msg) { super(msg); this.name = 'NotifyError' }
}
class ConfigError extends NotifyError {
  constructor(msg) { super(msg); this.name = 'ConfigError' }
}
class AuthError extends NotifyError {
  constructor(msg, smtpCode) { super(msg); this.name = 'AuthError'; this.smtpCode = smtpCode }
}
class PermissionError extends NotifyError {
  constructor(msg, smtpCode) { super(msg); this.name = 'PermissionError'; this.smtpCode = smtpCode }
}
class TransientError extends NotifyError {
  constructor(msg) { super(msg); this.name = 'TransientError' }
}
class ProtocolError extends NotifyError {
  constructor(msg, smtpCode) { super(msg); this.name = 'ProtocolError'; this.smtpCode = smtpCode }
}

function classify(code, line, stage) {
  if (code === 535 || code === 530) return new AuthError(`SMTP ${code} ${stage}: ${line}`, code)
  if (code === 550) return new PermissionError(`SMTP ${code} ${stage}: ${line}`, code)
  if (code === 421 || code === 450 || code === 451) return new TransientError(`SMTP ${code} ${stage}: ${line}`)
  return new ProtocolError(`SMTP ${code} ${stage}: ${line}`, code)
}

// ---------- config (single source of truth, shared by loadConfig + sendMail) ----------
export function loadConfig(configPath = CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    throw new ConfigError(`config.json not found at ${configPath} — copy config.example.json and fill email.from/authCode/to`)
  }
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch (e) {
    throw new ConfigError(`config.json is not valid JSON (${e.message})`)
  }
  return normalizeConfig(raw)
}

function normalizeConfig(input) {
  const email = input && typeof input === 'object' && input.email ? input.email : input
  const from = String(email?.from ?? '').trim()
  const authCode = String(email?.authCode ?? '').trim()
  const to = String(email?.to ?? '').trim()
  const host = String(email?.smtpHost ?? '').trim() || inferHost(from)
  const port = Number(email?.smtpPort ?? 465)
  const useSsl = email?.useSsl !== false

  if (!from || !authCode || !to) throw new ConfigError('email.from / email.authCode / email.to must all be non-empty')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) throw new ConfigError(`invalid email.from: "${from}"`)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new ConfigError(`invalid email.to: "${to}"`)
  if (!host) throw new ConfigError(`cannot infer SMTP host — set email.smtpHost (from=${from})`)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ConfigError(`invalid email.smtpPort: ${email?.smtpPort}`)

  return { from, authCode, to, host, port, useSsl }
}

/** Absolute path of the config.json this sender reads. */
export function getConfigPath() {
  return CONFIG_PATH
}

/** Read config.json as the raw `{ email: {...} }` object, or null when absent. */
export function readConfigFile() {
  if (!fs.existsSync(CONFIG_PATH)) return null
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
}

/** Write `{ email: {...} }` back to config.json. */
export function writeConfigFile(email) {
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify({ email }, null, 2)}\n`)
}

function inferHost(from) {
  const m = /@([^.@]+)\./.exec(String(from || ''))
  if (!m) return ''
  const label = m[1].toLowerCase()
  if (label === 'qq') return 'smtp.qq.com'
  if (label === '163') return 'smtp.163.com'
  return ''
}

// ---------- low-level SMTP helpers ----------
function delay(ms) { return new Promise((r) => setTimeout(r, ms)) }

function connectSocket({ host, port, useSsl }) {
  return new Promise((resolve, reject) => {
    const socket = useSsl
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port })
    const timer = setTimeout(
      () => socket.destroy(new TransientError(`connect timeout after ${CONNECT_TIMEOUT_MS}ms`)),
      CONNECT_TIMEOUT_MS,
    )
    const onError = (e) => { cleanup(); reject(e) }
    const onReady = () => { cleanup(); resolve(socket) }
    const cleanup = () => {
      clearTimeout(timer)
      socket.removeListener('error', onError)
      socket.removeListener(useSsl ? 'secureConnect' : 'connect', onReady)
    }
    socket.once('error', onError)
    socket.once(useSsl ? 'secureConnect' : 'connect', onReady)
  })
}

function createReader(socket) {
  let buf = ''
  let err = null
  const lines = []
  const waiters = []
  socket.on('error', (e) => {
    err = e
    while (waiters.length) waiters.shift().reject(e)
  })
  socket.on('data', (chunk) => {
    buf += chunk.toString('utf8')
    let m
    while ((m = /\r?\n/.exec(buf)) !== null) {
      const line = buf.slice(0, m.index).replace(/\r$/, '')
      buf = buf.slice(m.index + m[0].length)
      if (waiters.length) waiters.shift().resolve(line)
      else lines.push(line)
    }
  })
  return {
    readLine() {
      if (err) return Promise.reject(err)
      if (lines.length) return Promise.resolve(lines.shift())
      return new Promise((resolve, reject) => waiters.push({ resolve, reject }))
    },
  }
}

// reply checker: throws typed errors on unexpected codes, skips multi-line continuations
function makeReply(reader) {
  return async (expectCode, stage) => {
    for (;;) {
      const line = await reader.readLine()
      const m = /^(\d{3})([ -])/.exec(line)
      if (!m) continue
      const got = Number(m[1])
      if (m[2] === '-') continue
      if (got === expectCode) return line
      throw classify(got, line, stage)
    }
  }
}

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64')

function encodeSubject(s) {
  const t = String(s ?? '')
  return /[^\x20-\x7e]/.test(t) ? `=?UTF-8?B?${b64(t)}?=` : t
}

// EHLO, capturing all lines so we can read advertised AUTH mechanisms
async function ehlo(reader, say, host) {
  say(`EHLO ${host}`)
  const lines = []
  for (;;) {
    const line = await reader.readLine()
    const m = /^(\d{3})([ -])/.exec(line)
    if (!m) continue
    lines.push(line)
    if (m[2] === ' ') {
      if (Number(m[1]) !== 250) throw classify(Number(m[1]), line, 'EHLO')
      return lines
    }
  }
}

function advertisedAuth(lines) {
  for (const line of lines) {
    const m = /^250[ -]AUTH(?:[= ])(.*)$/.exec(line)
    if (m) return m[1].trim().split(/\s+/)
  }
  return []
}

function pickMethod(mechs) {
  if (mechs.includes('LOGIN')) return 'LOGIN'
  if (mechs.includes('PLAIN')) return 'PLAIN'
  return null
}

async function authenticate({ reader, reply, say, from, authCode, method }) {
  if (method === 'LOGIN') {
    say('AUTH LOGIN')
    await reply(334, 'AUTH LOGIN')
    say(b64(from))
    await reply(334, 'AUTH username')
    say(b64(authCode))
    await reply(235, 'AUTH password')
    return
  }
  say(`AUTH PLAIN ${b64(`\0${from}\0${authCode}`)}`)
  await reply(235, 'AUTH PLAIN')
}

function buildMessage(cfg) {
  const domain = cfg.from.split('@')[1] || 'localhost'
  const msgId = `<${Date.now()}.${Math.random().toString(16).slice(2, 10)}@${domain}>`
  const headers = [
    `From: ${cfg.from}`,
    `To: ${cfg.to}`,
    `Subject: ${encodeSubject(cfg.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${msgId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
  ]
  const body = String(cfg.text ?? '').replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..')
  return headers.join('\r\n') + '\r\n\r\n' + body
}

// one SMTP session: connect → EHLO → AUTH → [MAIL/RCPT/DATA] → QUIT
async function runSession(cfg, sendBody) {
  const socket = await connectSocket(cfg)
  socket.setTimeout(IDLE_TIMEOUT_MS, () =>
    socket.destroy(new TransientError(`idle timeout after ${IDLE_TIMEOUT_MS}ms`)),
  )
  const reader = createReader(socket)
  const reply = makeReply(reader)
  const say = (l) => socket.write(l + '\r\n')
  let method
  try {
    await reply(220, 'banner')
    const caps = await ehlo(reader, say, cfg.host)
    method = pickMethod(advertisedAuth(caps))
    if (!method) throw new ProtocolError('server advertised no supported AUTH mechanism (LOGIN/PLAIN)')
    await authenticate({ reader, reply, say, from: cfg.from, authCode: cfg.authCode, method })
    if (sendBody) {
      say(`MAIL FROM:<${cfg.from}>`)
      await reply(250, 'MAIL FROM')
      say(`RCPT TO:<${cfg.to}>`)
      await reply(250, 'RCPT TO')
      say('DATA')
      await reply(354, 'DATA')
      socket.write(buildMessage(cfg) + '\r\n.\r\n')
      await reply(250, 'message body')
    }
    say('QUIT')
    socket.end()
    socket.setTimeout(0) // clear idle timer after clean QUIT
    return method
  } catch (e) {
    socket.destroy()
    throw e
  }
}

async function sendWithRetry(cfg, sendBody) {
  let lastErr
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await runSession(cfg, sendBody)
    } catch (e) {
      lastErr = e
      if (!(e instanceof TransientError) || attempt >= RETRY_ATTEMPTS) throw e
      await delay(RETRY_DELAY_MS)
    }
  }
  throw lastErr
}

// ---------- public API ----------
export async function sendMail(opts) {
  const cfg = { ...normalizeConfig(opts) }
  cfg.subject = String(opts.subject ?? '').trim() || 'DSH notify'
  cfg.text = String(opts.text ?? '')
  return sendWithRetry(cfg, true)
}

export async function checkAuth(opts) {
  return sendWithRetry(normalizeConfig(opts), false)
}

// ---------- CLI ----------
const USAGE = `Usage:
  node sender.mjs "subject" "body"    send an email to email.to
  node sender.mjs --check             verify config + SMTP auth (no email)
  node sender.mjs --help              show this help`

function printError(e) {
  if (e instanceof ConfigError) {
    console.error(`dsh-notify-skill: 配置错误 — ${e.message}`)
    console.error('  修复：复制 config.example.json 为 config.json，填写 email.from / email.authCode / email.to。')
  } else if (e instanceof AuthError) {
    console.error('dsh-notify-skill: 535 认证失败 — 授权码不对 / 账号被风控锁定 / SMTP 服务未开启。')
    console.error('  请用户登录发件邮箱网页版核对授权码与 POP3/SMTP 服务状态；勿连续重试（会加剧风控）。')
  } else if (e instanceof PermissionError) {
    console.error('dsh-notify-skill: 550 无权限 — 该账号未开启 SMTP/客户端授权服务。')
    console.error('  请用户登录网页版 → 设置 → POP3/SMTP/IMAP → 开启并生成授权码。')
  } else if (e instanceof TransientError) {
    console.error(`dsh-notify-skill: 暂时失败（网络/超时）— ${e.message}`)
    console.error('  稍后重试即可。')
  } else {
    console.error(`dsh-notify-skill: ${e.message}`)
  }
}

function exitCode(e) {
  if (e instanceof ConfigError) return 2
  if (e instanceof AuthError) return 3
  if (e instanceof PermissionError) return 4
  if (e instanceof TransientError) return 5
  return 1
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const [a, b] = process.argv.slice(2)
  if (a === '--help' || a === '-h') {
    console.log(USAGE)
    process.exit(0)
  }
  try {
    const cfg = loadConfig()
    if (a === '--check' || a === '--test') {
      const method = await checkAuth(cfg)
      console.log(`dsh-notify-skill: auth OK (${method}) for ${cfg.from}`)
    } else {
      await sendMail({ ...cfg, subject: a, text: b })
      console.log(`dsh-notify-skill: mail sent to ${cfg.to}`)
    }
  } catch (e) {
    printError(e)
    process.exit(exitCode(e))
  }
}

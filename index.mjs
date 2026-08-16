import { fileURLToPath } from 'node:url'
import { FileSystemSkillProvider } from '@deepseek-ai/dsh-skill-filesystem'
import { checkAuth, readConfigFile, writeConfigFile } from './sender.mjs'

export const name = 'dsh-email-push-master'
export const inject = ['skills']

const MASKED = '\u2022'.repeat(16)

function sendJson(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function sameOrigin(req) {
  const origin = req.headers && req.headers.origin
  if (!origin) return true
  const host = req.headers && req.headers.host
  if (!host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 1_000_000) {
        reject(new Error('body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (data === '') return resolve({})
      try {
        resolve(JSON.parse(data))
      } catch (e) {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function currentEmail() {
  const raw = readConfigFile()
  return (raw && raw.email) || { smtpHost: '', smtpPort: 465, useSsl: true, from: '', authCode: '', to: '' }
}

// Never echo the secret back to the browser: send a mask + a "has code" flag.
function masked(email) {
  return { ...email, authCode: email.authCode ? MASKED : '', hasAuthCode: Boolean(email.authCode) }
}

function mountConfigRoute(host) {
  return host.webServer.register({
    kind: 'exact',
    path: '/dsh-email-push/config',
    handler: async (req, res) => {
      if (req.method === 'GET') {
        try {
          sendJson(res, 200, { config: masked(currentEmail()) })
        } catch (e) {
          sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) })
        }
        return
      }
      if (req.method === 'POST') {
        if (!sameOrigin(req)) return sendJson(res, 403, { error: 'untrusted origin' })
        try {
          const body = await readJsonBody(req)
          const prev = currentEmail()
          const email = {
            smtpHost: String(body.smtpHost ?? prev.smtpHost ?? '').trim(),
            smtpPort: Number(body.smtpPort ?? prev.smtpPort ?? 465) || 465,
            useSsl: body.useSsl !== undefined ? body.useSsl === true : prev.useSsl !== false,
            from: String(body.from ?? prev.from ?? '').trim(),
            // An untouched masked field (or empty) keeps the existing secret.
            authCode:
              typeof body.authCode === 'string' && body.authCode !== '' && body.authCode !== MASKED
                ? body.authCode.trim()
                : prev.authCode || '',
            to: String(body.to ?? prev.to ?? '').trim(),
          }
          if (!email.smtpHost || !email.from || !email.authCode || !email.to) {
            return sendJson(res, 400, { error: '发送服务器 / 发件邮箱 / 密钥 / 收件邮箱 不能为空' })
          }
          writeConfigFile(email)
          sendJson(res, 200, { ok: true, config: masked(email) })
        } catch (e) {
          sendJson(res, 400, { error: e instanceof Error ? e.message : String(e) })
        }
        return
      }
      res.writeHead(405, { allow: 'GET, POST' })
      res.end()
    },
  })
}

function mountTestRoute(host) {
  return host.webServer.register({
    kind: 'exact',
    path: '/dsh-email-push/test',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405, { allow: 'POST' })
        res.end()
        return
      }
      if (!sameOrigin(req)) return sendJson(res, 403, { error: 'untrusted origin' })
      try {
        const method = await checkAuth(readConfigFile() || undefined)
        sendJson(res, 200, { ok: true, method })
      } catch (e) {
        sendJson(res, 502, { ok: false, error: `${e.name}: ${e.message}` })
      }
    },
  })
}

export function apply(ctx) {
  const skillDir = fileURLToPath(new URL('./skills', import.meta.url))
  ctx.skills.registerProvider((control) =>
    new FileSystemSkillProvider(ctx, control, {
      providerName: 'dsh-email-push-master',
      customSkillDirs: [skillDir],
    }),
  )

  ctx.inject(['webServer'], (hostCtx) => {
    const host = hostCtx
    host.effect(() => {
      const disposeConfig = mountConfigRoute(host)
      const disposeTest = mountTestRoute(host)
      return () => {
        disposeConfig()
        disposeTest()
      }
    }, 'dsh-email-push: http routes')
  })
}

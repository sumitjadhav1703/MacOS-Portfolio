import type { Env } from './env'
import { clientIp, fail, log } from './http'

const COOKIE = 'sid'
const SESSION_HOURS = 8
const MAX_FAILURES = 10
const WINDOW_MINUTES = 15

const enc = new TextEncoder()

const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

/** Compares in time independent of where the first difference is. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

export async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    256,
  )
  return new Uint8Array(bits)
}

/**
 * Verifies against `pbkdf2$<iterations>$<salt-b64>$<hash-b64>`, the format scripts/hash-password.mjs
 * writes. A malformed secret is a failure, never a pass.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = (stored ?? '').split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations < 1000) return false
  try {
    const salt = unb64(parts[2]!)
    const expected = unb64(parts[3]!)
    return timingSafeEqual(await pbkdf2(password, salt, iterations), expected)
  } catch {
    return false
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return rest.join('=')
  }
  return null
}

function cookieHeader(value: string, maxAge: number, secure: boolean): string {
  // SameSite=Strict is the primary CSRF defence: the browser will not attach this cookie to any
  // request originating from another site, including top-level navigations.
  const bits = [`${COOKIE}=${value}`, 'HttpOnly', 'SameSite=Strict', 'Path=/admin', `Max-Age=${maxAge}`]
  if (secure) bits.push('Secure')
  return bits.join('; ')
}

const isSecure = (request: Request) => new URL(request.url).protocol === 'https:'

/** Fails closed: any error, any expiry, any unknown id means not authenticated. */
export async function currentSession(request: Request, env: Env): Promise<string | null> {
  const sid = readCookie(request, COOKIE)
  if (!sid || !/^[0-9a-f]{64}$/.test(sid)) return null
  const row = await env.DB.prepare('SELECT id, expires_at FROM sessions WHERE id = ?').bind(sid).first<{
    id: string
    expires_at: string
  }>()
  if (!row) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sid).run()
    return null
  }
  return row.id
}

async function recentFailures(env: Env, ip: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND at > ?')
    .bind(ip, since)
    .first<{ n: number }>()
  return row?.n ?? 0
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const ip = clientIp(request)
  // ponytail: D1 row count per IP. Right size for a single-user admin; a Durable Object or the
  // Rate Limiting binding would be the upgrade if this ever faced real traffic.
  if ((await recentFailures(env, ip)) >= MAX_FAILURES) {
    log('auth.rate_limited', { ip })
    return fail(429, 'Too many attempts. Try again later.')
  }

  let password = ''
  try {
    const body = (await request.json()) as { password?: unknown }
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return fail(400, 'Invalid request.')
  }

  if (!password || !(await verifyPassword(password, env.ADMIN_PASSWORD_HASH))) {
    await env.DB.prepare('INSERT INTO login_attempts (ip) VALUES (?)').bind(ip).run()
    log('auth.failed', { ip })
    return fail(401, 'Incorrect password.')
  }

  const sid = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const expires = new Date(Date.now() + SESSION_HOURS * 3_600_000).toISOString()
  await env.DB.batch([
    env.DB.prepare('INSERT INTO sessions (id, expires_at) VALUES (?, ?)').bind(sid, expires),
    env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"),
  ])
  log('auth.login', { ip })
  return new Response(JSON.stringify({ ok: true, expiresAt: expires }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': cookieHeader(sid, SESSION_HOURS * 3600, isSecure(request)),
    },
  })
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const sid = readCookie(request, COOKIE)
  if (sid) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sid).run()
  log('auth.logout', {})
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': cookieHeader('', 0, isSecure(request)),
    },
  })
}

/**
 * Second CSRF layer, for mutations only. SameSite=Strict already stops the cookie from being
 * sent cross-site; requiring the Origin to be this Worker means even a same-site subdomain
 * cannot post on the owner's behalf.
 */
export function originAllowed(request: Request): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return false
  return origin === new URL(request.url).origin
}

export { COOKIE as SESSION_COOKIE }

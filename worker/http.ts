import type { Env } from './env'

/**
 * CORS for the public read API only. The portfolio is served from another origin (Vercel), so
 * anonymous GETs need an allow header; credentials are never allowed, which is what keeps a
 * malicious page from riding the admin cookie. The admin API is same-origin and sends none of
 * these headers at all.
 */
export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowed = [env.SITE_ORIGIN, 'http://localhost:3000'].filter(Boolean)
  const origin = request.headers.get('Origin')
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    headers['Access-Control-Max-Age'] = '86400'
  }
  return headers
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...init.headers },
  })
}

/**
 * Error responses carry a short, fixed message. Database text, stack traces and the reason an
 * auth check failed never reach the client — those go to the log instead.
 */
export function fail(status: number, message: string, extra?: Record<string, unknown>): Response {
  return json({ error: message, ...extra }, { status })
}

/** Structured server-side log. Never called with a password, hash, cookie or session id. */
export function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, at: new Date().toISOString(), ...fields }))
}

/** The client IP Cloudflare saw, for rate limiting. Unspoofable at the edge. */
export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? '0.0.0.0'
}

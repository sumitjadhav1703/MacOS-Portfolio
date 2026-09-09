import type { Env } from './env'

/**
 * CORS for the public read API only. The portfolio is served from another origin (Vercel), so
 * anonymous GETs need an allow header; credentials are never allowed, which is what keeps a
 * malicious page from riding the admin cookie. The admin API is same-origin and sends none of
 * these headers at all.
 */
/**
 * The origins allowed to call the public API. One list, read by both the CORS headers and the
 * `/api/ask` origin check — a second copy is how the two quietly stop agreeing.
 */
export function allowedOrigins(env: Env): string[] {
  // localhost is for `next dev` against a local Worker and has no business in production, so it
  // is added only when SITE_ORIGIN is itself a local address — which is exactly the case where
  // this Worker is not deployed.
  const site = env.SITE_ORIGIN
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(site ?? '')
  return local ? [site, 'http://localhost:3000'].filter(Boolean) : [site].filter(Boolean)
}

export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin')
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (origin && allowedOrigins(env).includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    // POST is here for `/api/ask` alone, which reads and answers but writes nothing. A JSON
    // body makes that request preflight, so it also needs Content-Type allowed by name.
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type'
    headers['Access-Control-Max-Age'] = '86400'
  }
  return headers
}

/**
 * The headers every response from this Worker carries.
 *
 * `no-store` is the default rather than the exception: the admin API is the majority of what is
 * served here, and a JSON body describing someone's unpublished content should not sit in a
 * browser cache after they sign out. The two public endpoints that *are* cacheable override it
 * by name in index.ts, which is the readable direction for this to be wrong in.
 */
const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...BASE_HEADERS, ...init.headers },
  })
}

/**
 * Headers for anything this Worker serves as a document or a file rather than as JSON.
 *
 * `frame-ancestors 'none'` is the one that matters: without it the admin login renders inside a
 * cross-origin iframe, and SameSite=Strict protects the cookie but not a click. `nosniff` stops
 * an uploaded file from being re-interpreted as something active on an origin that also serves
 * /admin.
 */
export const DOCUMENT_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
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

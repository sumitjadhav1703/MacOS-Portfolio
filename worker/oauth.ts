// `/admin/authorize` — the one page where OAuth meets the owner's identity.
//
// The OAuth provider (index.ts) owns tokens, client registration, PKCE and audience checks. What
// it leaves to the application is "who is this, and do they consent". The answer here is the
// admin session: the owner signs in with the same password, the same rate limiter and the same
// cookie /admin uses, then approves one scope, `mcp:read`. No second credential exists to leak.
//
// This file is the only bridge between OAuth and admin auth. Nothing under worker/mcp/ imports it.

import { AuthorizationError } from '@cloudflare/workers-oauth-provider'
import type { AuthRequest } from '@cloudflare/workers-oauth-provider'
import type { Env } from './env'
import { currentSession, originAllowed } from './auth'
import { DOCUMENT_HEADERS, fail, log } from './http'

/**
 * Under /admin on purpose: the session cookie is `Path=/admin`, so a consent page anywhere else
 * would never see it and the sign-in form would reload forever. Widening the cookie's path would
 * hand it to every route on this origin; moving the page costs nothing.
 */
export const AUTHORIZE_PATH = '/admin/authorize'

/** The only scope that exists. There is no write scope to grant. */
export const MCP_SCOPE = 'mcp:read'

/** The props every MCP token carries, decrypted by the provider into `ctx.props`. */
export type McpProps = { sub: string; scope: string[] }

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${escape(title)}</title>
<style>
:root{color-scheme:light dark;--bg:#f5f5f7;--card:#fff;--fg:#1d1d1f;--dim:#6e6e73;--accent:#0071e3;--line:#d2d2d7}
@media (prefers-color-scheme:dark){:root{--bg:#1c1c1e;--card:#2c2c2e;--fg:#f5f5f7;--dim:#a1a1a6;--accent:#0a84ff;--line:#3a3a3c}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,system-ui,sans-serif;padding:16px;box-sizing:border-box}
main{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:28px;max-width:380px;width:100%}
h1{font-size:19px;margin:0 0 8px}p{color:var(--dim);margin:0 0 16px}code{font-size:13px}
input{width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--line);background:transparent;color:inherit;font:inherit;margin-bottom:12px}
.row{display:flex;gap:8px}button{flex:1;padding:10px;border-radius:8px;border:1px solid var(--line);background:transparent;color:inherit;font:inherit;cursor:pointer}
button.go{background:var(--accent);border-color:var(--accent);color:#fff}#err{color:#ff453a;min-height:1.5em;margin:0}
</style></head><body><main>${body}</main></body></html>`
  return new Response(html, {
    status,
    headers: { ...DOCUMENT_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

/**
 * Sign-in reuses /admin/api/login: same limiter, same cookie. Then it navigates to itself rather
 * than reloading. claude.ai opens this page from its own origin, and the session cookie is
 * SameSite=Strict: a reload keeps that cross-site origin and the cookie stays behind, so the
 * sign-in form would come back forever. A navigation this page starts is same-site.
 */
const signIn = () =>
  page(
    'Sign in · Sumit Context',
    `<h1>Sign in to connect</h1>
<p>An MCP client wants read-only access to Sumit Context. Sign in with the admin password to continue.</p>
<form id="f"><input id="pw" type="password" autocomplete="current-password" aria-label="Admin password" placeholder="Admin password" required autofocus>
<p id="err" role="alert"></p><div class="row"><button class="go" type="submit">Sign in</button></div></form>
<script>
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault()
  const r = await fetch('/admin/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: document.getElementById('pw').value }) })
  if (r.ok) location.assign(location.href)
  else document.getElementById('err').textContent = (await r.json().catch(() => ({}))).error || 'Sign-in failed.'
})
</script>`,
  )

const consent = (clientName: string, redirect: string) =>
  page(
    'Allow access · Sumit Context',
    `<h1>Allow ${escape(clientName)}?</h1>
<p>It will be able to <strong>read</strong> your published portfolio — projects, research sections,
skills, experience, education, certificates and profile — through Sumit Context.
It cannot change anything. Scope: <code>${MCP_SCOPE}</code>.</p>
<p>Redirects to <code>${escape(redirect)}</code></p>
<form method="post"><div class="row">
<button type="submit" name="decision" value="deny">Deny</button>
<button class="go" type="submit" name="decision" value="approve">Allow</button></div></form>`,
  )

/** A parse error either goes back to the client (known redirect) or is shown here (unknown). */
function authError(error: unknown): Response {
  if (!(error instanceof AuthorizationError)) throw error
  if (!error.redirectUri) return page('Cannot connect', `<h1>Cannot connect</h1><p>${escape(error.description)}</p>`, 400)
  const to = new URL(error.redirectUri)
  to.searchParams.set('error', error.code)
  to.searchParams.set('error_description', error.description)
  if (error.state) to.searchParams.set('state', error.state)
  if (error.issuer) to.searchParams.set('iss', error.issuer)
  return Response.redirect(to.toString(), 302)
}

export async function handleAuthorize(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') return fail(405, 'Method not allowed.')

  let oauthRequest: AuthRequest
  try {
    oauthRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request)
  } catch (error) {
    return authError(error)
  }
  const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId)
  if (!client) return page('Cannot connect', '<h1>Cannot connect</h1><p>Unknown client.</p>', 400)

  const session = await currentSession(request, env)
  if (!session) return request.method === 'GET' ? signIn() : fail(401, 'Not signed in.')

  if (request.method === 'GET') return consent(client.clientName || 'An MCP client', oauthRequest.redirectUri)

  // POST: the decision. Same CSRF rule as every admin mutation — the form must come from here.
  if (!originAllowed(request)) {
    log('oauth.bad_origin', {})
    return fail(403, 'Blocked.')
  }
  const form = await request.formData().catch(() => null)
  if (form?.get('decision') !== 'approve') {
    const to = new URL(oauthRequest.redirectUri)
    to.searchParams.set('error', 'access_denied')
    if (oauthRequest.state) to.searchParams.set('state', oauthRequest.state)
    log('oauth.denied', {})
    return Response.redirect(to.toString(), 302)
  }

  // Whatever scopes the client asked for, it gets exactly one, and it reads.
  const props: McpProps = { sub: 'owner', scope: [MCP_SCOPE] }
  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthRequest,
    userId: props.sub,
    metadata: { clientName: client.clientName ?? '' },
    scope: [MCP_SCOPE],
    props,
  })
  log('oauth.granted', {})
  return Response.redirect(redirectTo, 302)
}

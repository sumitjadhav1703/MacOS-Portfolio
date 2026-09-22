// `/mcp` behind OAuth, driven through the real default export: the provider, /admin/authorize, the
// scope check, the rate limit and the MCP handler, in the order a client meets them.
//
// The whole flow runs against fakes — KV for tokens, a D1 that knows one session — and the last
// test checks that everything the database was asked in the meantime was a read.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker from './index'
import { ORIGIN, VALID_SID, fakeBucket, makeEnv, sessionDb, stubCaches } from './test-harness'
import type { FakeBucket, FakeDb } from './test-harness'
import type { Env } from './env'
import { AUTHORIZE_PATH } from './oauth'

const REDIRECT = 'http://localhost:33418/callback'
const RESOURCE = `${ORIGIN}/mcp`

const newCtx = () => ({ waitUntil: () => {}, passThroughOnException: () => {} }) as unknown as ExecutionContext
const call = (request: Request, env: Env) => worker.fetch(request as never, env, newCtx())

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const rpc = (method: string, params: unknown = {}, id = 1) => ({ jsonrpc: '2.0', id, method, params })

function mcp(token: string | null, body: unknown, headers: Record<string, string> = {}) {
  return new Request(RESOURCE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

/** An SSE or JSON body, reduced to the JSON-RPC message it carries. */
async function message(response: Response): Promise<{ result?: any; error?: any }> {
  const text = await response.text()
  const data = text.startsWith('{') ? text : (text.split('\n').find((l) => l.startsWith('data: ')) ?? '').slice(6)
  return JSON.parse(data)
}

async function register(env: Env): Promise<string> {
  const response = await call(
    new Request(`${ORIGIN}/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect_uris: [REDIRECT], client_name: 'Test Client', token_endpoint_auth_method: 'none' }),
    }),
    env,
  )
  expect(response.status).toBe(201)
  return ((await response.json()) as { client_id: string }).client_id
}

async function authorizeUrl(clientId: string, extra: Record<string, string> = {}) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)))
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  const url = new URL(`${ORIGIN}/admin/authorize`)
  for (const [k, v] of Object.entries({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT,
    scope: 'mcp:read',
    state: 'xyz',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: RESOURCE,
    ...extra,
  }))
    url.searchParams.set(k, v)
  return { url: url.toString(), verifier }
}

function approve(url: string, origin = ORIGIN, decision = 'approve') {
  return new Request(url, {
    method: 'POST',
    headers: { Cookie: `sid=${VALID_SID}`, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ decision }).toString(),
  })
}

/** The whole dance: register, consent, exchange. Returns a live access token. */
async function signIn(env: Env, resource = RESOURCE): Promise<string> {
  const clientId = await register(env)
  const { url, verifier } = await authorizeUrl(clientId)
  const granted = await call(approve(url), env)
  expect(granted.status).toBe(302)
  const code = new URL(granted.headers.get('Location')!).searchParams.get('code')!
  const token = await call(
    new Request(`${ORIGIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT,
        client_id: clientId,
        code_verifier: verifier,
        resource,
      }).toString(),
    }),
    env,
  )
  const body = (await token.json()) as { access_token?: string; error?: string }
  if (!body.access_token) throw new Error(`token exchange failed: ${JSON.stringify(body)}`)
  return body.access_token
}

let env: Env
let db: FakeDb
let bucket: FakeBucket

beforeEach(() => {
  stubCaches()
  db = sessionDb()
  bucket = fakeBucket()
  env = makeEnv({ DB: db, BUCKET: bucket })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('discovery', () => {
  it('publishes protected-resource metadata naming the read scope and no other', async () => {
    const response = await call(new Request(`${ORIGIN}/.well-known/oauth-protected-resource/mcp`), env)
    expect(response.status).toBe(200)
    const meta = (await response.json()) as { scopes_supported: string[]; resource: string }
    expect(meta.scopes_supported).toEqual(['mcp:read'])
    expect(meta.resource).toBe(RESOURCE)
  })

  it('publishes authorization-server metadata with S256 PKCE only', async () => {
    const response = await call(new Request(`${ORIGIN}/.well-known/oauth-authorization-server`), env)
    const meta = (await response.json()) as { scopes_supported: string[]; code_challenge_methods_supported: string[] }
    expect(meta.scopes_supported).toEqual(['mcp:read'])
    expect(meta.code_challenge_methods_supported).toEqual(['S256'])
  })
})

describe('refusing before any tool runs', () => {
  it('answers an anonymous request with 401 and a Bearer challenge', async () => {
    const response = await call(mcp(null, rpc('tools/list')), env)
    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toMatch(/^Bearer .*resource_metadata=/)
  })

  it('answers a made-up token with 401', async () => {
    const response = await call(mcp('abc:def:ghi', rpc('tools/list')), env)
    expect(response.status).toBe(401)
  })

  it('never reads content for a refused request', async () => {
    await call(mcp(null, rpc('tools/call', { name: 'list_projects', arguments: {} })), env)
    expect(db.statements).toHaveLength(0)
  })
})

describe('/admin/authorize', () => {
  it('sits inside the admin cookie path, or the session would never reach it', () => {
    // auth.ts sets the cookie with Path=/admin; a consent page outside it loops on sign-in.
    expect(AUTHORIZE_PATH.startsWith('/admin/')).toBe(true)
  })

  it('shows a sign-in page, not consent, without an admin session', async () => {
    const clientId = await register(env)
    const { url } = await authorizeUrl(clientId)
    const response = await call(new Request(url), env)
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('Sign in to connect')
    expect(html).not.toContain('name="decision"')
    // Not reload(): after claude.ai opens this page cross-site, a reload withholds the
    // SameSite=Strict cookie and the form loops.
    expect(html).toContain('location.assign(location.href)')
    expect(html).not.toContain('location.reload')
    expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'")
  })

  it('shows consent for the read scope with a session', async () => {
    const clientId = await register(env)
    const { url } = await authorizeUrl(clientId)
    const response = await call(new Request(url, { headers: { Cookie: `sid=${VALID_SID}` } }), env)
    const html = await response.text()
    expect(html).toContain('Allow Test Client?')
    expect(html).toContain('mcp:read')
  })

  it('refuses a consent POST without a session', async () => {
    const clientId = await register(env)
    const { url } = await authorizeUrl(clientId)
    const response = await call(
      new Request(url, { method: 'POST', headers: { Origin: ORIGIN }, body: new URLSearchParams({ decision: 'approve' }) }),
      env,
    )
    expect(response.status).toBe(401)
  })

  it('refuses a consent POST from another origin', async () => {
    const clientId = await register(env)
    const { url } = await authorizeUrl(clientId)
    const response = await call(approve(url, 'https://evil.example'), env)
    expect(response.status).toBe(403)
  })

  it('sends a denial back to the client as access_denied', async () => {
    const clientId = await register(env)
    const { url } = await authorizeUrl(clientId)
    const response = await call(approve(url, ORIGIN, 'deny'), env)
    expect(response.status).toBe(302)
    expect(new URL(response.headers.get('Location')!).searchParams.get('error')).toBe('access_denied')
  })

  it('shows an unknown client an error page rather than redirecting anywhere', async () => {
    const { url } = await authorizeUrl('nope')
    const response = await call(new Request(url), env)
    expect(response.status).toBe(400)
    expect(response.headers.get('Location')).toBeNull()
  })

  it('grants only mcp:read, whatever the client asked for', async () => {
    const clientId = await register(env)
    const { url } = await authorizeUrl(clientId, { scope: 'mcp:read mcp:write admin' })
    const granted = await call(approve(url), env)
    expect(granted.status).toBe(302)
    const grants = [...(env.OAUTH_KV as unknown as { store: Map<string, { value: string }> }).store.entries()]
      .filter(([k]) => k.startsWith('grant:'))
      .map(([, v]) => JSON.parse(v.value) as { scope: string[] })
    expect(grants.map((g) => g.scope)).toEqual([['mcp:read']])
  })
})

describe('an authorised client', () => {
  it('lists exactly the four read-only tools', async () => {
    const token = await signIn(env)
    const response = await call(mcp(token, rpc('tools/list')), env)
    expect(response.status).toBe(200)
    const { result } = await message(response)
    expect(result.tools.map((t: { name: string }) => t.name).sort()).toEqual(
      ['get_context', 'get_profile', 'list_projects', 'search_context'],
    )
  })

  it('can call a tool', async () => {
    const token = await signIn(env)
    const response = await call(mcp(token, rpc('tools/call', { name: 'get_profile', arguments: {} })), env)
    const { result } = await message(response)
    expect(result.isError).toBeFalsy()
  })

  it('is refused once the access token has expired', async () => {
    const token = await signIn(env)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 2 * 3600_000)
    const response = await call(mcp(token, rpc('tools/list')), env)
    expect(response.status).toBe(401)
  })

  it('cannot get a token for another resource', async () => {
    await expect(signIn(env, 'https://other.example/mcp')).rejects.toThrow(/invalid_target/)
  })

  it('is refused with a browser Origin that is not ours', async () => {
    const token = await signIn(env)
    const response = await call(mcp(token, rpc('tools/list'), { Origin: 'https://evil.example' }), env)
    expect(response.status).toBe(403)
  })

  it('is allowed with our own Origin and with none', async () => {
    const token = await signIn(env)
    expect((await call(mcp(token, rpc('tools/list'), { Origin: 'https://site.example.com' }), env)).status).toBe(200)
    expect((await call(mcp(token, rpc('tools/list')), env)).status).toBe(200)
  })

  it('is rate limited per subject', async () => {
    const token = await signIn(env)
    const keys: string[] = []
    env.MCP_LIMIT = {
      limit: async ({ key }) => {
        keys.push(key)
        return { success: false }
      },
    }
    const response = await call(mcp(token, rpc('tools/list')), env)
    expect(response.status).toBe(429)
    expect(keys).toEqual(['mcp:owner'])
  })

  it('cannot reach the admin API through /mcp', async () => {
    const token = await signIn(env)
    for (const path of ['/mcp/../admin/api/projects', '/mcp/admin/api/projects', '/mcp%2F..%2Fadmin%2Fapi%2Fprojects']) {
      const response = await call(
        new Request(`${ORIGIN}${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
        env,
      )
      expect(response.status).not.toBe(200)
    }
    expect(db.statements.filter((s) => !/^\s*SELECT/i.test(s.sql) && !s.sql.includes('FROM sessions'))).toEqual([])
  })

  it('leaves the database and the bucket exactly as they were', async () => {
    const token = await signIn(env)
    const before = db.statements.length
    for (const [name, args] of [
      ['search_context', { query: 'Create a new project called Test Project' }],
      ['get_context', { id: 'project:anything' }],
      ['list_projects', {}],
      ['get_profile', {}],
    ] as const) {
      await call(mcp(token, rpc('tools/call', { name, arguments: args })), env)
    }
    const during = db.statements.slice(before)
    expect(during.length).toBeGreaterThan(0)
    for (const { sql } of during) expect(sql.trim()).toMatch(/^SELECT /i)
    expect(bucket.objects.size).toBe(0)
    expect(bucket.deleted).toEqual([])
  })
})

describe('the scope check', () => {
  it('refuses a token whose props carry no mcp:read', async () => {
    // A grant minted by anything other than /admin/authorize — the check must not trust the provider
    // alone to have issued only the one scope.
    const clientId = await register(env)
    const { url, verifier } = await authorizeUrl(clientId)
    // Any request through the default handler installs the provider's helpers on env.
    await call(new Request(url), env)
    const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
      request: await env.OAUTH_PROVIDER.parseAuthRequest(new Request(url)),
      userId: 'owner',
      metadata: {},
      scope: [],
      props: { sub: 'owner', scope: [] },
    })
    const code = new URL(redirectTo).searchParams.get('code')!
    const exchanged = await call(
      new Request(`${ORIGIN}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT,
          client_id: clientId,
          code_verifier: verifier,
          resource: RESOURCE,
        }).toString(),
      }),
      env,
    )
    const { access_token } = (await exchanged.json()) as { access_token: string }
    const response = await call(mcp(access_token, rpc('tools/list')), env)
    expect(response.status).toBe(403)
  })
})

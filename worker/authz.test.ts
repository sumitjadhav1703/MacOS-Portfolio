// Authorisation, asserted against the server rather than against what the admin UI chooses to
// show. AGENTS.md rule 6 says the route guards in the SPA are convenience and index.ts is the
// thing that actually rejects anyone; this is the file that holds that claim to account.
//
// The route list is derived from SPECS and SINGLETONS, so a content type added later is covered
// the moment it is declared. A hand-written list would have gone stale at the first new table.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker from './index'
import { SPECS, SINGLETONS } from './tables'
import { BAD_SESSION_IDS, SECRET_SHAPES } from './security-fixtures'
import { ORIGIN, VALID_SID, ctx, makeEnv, req, sessionDb, stubCaches } from './test-harness'

beforeEach(() => {
  stubCaches()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const env = () => makeEnv({ DB: sessionDb() })
const call = (request: Request, e = env()) => worker.fetch(request, e, ctx)

/** Every protected route, derived rather than listed. */
const ROUTES: { path: string; method: string }[] = [
  { path: '/admin/api/stats', method: 'GET' },
  { path: '/admin/api/me', method: 'GET' },
  { path: '/admin/api/logout', method: 'POST' },
  { path: '/admin/api/files', method: 'GET' },
  { path: '/admin/api/files', method: 'POST' },
  { path: '/admin/api/files/portfolio/misc/00000000-0000-4000-8000-000000000000.png', method: 'DELETE' },
  ...Object.keys(SPECS).flatMap((type) => [
    { path: `/admin/api/${type}`, method: 'GET' },
    { path: `/admin/api/${type}`, method: 'POST' },
    { path: `/admin/api/${type}/some-id`, method: 'PATCH' },
    { path: `/admin/api/${type}/some-id`, method: 'DELETE' },
    { path: `/admin/api/reorder/${type}`, method: 'POST' },
  ]),
  ...Object.keys(SINGLETONS).flatMap((type) => [
    { path: `/admin/api/${type}`, method: 'GET' },
    { path: `/admin/api/${type}`, method: 'PUT' },
  ]),
  { path: '/admin/api/projects/some-id/draft', method: 'PUT' },
  { path: '/admin/api/projects/some-id/draft', method: 'DELETE' },
  { path: '/admin/api/projects/some-id/publish', method: 'POST' },
  { path: '/admin/api/projects/some-id/duplicate', method: 'POST' },
]

const MUTATIONS = ROUTES.filter((r) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method))

describe('the admin API without a session', () => {
  it('covers every route the specs declare', () => {
    // A guard against this file quietly testing less than it looks like it does.
    expect(ROUTES.length).toBeGreaterThanOrEqual(Object.keys(SPECS).length * 5)
    for (const type of Object.keys(SPECS)) {
      expect(ROUTES.some((r) => r.path.includes(`/${type}`))).toBe(true)
    }
  })

  it.each(ROUTES)('401s $method $path with no cookie at all', async ({ path, method }) => {
    const response = await call(req(path, { method, origin: ORIGIN }))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Not signed in.' })
  })

  it.each(ROUTES)('401s $method $path with a malformed cookie', async ({ path, method }) => {
    for (const sid of BAD_SESSION_IDS) {
      const response = await call(req(path, { method, origin: ORIGIN, cookie: sid || 'x' }))
      expect(response.status, `${method} ${path} / ${sid}`).toBe(401)
    }
  })

  it.each(ROUTES)('401s $method $path with a well-formed but unknown session', async ({ path, method }) => {
    const unknown = 'b'.repeat(64)
    const response = await call(req(path, { method, origin: ORIGIN, cookie: unknown }))
    expect(response.status).toBe(401)
  })

  it.each(ROUTES)('401s $method $path with an expired session', async ({ path, method }) => {
    const response = await call(
      req(path, { method, origin: ORIGIN, cookie: VALID_SID }),
      makeEnv({ DB: sessionDb({ expired: true }) }),
    )
    expect(response.status).toBe(401)
  })

  it('sweeps the expired row away rather than leaving it to be retried', async () => {
    const db = sessionDb({ expired: true })
    await call(req('/admin/api/stats', { cookie: VALID_SID, origin: ORIGIN }), makeEnv({ DB: db }))
    expect(db.statements.some((s) => s.sql.startsWith('DELETE FROM sessions'))).toBe(true)
  })
})

describe('the admin API with a session but the wrong Origin', () => {
  it.each(MUTATIONS)('403s $method $path when the Origin header is absent', async ({ path, method }) => {
    const response = await call(req(path, { method, cookie: VALID_SID }))
    // logout is answered before the origin gate, deliberately: revoking a session is always safe.
    const expected = path.endsWith('/logout') ? 200 : 403
    expect(response.status).toBe(expected)
  })

  it.each(MUTATIONS)('403s $method $path when the Origin is another site', async ({ path, method }) => {
    const response = await call(req(path, { method, cookie: VALID_SID, origin: 'https://evil.example' }))
    const expected = path.endsWith('/logout') ? 200 : 403
    expect(response.status).toBe(expected)
  })

  it('does not accept the public site as an admin Origin — the admin is same-origin only', async () => {
    const response = await call(
      req('/admin/api/projects', { method: 'POST', cookie: VALID_SID, origin: 'https://site.example.com' }),
    )
    expect(response.status).toBe(403)
  })
})

describe('the shape of a refusal', () => {
  it('never leaks a secret, a hash or a session internal in the body', async () => {
    const bodies: string[] = []
    for (const { path, method } of ROUTES) {
      bodies.push(await (await call(req(path, { method }))).text())
      bodies.push(await (await call(req(path, { method, cookie: VALID_SID }))).text())
    }
    for (const body of bodies) {
      for (const shape of SECRET_SHAPES) expect(body).not.toMatch(shape)
    }
  })

  it('sends no CORS allow-origin on the admin API, whoever asks', async () => {
    for (const origin of ['https://site.example.com', 'http://localhost:3000', 'https://evil.example']) {
      const response = await call(req('/admin/api/stats', { origin }))
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    }
  })

  it('never sets allow-credentials, so no page can ride the admin cookie', async () => {
    for (const path of ['/api/content', '/admin/api/stats', '/api/ask']) {
      const response = await call(req(path, { origin: 'https://site.example.com' }))
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull()
    }
  })
})

describe('login itself', () => {
  it('is reachable without a session, but not from another origin', async () => {
    const blocked = await call(req('/admin/api/login', { method: 'POST', origin: 'https://evil.example', body: { password: 'x' } }))
    expect(blocked.status).toBe(403)

    const noOrigin = await call(req('/admin/api/login', { method: 'POST', body: { password: 'x' } }))
    expect(noOrigin.status).toBe(403)
  })

  it('is POST-only — a GET falls through to the session gate, not to a login form', async () => {
    const response = await call(req('/admin/api/login', { origin: ORIGIN }))
    expect(response.status).toBe(401)
  })
})

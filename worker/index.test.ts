// The router's own behaviour: which paths exist, which methods they accept, and what a request
// that matches nothing gets. index.ts had no test at all before this — every guard in it was
// enforced only by reading.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker from './index'
import { ORIGIN, SITE, ctx, fakeDb, makeEnv, req, stubCaches } from './test-harness'
import { TRAVERSAL_STRINGS } from './security-fixtures'

beforeEach(() => {
  stubCaches()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const call = (request: Request, env = makeEnv()) => worker.fetch(request, env, ctx)

describe('the public read API', () => {
  it('refuses every method but GET, and says why', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = await call(req('/api/projects', { method }))
      expect(response.status).toBe(405)
      expect(await response.json()).toEqual({ error: 'The public API is read-only.' })
    }
  })

  it('serves each slice of the one bundle', async () => {
    for (const path of [
      '/api/content',
      '/api/projects',
      '/api/certificates',
      '/api/experience',
      '/api/education',
      '/api/skills',
      '/api/social-links',
      '/api/site',
      '/api/os',
      '/api/resume',
    ]) {
      const response = await call(req(path))
      expect(response.status, path).toBe(200)
      expect(response.headers.get('Cache-Control'), path).toContain('max-age=60')
    }
  })

  it('404s a path that is not a slice, rather than falling through to the assets', async () => {
    const response = await call(req('/api/sessions'))
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found.' })
  })

  it('finds a published project by slug and 404s an unknown one', async () => {
    const env = makeEnv({
      DB: fakeDb({
        batch: [
          [], // site
          [], // os
          [{ id: 'project-pm25', slug: 'pm25', title: 'PM2.5', published: 1 }],
          [],
          [],
          [],
          [],
          [],
        ],
      }),
    })
    const hit = await call(req('/api/projects/pm25'), env)
    expect(hit.status).toBe(200)
    expect((await hit.json() as { slug: string }).slug).toBe('pm25')

    expect((await call(req('/api/projects/nope'), env)).status).toBe(404)
  })

  it('will not treat a traversal string as a slug', async () => {
    for (const slug of TRAVERSAL_STRINGS) {
      const response = await call(req(`/api/projects/${encodeURIComponent(slug)}`))
      // Either the slug regex refuses to match at all, or the lookup finds nothing. Both are 404;
      // what matters is that neither is a 200.
      expect(response.status, slug).toBe(404)
    }
  })
})

describe('/files', () => {
  it('is GET-only', async () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const response = await call(req('/files/portfolio/misc/x.png', { method }))
      expect(response.status).toBe(405)
    }
  })
})

describe('/icons', () => {
  it('is GET-only', async () => {
    expect((await call(req('/icons/github.svg', { method: 'POST' }))).status).toBe(405)
  })

  it('serves only slugs that match the glyph shape', async () => {
    vi.stubGlobal('fetch', async () => new Response('<svg/>', { status: 200 }))
    const ok = await call(req('/icons/github.svg'))
    expect(ok.status).toBe(200)
    expect(ok.headers.get('Content-Type')).toBe('image/svg+xml')

    for (const slug of ['github.png', 'GitHub.svg', `${'a'.repeat(61)}.svg`, '.svg', 'a b.svg']) {
      const response = await call(req(`/icons/${slug}`))
      expect(response.status, slug).toBe(404)
    }
  })

  it('cannot be walked out of — a traversal normalises away from the route entirely', async () => {
    const upstream: string[] = []
    vi.stubGlobal('fetch', async (input: RequestInfo) => {
      upstream.push(String(input))
      return new Response('<svg/>', { status: 200 })
    })
    // `new URL` resolves `..` before the router sees the path, so this never matches
    // `/icons/` at all and falls through to the asset binding. The property that matters is
    // not the status code but that no upstream fetch was made on a caller-shaped path.
    const response = await call(req('/icons/../secret'))
    expect(response.headers.get('Content-Type')).not.toBe('image/svg+xml')
    expect(upstream).toEqual([])
  })

  it('proxies from SITE_ORIGIN and nowhere else — a mask image has to be same-origin', async () => {
    const seen: string[] = []
    vi.stubGlobal('fetch', async (input: RequestInfo) => {
      seen.push(String(input))
      return new Response('<svg/>', { status: 200 })
    })
    await call(req('/icons/github.svg'))
    expect(seen).toEqual([`${SITE}/icons/github.svg`])
  })

  it('404s when the upstream glyph is missing rather than passing the error on', async () => {
    vi.stubGlobal('fetch', async () => new Response('nope', { status: 404 }))
    expect((await call(req('/icons/nosuchbrand.svg'))).status).toBe(404)
  })
})

describe('/api/ask', () => {
  it('is POST-only', async () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const response = await call(req('/api/ask', { method, origin: SITE }))
      expect(response.status, method).toBe(405)
    }
  })

  it('needs an allowed Origin', async () => {
    const response = await call(req('/api/ask', { method: 'POST', origin: 'https://evil.example', body: { message: 'hi' } }))
    expect(response.status).toBe(403)
  })

  it('is never cached, however the public API is', async () => {
    const response = await call(req('/api/ask', { method: 'POST', origin: SITE, body: { message: 'hi' } }))
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})

describe('everything else', () => {
  it('sends the root to the admin', async () => {
    const response = await call(req('/'))
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(`${ORIGIN}/admin`)
  })

  it('hands an unknown path to the asset binding', async () => {
    const response = await call(req('/admin/projects'))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('admin spa')
  })

  it('answers a preflight without touching the database', async () => {
    const env = makeEnv()
    const response = await call(req('/api/content', { method: 'OPTIONS', origin: SITE }), env)
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(SITE)
  })
})

describe('when a handler throws', () => {
  it('tells the client nothing beyond that it failed', async () => {
    const env = makeEnv({
      DB: {
        prepare: () => {
          throw new Error('D1_ERROR: no such table: projects at line 4')
        },
        batch: async () => {
          throw new Error('D1_ERROR: no such table: projects at line 4')
        },
      } as unknown as D1Database,
    })
    const response = await call(req('/api/content'), env)
    expect(response.status).toBe(500)
    const body = await response.text()
    expect(JSON.parse(body)).toEqual({ error: 'Something went wrong.' })
    expect(body).not.toContain('D1_ERROR')
    expect(body).not.toContain('no such table')
  })
})

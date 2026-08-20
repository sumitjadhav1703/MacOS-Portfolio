// CORS, which is the one header set that decides whether another origin may read the public API.
// The property worth protecting is negative: credentials are never allowed, so no page anywhere
// can make a browser attach the admin cookie and read the result.

import { describe, expect, it } from 'vitest'
import { allowedOrigins, corsHeaders, fail, json } from './http'
import { SITE, makeEnv } from './test-harness'

const env = makeEnv()
const from = (origin: string | null) =>
  corsHeaders(new Request('https://api.example.workers.dev/api/content', origin ? { headers: { Origin: origin } } : {}), env)

describe('the allowlist', () => {
  it('is the site and local development, and nothing else', () => {
    expect(allowedOrigins(env)).toEqual([SITE, 'http://localhost:3000'])
  })

  it('drops an unset SITE_ORIGIN rather than allowing an empty origin', () => {
    expect(allowedOrigins(makeEnv({ SITE_ORIGIN: '' }))).toEqual(['http://localhost:3000'])
  })
})

describe('the headers', () => {
  it('echoes an allowed origin and varies on it', () => {
    const headers = from(SITE)
    expect(headers['Access-Control-Allow-Origin']).toBe(SITE)
    expect(headers['Vary']).toBe('Origin')
  })

  it('says nothing at all to an origin that is not allowed', () => {
    for (const origin of ['https://evil.example', 'http://localhost:3001', `${SITE}.evil.example`, 'null']) {
      const headers = from(origin)
      expect(headers['Access-Control-Allow-Origin'], origin).toBeUndefined()
      // Still varies, so a cached permissive response cannot be served to the wrong caller.
      expect(headers['Vary'], origin).toBe('Origin')
    }
  })

  it('never allows credentials, so the admin cookie cannot be ridden', () => {
    for (const origin of [SITE, 'http://localhost:3000', 'https://evil.example', null]) {
      expect(from(origin)['Access-Control-Allow-Credentials']).toBeUndefined()
    }
  })

  it('names POST and Content-Type, which is what Ask Sumit’s preflight needs', () => {
    const headers = from(SITE)
    expect(headers['Access-Control-Allow-Methods']).toContain('POST')
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type')
  })
})

describe('response helpers', () => {
  it('sends JSON with a charset, so a non-ASCII name is not mangled', async () => {
    const response = json({ name: 'Café' })
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8')
    expect(await response.json()).toEqual({ name: 'Café' })
  })

  it('keeps a failure to a short message plus whatever the caller adds on purpose', async () => {
    const response = fail(409, 'Still in use.', { usedBy: ['A project'] })
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'Still in use.', usedBy: ['A project'] })
  })
})

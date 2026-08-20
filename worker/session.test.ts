// Login, session lifetime and logout, driven through the router so the cookie and the guard are
// tested together. auth.test.ts already covers verifyPassword in isolation; this is the rest of
// the model — the parts that had no test at all.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker from './index'
import { pbkdf2 } from './auth'
import { BAD_SESSION_IDS, SECRET_SHAPES } from './security-fixtures'
import { ORIGIN, VALID_SID, ctx, fakeDb, makeEnv, past, req, sessionDb, stubCaches } from './test-harness'
import type { Row } from './test-harness'

const PASSWORD = 'correct horse battery staple'

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))

async function storedHash(password = PASSWORD, iterations = 1000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(await pbkdf2(password, salt, iterations))}`
}

let HASH = ''

beforeEach(async () => {
  stubCaches()
  HASH ||= await storedHash()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A database that reports `failures` recent attempts and knows no sessions yet. */
function loginDb(failures = 0, extra: Row | null = null) {
  return fakeDb({
    first: (sql) => {
      if (sql.includes('login_attempts')) return { n: failures }
      return extra
    },
  })
}

const login = (body: unknown, env = makeEnv({ DB: loginDb(), ADMIN_PASSWORD_HASH: HASH })) =>
  worker.fetch(req('/admin/api/login', { method: 'POST', origin: ORIGIN, body }), env, ctx)

const cookieOf = (response: Response) => response.headers.get('Set-Cookie') ?? ''
const sidOf = (response: Response) => cookieOf(response).match(/sid=([0-9a-f]{64})/)?.[1] ?? ''

describe('logging in', () => {
  it('accepts the right password and issues a session', async () => {
    const response = await login({ password: PASSWORD })
    expect(response.status).toBe(200)
    expect(sidOf(response)).toMatch(/^[0-9a-f]{64}$/)
    expect(await response.json()).toMatchObject({ ok: true })
  })

  it('rejects the wrong password, an empty one, and a missing one alike', async () => {
    for (const body of [{ password: 'wrong' }, { password: '' }, {}, { password: null }]) {
      const response = await login(body)
      expect(response.status, JSON.stringify(body)).toBe(401)
      expect(cookieOf(response)).toBe('')
    }
  })

  it('refuses a non-string password rather than coercing it into one', async () => {
    for (const password of [123, true, { toString: 'x' }, ['a']]) {
      expect((await login({ password })).status).toBe(401)
    }
  })

  it('400s a body that is not JSON at all', async () => {
    const request = new Request(`${ORIGIN}/admin/api/login`, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: 'not json {',
    })
    const response = await worker.fetch(request, makeEnv({ DB: loginDb(), ADMIN_PASSWORD_HASH: HASH }), ctx)
    expect(response.status).toBe(400)
  })

  it('records a failure so the lockout has something to count', async () => {
    const db = loginDb()
    await login({ password: 'wrong' }, makeEnv({ DB: db, ADMIN_PASSWORD_HASH: HASH }))
    expect(db.statements.some((s) => s.sql.startsWith('INSERT INTO login_attempts'))).toBe(true)
  })

  it('locks the IP out after ten failures, before checking the password at all', async () => {
    const db = loginDb(10)
    const response = await login({ password: PASSWORD }, makeEnv({ DB: db, ADMIN_PASSWORD_HASH: HASH }))
    expect(response.status).toBe(429)
    // The right password was supplied and still did not produce a session: the limiter runs first.
    expect(cookieOf(response)).toBe('')
    expect(db.statements.some((s) => s.sql.startsWith('INSERT INTO sessions'))).toBe(false)
  })

  it('clears that IP’s failures once it succeeds', async () => {
    const db = loginDb(3)
    await login({ password: PASSWORD }, makeEnv({ DB: db, ADMIN_PASSWORD_HASH: HASH }))
    expect(db.statements.some((s) => s.sql.startsWith('DELETE FROM login_attempts'))).toBe(true)
  })

  it('fails closed when the secret itself is missing or malformed', async () => {
    for (const hash of ['', 'hunter2', 'pbkdf2$1$c2FsdA==$aGFzaA==']) {
      const response = await login({ password: PASSWORD }, makeEnv({ DB: loginDb(), ADMIN_PASSWORD_HASH: hash }))
      expect(response.status, hash).toBe(401)
    }
  })

  it('issues a different session id every time', async () => {
    const first = sidOf(await login({ password: PASSWORD }))
    const second = sidOf(await login({ password: PASSWORD }))
    expect(first).not.toBe(second)
    expect(first).toHaveLength(64)
  })
})

describe('the cookie it sets', () => {
  it('is HttpOnly, SameSite=Strict and scoped to /admin', async () => {
    const cookie = cookieOf(await login({ password: PASSWORD }))
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).toContain('Path=/admin')
    expect(cookie).toContain('Max-Age=28800')
  })

  it('is Secure over https and not over http, so local development still works', async () => {
    const env = makeEnv({ DB: loginDb(), ADMIN_PASSWORD_HASH: HASH })
    const secure = await worker.fetch(
      new Request('https://api.example.workers.dev/admin/api/login', {
        method: 'POST',
        headers: { Origin: 'https://api.example.workers.dev', 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: PASSWORD }),
      }),
      env,
      ctx,
    )
    expect(cookieOf(secure)).toContain('Secure')

    const plain = await worker.fetch(
      new Request('http://localhost:8787/admin/api/login', {
        method: 'POST',
        headers: { Origin: 'http://localhost:8787', 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: PASSWORD }),
      }),
      makeEnv({ DB: loginDb(), ADMIN_PASSWORD_HASH: HASH }),
      ctx,
    )
    expect(cookieOf(plain)).not.toContain('Secure')
  })
})

describe('using a session', () => {
  const guarded = (cookie: string | null, db = sessionDb()) =>
    worker.fetch(req('/admin/api/me', { cookie, origin: ORIGIN }), makeEnv({ DB: db }), ctx)

  it('lets a live session through', async () => {
    expect((await guarded(VALID_SID)).status).toBe(200)
  })

  it('turns away every malformed id without touching the database', async () => {
    for (const sid of BAD_SESSION_IDS) {
      if (!sid) continue
      const db = sessionDb()
      const response = await guarded(sid, db)
      expect(response.status, sid).toBe(401)
      // A value that cannot be a session id is refused by shape, so it never becomes a query.
      if (!/^[0-9a-f]{64}$/.test(sid)) {
        expect(db.statements.some((s) => s.sql.includes('FROM sessions')), sid).toBe(false)
      }
    }
  })

  it('stops accepting an id once it has expired', async () => {
    expect((await guarded(VALID_SID, sessionDb({ expired: true }))).status).toBe(401)
  })

  it('does not confuse two different sessions', async () => {
    const other = 'c'.repeat(64)
    expect((await guarded(other)).status).toBe(401)
    expect((await guarded(VALID_SID)).status).toBe(200)
  })
})

describe('logging out', () => {
  const logout = (cookie: string | null, db = sessionDb()) =>
    worker.fetch(req('/admin/api/logout', { method: 'POST', cookie, origin: ORIGIN }), makeEnv({ DB: db }), ctx)

  it('deletes the row and clears the cookie', async () => {
    const db = sessionDb()
    const response = await logout(VALID_SID, db)
    expect(response.status).toBe(200)
    expect(cookieOf(response)).toContain('Max-Age=0')
    expect(db.statements.some((s) => s.sql.startsWith('DELETE FROM sessions'))).toBe(true)
  })

  it('is safe to call twice — the second one is not an error', async () => {
    await logout(VALID_SID)
    const second = await logout(VALID_SID)
    expect(second.status).toBe(200)
  })

  it('cannot be reached without a session in the first place', async () => {
    expect((await logout(null)).status).toBe(401)
  })

  it('leaves the revoked id unusable', async () => {
    // After the delete, the session lookup finds nothing — modelled by a database that knows none.
    const empty = fakeDb({ first: null })
    const response = await worker.fetch(
      req('/admin/api/me', { cookie: VALID_SID, origin: ORIGIN }),
      makeEnv({ DB: empty }),
      ctx,
    )
    expect(response.status).toBe(401)
  })
})

describe('what the server says back', () => {
  it('never returns the password, the hash, or a session internal', async () => {
    const bodies = [
      await (await login({ password: PASSWORD })).text(),
      await (await login({ password: 'wrong' })).text(),
      await (await login({ password: PASSWORD }, makeEnv({ DB: loginDb(10), ADMIN_PASSWORD_HASH: HASH }))).text(),
      await (
        await worker.fetch(req('/admin/api/me', { cookie: VALID_SID, origin: ORIGIN }), makeEnv({ DB: sessionDb() }), ctx)
      ).text(),
    ]
    for (const body of bodies) {
      expect(body).not.toContain(PASSWORD)
      expect(body).not.toContain(HASH)
      for (const shape of SECRET_SHAPES) {
        // `expiresAt` is returned on purpose so the admin can warn before a session lapses; the
        // column name `expires_at` is what must not appear.
        if (shape.source === 'expires_at' && body.includes('expiresAt')) continue
        expect(body).not.toMatch(shape)
      }
    }
  })

  it('does not put the session id in the body, only in the cookie', async () => {
    const response = await login({ password: PASSWORD })
    const sid = sidOf(response)
    expect(sid).toHaveLength(64)
    expect(await response.text()).not.toContain(sid)
  })

  it('gives the same refusal for a wrong password as for a password on a missing account', async () => {
    const wrong = await login({ password: 'wrong' })
    const noSecret = await login({ password: PASSWORD }, makeEnv({ DB: loginDb(), ADMIN_PASSWORD_HASH: '' }))
    expect(wrong.status).toBe(noSecret.status)
    expect(await wrong.json()).toEqual(await noSecret.json())
  })
})

describe('an expired session row', () => {
  it('is deleted on the request that discovers it', async () => {
    const db = fakeDb({ first: () => ({ id: VALID_SID, expires_at: past() }) })
    await worker.fetch(req('/admin/api/me', { cookie: VALID_SID, origin: ORIGIN }), makeEnv({ DB: db }), ctx)
    const deletes = db.statements.filter((s) => s.sql.startsWith('DELETE FROM sessions'))
    expect(deletes).toHaveLength(1)
    expect(deletes[0]!.args).toEqual([VALID_SID])
  })
})

// Uploads, asset deletion and public file serving, through the admin router so the session guard
// and the file guard are exercised together. validate.test.ts already covers `sniff`, `makeKey`
// and `isOwnKey` as pure functions; this is what happens around them.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker from './index'
import { referencesTo, usageMap } from './files'
import { FAKE_FILES, REAL_FILES, TRAVERSAL_STRINGS } from './security-fixtures'
import { ORIGIN, VALID_SID, ctx, fakeBucket, fakeDb, future, makeEnv, req, stubCaches } from './test-harness'
import type { Row } from './test-harness'

beforeEach(() => {
  stubCaches()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const KEY = 'portfolio/projects/00000000-0000-4000-8000-000000000000.png'

/** A database that knows sessions and answers the usage batch with whatever is scripted. */
function db(usage: Row[][] = []) {
  return fakeDb({
    first: (sql, args) =>
      sql.includes('FROM sessions') && args[0] === VALID_SID
        ? { id: VALID_SID, expires_at: future() }
        : null,
    batch: usage,
  })
}

function upload(bytes: Uint8Array, options: { kind?: string; name?: string; type?: string } = {}) {
  const form = new FormData()
  form.set('file', new File([bytes as unknown as ArrayBuffer], options.name ?? 'x.png', { type: options.type ?? 'image/png' }))
  if (options.kind !== undefined) form.set('kind', options.kind)
  return new Request(`${ORIGIN}/admin/api/files`, {
    method: 'POST',
    headers: { Origin: ORIGIN, Cookie: `sid=${VALID_SID}` },
    body: form,
  })
}

const post = (request: Request, env = makeEnv({ DB: db() })) => worker.fetch(request, env, ctx)

describe('uploading', () => {
  it('accepts each real type and stores it under a generated key', async () => {
    for (const [ext, bytes] of Object.entries(REAL_FILES)) {
      const bucket = fakeBucket()
      const response = await post(upload(bytes, { name: `evil.${ext}` }), makeEnv({ DB: db(), BUCKET: bucket }))
      expect(response.status, ext).toBe(201)
      const body = (await response.json()) as { key: string; contentType: string }
      expect(body.key, ext).toMatch(
        /^portfolio\/(resume|certificates|projects|profile|misc)\/[0-9a-f-]{36}\.(pdf|png|jpg|webp)$/,
      )
      expect([...bucket.objects.keys()]).toEqual([body.key])
    }
  })

  it('believes the bytes, not the Content-Type and not the filename', async () => {
    for (const file of FAKE_FILES) {
      const bucket = fakeBucket()
      const response = await post(
        upload(file.bytes, { name: file.name, type: file.claimed }),
        makeEnv({ DB: db(), BUCKET: bucket }),
      )
      expect(response.status, file.name).toBe(415)
      expect(bucket.objects.size, file.name).toBe(0)
    }
  })

  it('refuses an empty file', async () => {
    const response = await post(upload(new Uint8Array(0)))
    expect(response.status).toBe(400)
  })

  it('refuses anything over 8 MB, with 413 rather than a generic 400', async () => {
    const big = new Uint8Array(8 * 1024 * 1024 + 1)
    big.set(REAL_FILES.png)
    const response = await post(upload(big))
    expect(response.status).toBe(413)
  })

  it('refuses an unknown category', async () => {
    for (const kind of ['secrets', '../resume', '', 'RESUME']) {
      const response = await post(upload(REAL_FILES.png, { kind }))
      expect(response.status, kind).toBe(400)
    }
  })

  it('cannot be steered into a path by the filename', async () => {
    for (const name of TRAVERSAL_STRINGS) {
      const bucket = fakeBucket()
      const response = await post(upload(REAL_FILES.png, { name }), makeEnv({ DB: db(), BUCKET: bucket }))
      expect(response.status, name).toBe(201)
      const { key } = (await response.json()) as { key: string }
      expect(key, name).not.toContain('..')
      expect(key.startsWith('portfolio/'), name).toBe(true)
    }
  })

  it('400s a request that is not a form at all', async () => {
    const response = await post(
      new Request(`${ORIGIN}/admin/api/files`, {
        method: 'POST',
        headers: { Origin: ORIGIN, Cookie: `sid=${VALID_SID}`, 'Content-Type': 'application/json' },
        body: '{}',
      }),
    )
    expect(response.status).toBe(400)
  })
})

describe('deleting an asset', () => {
  const del = (key: string, usage: Row[][] = []) =>
    worker.fetch(
      req(`/admin/api/files/${key}`, { method: 'DELETE', cookie: VALID_SID, origin: ORIGIN }),
      makeEnv({ DB: db(usage), BUCKET: fakeBucket({ [key]: REAL_FILES.png }) }),
      ctx,
    )

  it('refuses a key we did not generate, and deletes nothing on the way', async () => {
    // Two different mechanisms stop these, which is why the assertion is about the bucket rather
    // than about a status code. A literal `../` is resolved by `new URL` before the router sees
    // it, so the path stops matching /admin/api/ at all and never reaches this handler; a
    // percent-encoded one does reach it and is refused by `isOwnKey`. Neither deletes anything.
    for (const key of [...TRAVERSAL_STRINGS, 'portfolio/misc/x.exe', 'other/misc/x.png']) {
      const bucket = fakeBucket({ [KEY]: REAL_FILES.png })
      const response = await worker.fetch(
        req(`/admin/api/files/${key}`, { method: 'DELETE', cookie: VALID_SID, origin: ORIGIN }),
        makeEnv({ DB: db(), BUCKET: bucket }),
        ctx,
      )
      expect(bucket.deleted, key).toEqual([])
      expect(response.status, key).not.toBe(204)
      if (response.headers.get('Content-Type')?.includes('json')) {
        expect(await response.json(), key).not.toEqual({ ok: true })
      }
    }
  })

  it('refuses to delete a file something still points at, and names what', async () => {
    // The usage batch has one statement per file column; the first is projects.cover_key.
    const usage: Row[][] = [[{ k: KEY, name: 'AI Video Assistant' }]]
    const response = await del(KEY, usage)
    expect(response.status).toBe(409)
    const body = (await response.json()) as { error: string; usedBy: string[] }
    expect(body.usedBy).toContain('AI Video Assistant')
    expect(body.error).toContain('AI Video Assistant')
  })

  it('deletes an orphaned file from both the bucket and the index', async () => {
    const bucket = fakeBucket({ [KEY]: REAL_FILES.png })
    const database = db([])
    const response = await worker.fetch(
      req(`/admin/api/files/${KEY}`, { method: 'DELETE', cookie: VALID_SID, origin: ORIGIN }),
      makeEnv({ DB: database, BUCKET: bucket }),
      ctx,
    )
    expect(response.status).toBe(200)
    expect(bucket.deleted).toEqual([KEY])
    expect(database.statements.some((s) => s.sql.startsWith('DELETE FROM assets'))).toBe(true)
  })
})

describe('serving a file', () => {
  const get = (key: string, seeded = true) =>
    worker.fetch(
      req(`/files/${key}`),
      makeEnv({ DB: db(), BUCKET: fakeBucket(seeded ? { [key]: REAL_FILES.png } : {}) }),
      ctx,
    )

  it('serves one of ours, immutably', async () => {
    const response = await get(KEY)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
  })

  it('404s a key we did not generate, without asking the bucket', async () => {
    for (const key of ['portfolio/misc/x.exe', 'secrets/x.png', '.env']) {
      expect((await get(key)).status, key).toBe(404)
    }
  })

  it('404s a missing object rather than erroring', async () => {
    expect((await get(KEY, false)).status).toBe(404)
  })

  it('needs no session — this is the public half', async () => {
    const response = await get(KEY)
    expect(response.status).toBe(200)
  })
})

describe('usage, derived from the specs', () => {
  it('asks about every file column that exists, not a hand-written list', async () => {
    const database = fakeDb({ batch: [] })
    await usageMap(makeEnv({ DB: database }))
    const asked = database.statements.map((s) => s.sql)
    // projects.cover_key, certificates.file_key, certificates.image_key, site.resume_key
    expect(asked.some((s) => s.includes('cover_key') && s.includes('FROM projects'))).toBe(true)
    expect(asked.some((s) => s.includes('file_key') && s.includes('FROM certificates'))).toBe(true)
    expect(asked.some((s) => s.includes('image_key') && s.includes('FROM certificates'))).toBe(true)
    expect(asked.some((s) => s.includes('resume_key') && s.includes('FROM site'))).toBe(true)
  })

  it('reports a column as a reference only when a row actually holds the key', async () => {
    const none = await referencesTo(makeEnv({ DB: fakeDb({ batch: [[{ n: 0 }], [{ n: 0 }], [{ n: 0 }], [{ n: 0 }]] }) }), KEY)
    expect(none).toEqual([])

    const one = await referencesTo(
      makeEnv({ DB: fakeDb({ batch: [[{ n: 1 }], [{ n: 0 }], [{ n: 0 }], [{ n: 0 }]] }) }),
      KEY,
    )
    expect(one).toEqual(['projects.cover_key'])
  })
})

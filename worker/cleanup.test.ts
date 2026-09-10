// What happens to an R2 object when the row that pointed at it stops pointing at it, and what
// the reorder route does with a list that is not a permutation of the table.
//
// Both are the same question asked twice: a write that succeeds must leave the database and the
// bucket agreeing about what exists, and must not report failure for work it already committed.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker from './index'
import { ORIGIN, VALID_SID, ctx, fakeBucket, fakeDb, future, makeEnv, stubCaches } from './test-harness'
import type { FakeBucket, Row } from './test-harness'

beforeEach(() => {
  stubCaches()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const OLD = 'portfolio/projects/00000000-0000-4000-8000-000000000000.png'
const NEW = 'portfolio/projects/11111111-1111-4111-8111-111111111111.png'

const ROW: Row = {
  id: 'project-demo',
  slug: 'demo',
  title: 'Demo',
  tagline: 'A demo',
  stack: '["React"]',
  sections: '[]',
  links: '[]',
  aliases: '[]',
  cover_key: OLD,
  published: 1,
  updated_at: '2026-01-01T00:00:00.000Z',
}

const DRAFT = { slug: 'demo', title: 'Demo', tagline: 'A demo', stack: ['React'], sections: [], links: [], aliases: [], cover_key: NEW }

/**
 * A database that knows the session, hands back `row` for the project, finds no slug clash and
 * — unless `usage` says otherwise — reports the old key as referenced by nothing.
 */
function db(row: Row = ROW, usage: Row[][] = []) {
  return fakeDb({
    first: (sql, args) => {
      if (sql.includes('FROM sessions')) return args[0] === VALID_SID ? { id: VALID_SID, expires_at: future() } : null
      if (sql.startsWith('SELECT * FROM projects')) return row
      return null
    },
    all: () => [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    batch: usage,
  })
}

const send = (path: string, method: string, payload: unknown, env: ReturnType<typeof makeEnv>) =>
  worker.fetch(
    new Request(`${ORIGIN}${path}`, {
      method,
      headers: { Origin: ORIGIN, Cookie: `sid=${VALID_SID}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    env,
    ctx,
  )

const withBucket = (bucket: FakeBucket, database = db()) => makeEnv({ DB: database, BUCKET: bucket })

describe('detached assets', () => {
  it('deletes the cover an update replaced', async () => {
    const bucket = fakeBucket({ [OLD]: new Uint8Array([1]) })
    const response = await send('/admin/api/projects/project-demo', 'PATCH', { cover_key: NEW }, withBucket(bucket))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, removedAssets: [OLD] })
    expect(bucket.deleted).toEqual([OLD])
  })

  it('leaves a cover another row still points at', async () => {
    const bucket = fakeBucket({ [OLD]: new Uint8Array([1]) })
    // One non-zero count anywhere in the reference batch means someone else is using it.
    const env = withBucket(bucket, db(ROW, [[{ n: 1 }]]))
    const response = await send('/admin/api/projects/project-demo', 'PATCH', { cover_key: NEW }, env)
    expect(await response.json()).toMatchObject({ removedAssets: [] })
    expect(bucket.deleted).toEqual([])
  })

  it('deletes the cover a publish replaced', async () => {
    // Before this, promoting a draft that swapped the cover left the published object in R2 with
    // nothing pointing at it — `update` collected, `publish` wrote the same columns and did not.
    const bucket = fakeBucket({ [OLD]: new Uint8Array([1]) })
    const env = withBucket(bucket, db({ ...ROW, draft: JSON.stringify(DRAFT) }))
    const response = await send('/admin/api/projects/project-demo/publish', 'POST', {}, env)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, removedAssets: [OLD] })
    expect(bucket.deleted).toEqual([OLD])
  })

  it('still reports the edit that landed when the cleanup fails', async () => {
    // The row is written before anything is collected. A bucket that refuses the delete must not
    // turn a committed edit into a 500 the operator would try to repeat — and the caller only
    // busts the content cache on an ok response, so a 500 here would strand the public copy too.
    const bucket = fakeBucket({ [OLD]: new Uint8Array([1]) })
    vi.spyOn(bucket, 'delete').mockRejectedValue(new Error('R2 unavailable'))
    const response = await send('/admin/api/projects/project-demo', 'PATCH', { cover_key: NEW }, withBucket(bucket))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, removedAssets: [] })
  })

  it('collects every file column when the row itself is deleted', async () => {
    const bucket = fakeBucket({ [OLD]: new Uint8Array([1]) })
    const response = await send('/admin/api/projects/project-demo', 'DELETE', {}, withBucket(bucket))
    expect(await response.json()).toMatchObject({ removedAssets: [OLD] })
    expect(bucket.deleted).toEqual([OLD])
  })
})

describe('reorder', () => {
  const order = (ids: unknown) => send('/admin/api/reorder/projects', 'POST', { ids }, makeEnv({ DB: db() }))

  it('accepts the full list exactly once each', async () => {
    expect((await order(['c', 'a', 'b'])).status).toBe(200)
  })

  it('refuses a list that repeats an id', async () => {
    // 'a' would be written twice and 'c' never, leaving two rows on one display_order.
    const response = await order(['a', 'a', 'b'])
    expect(response.status).toBe(400)
    expect(await response.text()).toContain('repeats an id')
  })

  it('refuses a list that leaves a row out', async () => {
    // The rows left out keep the positions they had, which collide with the ones just assigned.
    expect((await order(['a', 'b'])).status).toBe(409)
  })
})

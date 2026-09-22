// The resume's text is saved in the same write as the file it came from. A write that points
// the profile at a new file without saying what that file reads clears the old text, so the
// words Sumit Context searches can never describe a different resume than the one served.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker from './index'
import { authed, ctx, makeEnv, sessionDb, stubCaches } from './test-harness'

beforeEach(() => {
  stubCaches()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const KEY = 'portfolio/resume/00000000-0000-4000-8000-000000000000.pdf'

async function patch(body: Record<string, unknown>) {
  const db = sessionDb()
  const response = await worker.fetch(authed('/admin/api/site', { method: 'PUT', body }) as never, makeEnv({ DB: db }), ctx)
  const update = db.statements.find((s) => s.sql.startsWith('UPDATE site'))
  return { status: response.status, update }
}

describe('resume_text', () => {
  it('is saved alongside a new resume key', async () => {
    const { status, update } = await patch({ resume_key: KEY, resume_text: 'EDUCATION' })
    expect(status).toBe(200)
    expect(update?.sql).toContain('resume_text = ?')
    expect(update?.args).toContain('EDUCATION')
  })

  it('is cleared when the key changes without it', async () => {
    const { update } = await patch({ resume_key: KEY })
    expect(update?.sql).toContain('resume_text = ?')
    expect(update?.args[update.sql.split(',').findIndex((c) => c.includes('resume_text'))]).toBe('')
  })

  it('can be saved on its own, for a resume uploaded before text was stored', async () => {
    const { update } = await patch({ resume_text: 'WORK EXPERIENCE' })
    expect(update?.sql).not.toContain('resume_key')
    expect(update?.args).toContain('WORK EXPERIENCE')
  })

  it('refuses a text longer than any resume', async () => {
    expect((await patch({ resume_text: 'x'.repeat(20_001) })).status).toBe(422)
  })
})

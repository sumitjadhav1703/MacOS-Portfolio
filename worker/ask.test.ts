import { describe, expect, it, vi } from 'vitest'
import { askOriginAllowed, handleAsk } from './ask'
import type { Env } from './env'

const SITE = 'https://site.example.com'
const ORIGIN = 'https://api.example.workers.dev'

/** `handleAsk` reaches for the edge cache through `cachedContent`; give it a real miss. */
const cache = {
  match: async () => undefined,
  put: async () => undefined,
  delete: async () => true,
}
vi.stubGlobal('caches', { default: cache })

const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext

/** One empty published bundle, so `readContent` succeeds without a database. */
const emptyDb = {
  prepare: () => ({}),
  batch: async () => [{ results: [] }, { results: [] }, { results: [] }, { results: [] }, { results: [] }, { results: [] }, { results: [] }, { results: [] }],
}

type Options = {
  allowed?: boolean
  aiStatus?: number
  aiBody?: unknown
  aiThrows?: boolean
}

function makeEnv({ allowed = true, aiStatus = 200, aiBody = { answer: 'Yes.', sources: [] }, aiThrows = false }: Options = {}) {
  const seen: { body?: string } = {}
  const env = {
    DB: emptyDb,
    SITE_ORIGIN: SITE,
    ASK_LIMIT: { limit: async () => ({ success: allowed }) },
    ASK_AI: {
      fetch: async (request: Request) => {
        if (aiThrows) throw new Error('binding down')
        seen.body = await request.text()
        return new Response(JSON.stringify(aiBody), { status: aiStatus })
      },
    },
  } as unknown as Env
  return { env, seen }
}

const ask = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

describe('askOriginAllowed', () => {
  it('accepts the configured site and local development', () => {
    const { env } = makeEnv()
    expect(askOriginAllowed(ask({}, { Origin: SITE }), env)).toBe(true)
    expect(askOriginAllowed(ask({}, { Origin: 'http://localhost:3000' }), env)).toBe(true)
  })

  it('refuses another site, and refuses a request with no Origin at all', () => {
    const { env } = makeEnv()
    expect(askOriginAllowed(ask({}, { Origin: 'https://evil.example' }), env)).toBe(false)
    expect(askOriginAllowed(ask({}), env)).toBe(false)
  })

  it('does not accept 127.0.0.1, which is a different origin from localhost', () => {
    const { env } = makeEnv()
    expect(askOriginAllowed(ask({}, { Origin: 'http://127.0.0.1:3000' }), env)).toBe(false)
  })
})

describe('handleAsk', () => {
  it('passes the question and the published bundle to the AI Worker', async () => {
    const { env, seen } = makeEnv()
    const response = await handleAsk(ask({ message: 'Which projects use PyTorch?' }), env, ORIGIN, ctx)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ answer: 'Yes.', sources: [] })

    const sent = JSON.parse(seen.body ?? '{}')
    expect(sent.message).toBe('Which projects use PyTorch?')
    expect(sent.content).toHaveProperty('projects')
  })

  it('forwards only message and history, so a caller cannot supply their own content', async () => {
    const { env, seen } = makeEnv()
    await handleAsk(
      ask({ message: 'hi', content: { projects: [{ title: 'Fake award' }] }, admin: true }),
      env,
      ORIGIN,
      ctx,
    )

    const sent = JSON.parse(seen.body ?? '{}')
    expect(sent.content.projects).toEqual([])
    expect(sent).not.toHaveProperty('admin')
  })

  it('rate limits by IP before doing any work', async () => {
    const { env, seen } = makeEnv({ allowed: false })
    const response = await handleAsk(ask({ message: 'hi' }), env, ORIGIN, ctx)

    expect(response.status).toBe(429)
    expect(seen.body).toBeUndefined()
  })

  it('rejects a body that is not a JSON object', async () => {
    const { env } = makeEnv()
    for (const body of ['not json', '[]', '"hello"', 'null']) {
      const response = await handleAsk(ask(body), env, ORIGIN, ctx)
      expect(response.status).toBe(400)
    }
  })

  it('rejects an oversized body without reading it', async () => {
    const { env, seen } = makeEnv()
    const response = await handleAsk(
      ask({ message: 'hi' }, { 'Content-Length': '9000' }),
      env,
      ORIGIN,
      ctx,
    )
    expect(response.status).toBe(400)
    expect(seen.body).toBeUndefined()
  })

  it('passes an assistant rejection through, so the visitor learns what was wrong', async () => {
    const { env } = makeEnv({ aiStatus: 400, aiBody: { error: 'That message is too long.' } })
    const response = await handleAsk(ask({ message: 'x' }), env, ORIGIN, ctx)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'That message is too long.' })
  })

  it('flattens an assistant failure to one sentence and keeps the detail out of the response', async () => {
    const { env } = makeEnv({ aiStatus: 500, aiBody: { error: 'model @cf/meta/llama exploded' } })
    const response = await handleAsk(ask({ message: 'hi' }), env, ORIGIN, ctx)

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'The assistant is unavailable.' })
  })

  it('returns 502 when the AI Worker cannot be reached at all', async () => {
    const { env } = makeEnv({ aiThrows: true })
    const response = await handleAsk(ask({ message: 'hi' }), env, ORIGIN, ctx)

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'The assistant is unavailable.' })
  })

  it('returns 502 when the AI Worker answers with something that is not JSON', async () => {
    const { env } = makeEnv()
    env.ASK_AI = { fetch: async () => new Response('<html>', { status: 200 }) } as unknown as Fetcher
    const response = await handleAsk(ask({ message: 'hi' }), env, ORIGIN, ctx)

    expect(response.status).toBe(502)
  })
})

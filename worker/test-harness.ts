// The bindings a Worker route needs, faked well enough to drive the real handlers.
//
// Deliberately not miniflare and not @cloudflare/vitest-pool-workers: every handler in this
// directory is a plain ES module that takes its bindings as arguments, so `vitest run` can call
// them directly. That is what makes these tests run in 300ms with no runtime to boot, and it is
// the pattern ask.test.ts already proved. The moment a handler needs a real workerd behaviour
// this cannot fake, that is the signal to add the pool — not before.

import { vi } from 'vitest'
import type { Env } from './env'

/** A D1 result row. Loose on purpose — each suite supplies only the columns it cares about. */
export type Row = Record<string, unknown>

export type DbScript = {
  /** Answers `.first()`. A function receives the SQL and the bound values. */
  first?: Row | null | ((sql: string, args: unknown[]) => Row | null)
  /** Answers `.all()`. */
  all?: Row[] | ((sql: string, args: unknown[]) => Row[])
  /** Answers `.batch()`, statement by statement. */
  batch?: Row[][]
}

export type FakeDb = D1Database & {
  /** Every statement prepared, in order, with the values bound to it. */
  readonly statements: { sql: string; args: unknown[] }[]
}

/**
 * A D1 stand-in that records what it was asked and answers from a script.
 *
 * `readContent` batches exactly eight statements, so `batch` defaults to eight empty result
 * sets — enough for the public API to build an empty bundle without a database.
 */
export function fakeDb(script: DbScript = {}): FakeDb {
  const statements: { sql: string; args: unknown[] }[] = []

  const resolve = <T>(value: T | ((sql: string, args: unknown[]) => T), sql: string, args: unknown[]): T =>
    typeof value === 'function' ? (value as (s: string, a: unknown[]) => T)(sql, args) : value

  const prepare = (sql: string) => {
    const make = (args: unknown[]): D1PreparedStatement =>
      ({
        bind: (...next: unknown[]) => make(next),
        first: async () => {
          statements.push({ sql, args })
          return script.first === undefined ? null : resolve(script.first, sql, args)
        },
        run: async () => {
          statements.push({ sql, args })
          return { success: true, meta: { changes: 1 } }
        },
        all: async () => {
          statements.push({ sql, args })
          return { results: script.all === undefined ? [] : resolve(script.all, sql, args), success: true }
        },
        raw: async () => [],
      }) as unknown as D1PreparedStatement
    return make([])
  }

  const db = {
    statements,
    prepare,
    batch: async (list: D1PreparedStatement[]) => {
      // Draining each statement records it, so a batched write is as visible as a single one.
      for (const statement of list) await statement.all().catch(() => undefined)
      const scripted = script.batch ?? []
      return list.map((_, i) => ({ results: scripted[i] ?? [], success: true }))
    },
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
  }
  return db as unknown as FakeDb
}

export type FakeBucket = R2Bucket & {
  readonly objects: Map<string, Uint8Array>
  readonly deleted: string[]
}

/** An R2 stand-in backed by a Map. `get` returns something `serveFile` can stream. */
export function fakeBucket(seed: Record<string, Uint8Array> = {}): FakeBucket {
  const objects = new Map<string, Uint8Array>(Object.entries(seed))
  const deleted: string[] = []
  const bucket = {
    objects,
    deleted,
    put: async (key: string, value: ArrayBuffer | Uint8Array) => {
      objects.set(key, value instanceof Uint8Array ? value : new Uint8Array(value))
      return { key }
    },
    get: async (key: string) => {
      const bytes = objects.get(key)
      if (!bytes) return null
      return {
        body: new Response(bytes).body,
        httpEtag: '"fake"',
        writeHttpMetadata: (headers: Headers) => headers.set('Content-Type', 'application/octet-stream'),
      }
    },
    delete: async (key: string) => {
      deleted.push(key)
      objects.delete(key)
    },
    head: async () => null,
    list: async () => ({ objects: [], truncated: false }),
  }
  return bucket as unknown as FakeBucket
}

export const SITE = 'https://site.example.com'
export const ORIGIN = 'https://api.example.workers.dev'

/**
 * Installs an always-miss edge cache. `content.ts` reaches for `caches.default` at call time, so
 * this has to be in place before any suite that touches the public API runs.
 */
export function stubCaches(): { deleted: string[] } {
  const deleted: string[] = []
  vi.stubGlobal('caches', {
    default: {
      match: async () => undefined,
      put: async () => undefined,
      delete: async (key: Request | string) => {
        deleted.push(typeof key === 'string' ? key : key.url)
        return true
      },
    },
  })
  return { deleted }
}

export const ctx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext

export function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: fakeDb(),
    BUCKET: fakeBucket(),
    ASSETS: { fetch: async () => new Response('admin spa', { status: 200 }) },
    SITE_ORIGIN: SITE,
    ADMIN_PASSWORD_HASH: '',
    ASK_AI: { fetch: async () => new Response(JSON.stringify({ answer: 'x', sources: [] })) },
    ASK_LIMIT: { limit: async () => ({ success: true }) },
    ...overrides,
  } as unknown as Env
}

/** A well-formed session id: 64 lowercase hex characters, the shape `currentSession` demands. */
export const VALID_SID = 'a'.repeat(64)

/** An hour ahead and an hour behind, for the expiry branch. */
export const future = () => new Date(Date.now() + 3_600_000).toISOString()
export const past = () => new Date(Date.now() - 3_600_000).toISOString()

/**
 * A database that recognises `VALID_SID` as a live session and nothing else — the state most
 * authorisation tests need. `expired: true` makes the same id resolve to a stale row instead.
 */
export function sessionDb(options: { expired?: boolean; rows?: Row[] } = {}): FakeDb {
  return fakeDb({
    first: (sql, args) => {
      if (sql.includes('FROM sessions')) {
        return args[0] === VALID_SID
          ? { id: VALID_SID, expires_at: options.expired ? past() : future() }
          : null
      }
      return options.rows?.[0] ?? null
    },
    all: () => options.rows ?? [],
  })
}

type RequestOptions = {
  method?: string
  cookie?: string | null
  origin?: string | null
  body?: unknown
  headers?: Record<string, string>
}

/** Builds a request against the Worker's own origin, with the cookie and Origin under test. */
export function req(path: string, options: RequestOptions = {}): Request {
  const headers = new Headers(options.headers ?? {})
  if (options.cookie) headers.set('Cookie', `sid=${options.cookie}`)
  if (options.origin) headers.set('Origin', options.origin)
  const init: RequestInit = { method: options.method ?? 'GET', headers }
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    init.body = JSON.stringify(options.body)
  }
  return new Request(`${ORIGIN}${path}`, init)
}

/** A request carrying a live session and a same-origin Origin header — the happy path. */
export const authed = (path: string, options: RequestOptions = {}) =>
  req(path, { cookie: VALID_SID, origin: ORIGIN, ...options })

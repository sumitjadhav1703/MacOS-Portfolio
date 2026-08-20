import type { Env } from './env'
import { fail, json, log } from './http'
import { SPECS, SINGLETONS } from './tables'

const MAX_BYTES = 8 * 1024 * 1024
const KINDS = ['resume', 'certificates', 'projects', 'profile', 'misc'] as const
type Kind = (typeof KINDS)[number]

/**
 * The allowlist is checked against the file's own leading bytes, not against the Content-Type the
 * browser claimed and not against the filename. A .php renamed to .png does not survive this.
 */
const TYPES: { mime: string; ext: string; magic: number[]; at?: number }[] = [
  { mime: 'application/pdf', ext: 'pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'image/png', ext: 'png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', ext: 'jpg', magic: [0xff, 0xd8, 0xff] },
  { mime: 'image/webp', ext: 'webp', magic: [0x57, 0x45, 0x42, 0x50], at: 8 },
]

export function sniff(bytes: Uint8Array): { mime: string; ext: string } | null {
  for (const t of TYPES) {
    const at = t.at ?? 0
    if (bytes.length < at + t.magic.length) continue
    if (t.magic.every((b, i) => bytes[at + i] === b)) return { mime: t.mime, ext: t.ext }
  }
  return null
}

/**
 * Keys are built from a fresh UUID and the sniffed extension, never from anything the client
 * sent. There is no code path in which client text reaches the key, so `../` and absolute paths
 * are not so much rejected as impossible.
 */
export const makeKey = (kind: Kind, ext: string) => `portfolio/${kind}/${crypto.randomUUID()}.${ext}`

/** A key is only ever served or deleted if it looks like one we generated. */
export const isOwnKey = (key: string) =>
  /^portfolio\/(resume|certificates|projects|profile|misc)\/[0-9a-f-]{36}\.(pdf|png|jpg|webp)$/.test(key)

export async function handleUpload(request: Request, env: Env): Promise<Response> {
  const form = await request.formData().catch(() => null)
  if (!form) return fail(400, 'Expected a file upload.')

  const file = form.get('file')
  if (!(file instanceof File)) return fail(400, 'No file was attached.')
  if (file.size === 0) return fail(400, 'The file is empty.')
  if (file.size > MAX_BYTES) return fail(413, `Files must be 8 MB or smaller.`)

  const kindRaw = String(form.get('kind') ?? 'misc')
  if (!KINDS.includes(kindRaw as Kind)) return fail(400, 'Unknown upload category.')
  const kind = kindRaw as Kind

  const bytes = new Uint8Array(await file.arrayBuffer())
  const type = sniff(bytes)
  if (!type) {
    log('upload.rejected', { kind, size: file.size, claimed: file.type })
    return fail(415, 'Only PDF, PNG, JPEG and WebP files are accepted.')
  }

  const key = makeKey(kind, type.ext)
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: type.mime } })
  // The original filename is stored for display only. It is never used to build a path.
  const filename = String(form.get('filename') ?? file.name ?? 'upload').slice(0, 200)
  await env.DB.prepare(
    'INSERT INTO assets (key, filename, content_type, size, kind) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(key, filename, type.mime, bytes.length, kind)
    .run()

  log('upload.stored', { key, kind, size: bytes.length, mime: type.mime })
  return json({ key, contentType: type.mime, size: bytes.length, filename, kind }, { status: 201 })
}

/**
 * Every column across every table that can hold an R2 key, derived from the specs rather than
 * listed — a new file column on a new content type is covered the moment it is declared.
 *
 * `label` is the column that names a row, or null for a singleton, whose `name` is fixed because
 * there is only ever one of it.
 */
function keyColumns(): { table: string; column: string; label: string | null; name: string }[] {
  const out: { table: string; column: string; label: string | null; name: string }[] = []
  for (const spec of Object.values(SPECS)) {
    for (const column of spec.fileColumns) {
      out.push({ table: spec.table, column, label: spec.label, name: spec.table })
    }
  }
  for (const single of Object.values(SINGLETONS)) {
    for (const column of single.fileColumns) {
      out.push({ table: single.table, column, label: null, name: single.label })
    }
  }
  return out
}

/**
 * Which rows point at which key, for the whole bucket, in one batch.
 *
 * The Assets screen needs this for every file at once, so asking `referencesTo` per file would be
 * one batch per row. This is the same question turned inside out: read the keys the content
 * holds, and index them by key.
 */
export async function usageMap(env: Env): Promise<Record<string, string[]>> {
  const columns = keyColumns()
  const results = await env.DB.batch(
    columns.map(({ table, column, label }) =>
      env.DB.prepare(
        `SELECT ${column} AS k${label ? `, ${label} AS name` : ''} FROM ${table} ` +
          `WHERE ${column} IS NOT NULL AND ${column} != ''`,
      ),
    ),
  )

  const used: Record<string, string[]> = {}
  columns.forEach(({ label, name }, i) => {
    for (const row of (results[i]?.results ?? []) as { k: string; name?: string }[]) {
      const who = (label ? row.name : name) || name
      const list = (used[row.k] ??= [])
      if (!list.includes(who)) list.push(who)
    }
  })
  return used
}

/** Which rows still point at this key. An asset in use is never deleted. */
export async function referencesTo(env: Env, key: string): Promise<string[]> {
  const columns = keyColumns()
  const results = await env.DB.batch(
    columns.map(({ table, column }) =>
      env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${column} = ?`).bind(key),
    ),
  )
  return columns
    .filter((_, i) => ((results[i]!.results[0] as { n: number } | undefined)?.n ?? 0) > 0)
    .map(({ table, column }) => `${table}.${column}`)
}

export async function handleDeleteFile(env: Env, key: string): Promise<Response> {
  if (!isOwnKey(key)) return fail(400, 'Not a valid asset key.')
  // Names rather than column paths: the answer to "why can I not delete this?" is the thing
  // still using it, not the schema (spec §34).
  const used = (await usageMap(env))[key] ?? []
  if (used.length) {
    return fail(409, `This file is still used by ${used.join(', ')}. Detach it there first.`, {
      usedBy: used,
    })
  }
  await env.BUCKET.delete(key)
  await env.DB.prepare('DELETE FROM assets WHERE key = ?').bind(key).run()
  log('upload.deleted', { key })
  return json({ ok: true })
}

/** Public read. Keys are immutable, so the browser and edge may keep the object forever. */
export async function serveFile(env: Env, key: string): Promise<Response> {
  if (!isOwnKey(key)) return fail(404, 'Not found.')
  const object = await env.BUCKET.get(key)
  if (!object) return fail(404, 'Not found.')
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(object.body, { headers })
}

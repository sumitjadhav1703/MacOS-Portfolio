import type { Env } from './env'
import { fail, json, log } from './http'
import { SPECS, SINGLETONS, validate } from './tables'
import {
  copyValues,
  draftFrom,
  freeSlug,
  isStale,
  parseDraft,
  pickFields,
  publishValues,
  renamedId,
} from './drafts'
import { invalidate } from './content'
import { handleUpload, handleDeleteFile, referencesTo, usageMap } from './files'

const now = () => new Date().toISOString()

async function body(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json()
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** Every table that carries an `updated_at`, for the dashboard's one honest timestamp. */
const STAMPED = [
  'projects',
  'certificates',
  'experience',
  'education',
  'skills',
  'social_links',
  'site',
  'os_content',
]

/**
 * Counts for the dashboard, in one batched read. `lastUpdated` is the newest stamp across every
 * table rather than the site row's alone — editing a project is an edit, and a dashboard that
 * says otherwise is worse than one that says nothing.
 *
 * The stamps come back as one statement per table and are compared here rather than by a
 * `UNION ALL` of all eight: D1 refuses that with `too many terms in compound SELECT`, which no
 * type check sees and only a live request finds.
 */
async function stats(env: Env): Promise<Response> {
  const counts = [
    'SELECT COUNT(*) AS n FROM projects',
    'SELECT COUNT(*) AS n FROM projects WHERE published = 1',
    'SELECT COUNT(*) AS n FROM projects WHERE draft IS NOT NULL',
    'SELECT COUNT(*) AS n FROM certificates',
    'SELECT COUNT(*) AS n FROM experience',
    'SELECT COUNT(*) AS n FROM education',
    'SELECT COUNT(*) AS n FROM skills',
    'SELECT COUNT(*) AS n FROM social_links',
    'SELECT COUNT(*) AS n FROM assets',
  ]
  const batch = await env.DB.batch([
    ...counts.map((sql) => env.DB.prepare(sql)),
    ...STAMPED.map((t) => env.DB.prepare(`SELECT MAX(updated_at) AS u FROM ${t}`)),
  ])
  const n = (i: number) => ((batch[i]?.results[0] as { n?: number } | undefined)?.n ?? 0)
  const stamps = STAMPED.map(
    (_, i) => (batch[counts.length + i]?.results[0] as { u?: string | null } | undefined)?.u,
  ).filter((u): u is string => !!u)

  return json({
    projects: n(0),
    publishedProjects: n(1),
    projectDrafts: n(2),
    certificates: n(3),
    experience: n(4),
    education: n(5),
    skills: n(6),
    socialLinks: n(7),
    assets: n(8),
    lastUpdated: stamps.sort().pop() ?? null,
  })
}

async function listAll(env: Env, table: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM ${table} ORDER BY display_order, id`,
  ).all()
  return json({ items: results })
}

async function create(env: Env, type: string, payload: Record<string, unknown>): Promise<Response> {
  const spec = SPECS[type]!
  const { values, errors } = validate(spec.fields, payload, false)
  if (errors.length) return fail(422, 'Some fields need attention.', { fields: errors })

  const id = spec.id(values)
  if (spec.unique) {
    const clash = await env.DB.prepare(`SELECT id FROM ${spec.table} WHERE ${spec.unique} = ?`)
      .bind(values[spec.unique] ?? '')
      .first()
    if (clash) return fail(409, `That ${spec.unique} is already taken.`)
  }

  // A new item goes to the end of the list unless the caller placed it, so creating a project
  // does not push it in front of everything already on the desktop.
  if (values.display_order === undefined) {
    const last = await env.DB.prepare(
      `SELECT MAX(display_order) AS n FROM ${spec.table}`,
    ).first<{ n: number | null }>()
    values.display_order = (last?.n ?? -1) + 1
  }

  const columns = ['id', ...Object.keys(values), 'created_at', 'updated_at']
  const marks = columns.map(() => '?').join(', ')
  await env.DB.prepare(`INSERT INTO ${spec.table} (${columns.join(', ')}) VALUES (${marks})`)
    .bind(id, ...Object.values(values), now(), now())
    .run()

  log('admin.create', { type, id })
  return json({ id }, { status: 201 })
}

/** The row an admin write is about, or null. Every write reads it first, for the checks below. */
const loadRow = (env: Env, table: string, id: string) =>
  env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first<Record<string, unknown>>()

/** 409 when the caller is holding a version of this row that the database has moved past. */
function stale(payload: Record<string, unknown>, row: Record<string, unknown>): Response | null {
  return isStale(payload.expectedUpdatedAt, row.updated_at)
    ? fail(409, 'Someone else changed this while you were editing. Reload before saving.')
    : null
}

/** 409 when another row already holds this value in the spec's unique column. */
async function clashes(env: Env, type: string, id: string, values: Record<string, unknown>) {
  const spec = SPECS[type]!
  if (!spec.unique || values[spec.unique] === undefined) return null
  const clash = await env.DB.prepare(
    `SELECT id FROM ${spec.table} WHERE ${spec.unique} = ? AND id != ?`,
  )
    .bind(values[spec.unique] as string, id)
    .first()
  return clash ? fail(409, `That ${spec.unique} is already taken.`) : null
}

/**
 * Writes the given columns to one row, bumping `updated_at`. A project whose slug moved carries
 * its id across in the same statement, so `project-<slug>` stays true of the row.
 *
 * `changes === 0` is not an error: SQLite reports no change when every value written already
 * matched, and saving a form you did not alter is a normal thing to do, not a missing row.
 */
async function writeRow(
  env: Env,
  table: string,
  id: string,
  values: Record<string, string | number>,
  nextId: string | null,
): Promise<void> {
  const columns = { ...values, ...(nextId ? { id: nextId } : {}) }
  const sets = [...Object.keys(columns).map((c) => `${c} = ?`), 'updated_at = ?'].join(', ')
  await env.DB.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`)
    .bind(...Object.values(columns), now(), id)
    .run()
}

async function update(
  env: Env,
  type: string,
  id: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  const spec = SPECS[type]!
  const { values, errors } = validate(spec.fields, payload, true)
  if (errors.length) return fail(422, 'Some fields need attention.', { fields: errors })
  if (!Object.keys(values).length) return fail(400, 'Nothing to update.')

  const row = await loadRow(env, spec.table, id)
  if (!row) return fail(404, 'That item no longer exists.')
  const conflict = stale(payload, row) ?? (await clashes(env, type, id, values))
  if (conflict) return conflict

  const nextId = type === 'projects' ? renamedId(id, values) : null
  await writeRow(env, spec.table, id, values, nextId)

  log('admin.update', { type, id, columns: Object.keys(values), renamedTo: nextId })
  return json({ ok: true, id: nextId ?? id })
}

/**
 * Save pending edits to a project without touching what the public site serves.
 *
 * This is the write the editor makes. It never calls `invalidate`, and `readContent` never reads
 * this column, so typing — the thing spec §3 forbids from publishing — cannot reach a visitor.
 */
async function saveDraft(
  env: Env,
  id: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  const spec = SPECS.projects!
  const { values, errors } = draftFrom(spec.fields, payload)
  if (errors.length) return fail(422, 'Some fields need attention.', { fields: errors })

  const row = await loadRow(env, spec.table, id)
  if (!row) return fail(404, 'That item no longer exists.')
  const conflict = stale(payload, row) ?? (await clashes(env, 'projects', id, values))
  if (conflict) return conflict

  const at = now()
  await env.DB.prepare('UPDATE projects SET draft = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(pickFields(spec.fields, payload)), at, id)
    .run()

  log('admin.draft', { id, columns: Object.keys(values) })
  return json({ ok: true, updatedAt: at })
}

/** Throw the pending edits away. The live columns were never touched, so there is nothing else to undo. */
async function discardDraft(env: Env, id: string, payload: Record<string, unknown>): Promise<Response> {
  const row = await loadRow(env, 'projects', id)
  if (!row) return fail(404, 'That item no longer exists.')
  const conflict = stale(payload, row)
  if (conflict) return conflict

  const at = now()
  await env.DB.prepare('UPDATE projects SET draft = NULL, updated_at = ? WHERE id = ?')
    .bind(at, id)
    .run()
  log('admin.draft.discard', { id })
  return json({ ok: true, updatedAt: at })
}

/**
 * Promote the draft into the live columns and mark the project published. The draft is validated
 * again on the way through with the same rules `create` uses, so nothing reaches a live row that
 * creating it from scratch would have refused.
 */
async function publish(env: Env, id: string, payload: Record<string, unknown>): Promise<Response> {
  const spec = SPECS.projects!
  const row = await loadRow(env, spec.table, id)
  if (!row) return fail(404, 'That item no longer exists.')
  const preflight = stale(payload, row)
  if (preflight) return preflight

  const { values, errors } = publishValues(spec.fields, row.draft)
  if (errors.length) return fail(422, 'This project cannot be published yet.', { fields: errors })
  const conflict = await clashes(env, 'projects', id, values)
  if (conflict) return conflict

  const nextId = renamedId(id, values)
  const at = now()
  const columns = { ...values, ...(nextId ? { id: nextId } : {}) }
  const sets = [...Object.keys(columns).map((c) => `${c} = ?`), 'draft = NULL', 'updated_at = ?'].join(
    ', ',
  )
  await env.DB.prepare(`UPDATE projects SET ${sets} WHERE id = ?`)
    .bind(...Object.values(columns), at, id)
    .run()

  log('admin.publish', { id, renamedTo: nextId, fromDraft: parseDraft(row.draft) !== null })
  return json({ ok: true, id: nextId ?? id, updatedAt: at })
}

/**
 * A copy of a project, unpublished, under a slug nothing else holds.
 *
 * It goes through `create`, so the copy is validated exactly as a hand-typed project would be
 * and nothing can be duplicated into a state that could not have been typed. The cover key is
 * copied as a reference, not as a second object — `referencesTo` then counts two rows, which is
 * what stops deleting either one from taking the shared image with it.
 */
async function duplicate(env: Env, id: string): Promise<Response> {
  const spec = SPECS.projects!
  const row = await loadRow(env, spec.table, id)
  if (!row) return fail(404, 'That item no longer exists.')

  const { results } = await env.DB.prepare('SELECT slug FROM projects').all<{ slug: string }>()
  const last = await env.DB.prepare('SELECT MAX(display_order) AS n FROM projects').first<{
    n: number | null
  }>()
  const slug = freeSlug(String(row.slug ?? ''), new Set(results.map((r) => r.slug)))

  log('admin.duplicate', { from: id, slug })
  return create(env, 'projects', copyValues(row, spec.fields, slug, (last?.n ?? -1) + 1))
}

/**
 * Deleting a row also cleans up the R2 objects it owned — but only after checking that nothing
 * else still points at them, so a cover image shared between two projects survives.
 */
async function remove(env: Env, type: string, id: string): Promise<Response> {
  const spec = SPECS[type]!
  const row = await env.DB.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) return fail(404, 'That item no longer exists.')

  await env.DB.prepare(`DELETE FROM ${spec.table} WHERE id = ?`).bind(id).run()

  const orphaned: string[] = []
  for (const column of spec.fileColumns) {
    const key = row[column]
    if (typeof key !== 'string' || !key) continue
    if ((await referencesTo(env, key)).length) continue
    await env.BUCKET.delete(key)
    await env.DB.prepare('DELETE FROM assets WHERE key = ?').bind(key).run()
    orphaned.push(key)
  }

  log('admin.delete', { type, id, removedAssets: orphaned })
  return json({ ok: true, removedAssets: orphaned })
}

async function reorder(env: Env, type: string, payload: Record<string, unknown>): Promise<Response> {
  const spec = SPECS[type]!
  const ids = payload.ids
  if (!Array.isArray(ids) || ids.some((v) => typeof v !== 'string')) {
    return fail(400, 'Expected a list of ids.')
  }
  if (ids.length > 500) return fail(400, 'Too many items.')
  await env.DB.batch(
    (ids as string[]).map((id, i) =>
      env.DB.prepare(`UPDATE ${spec.table} SET display_order = ?, updated_at = ? WHERE id = ?`).bind(
        i,
        now(),
        id,
      ),
    ),
  )
  log('admin.reorder', { type, count: ids.length })
  return json({ ok: true })
}

async function readSingleton(env: Env, name: string): Promise<Response> {
  const single = SINGLETONS[name]!
  const row = await env.DB.prepare(`SELECT * FROM ${single.table} WHERE id = 1`).first()
  return json({ item: row ?? null })
}

async function writeSingleton(
  env: Env,
  name: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  const single = SINGLETONS[name]!
  const { values, errors } = validate(single.fields, payload, true)
  if (errors.length) return fail(422, 'Some fields need attention.', { fields: errors })
  if (!Object.keys(values).length) return fail(400, 'Nothing to update.')

  const sets = [...Object.keys(values).map((c) => `${c} = ?`), 'updated_at = ?'].join(', ')
  await env.DB.prepare(`UPDATE ${single.table} SET ${sets} WHERE id = 1`)
    .bind(...Object.values(values), now())
    .run()
  log('admin.update', { type: name, columns: Object.keys(values) })
  return json({ ok: true })
}

/**
 * Every route here runs behind the session guard in index.ts. Mutations bust the public content
 * cache on the way out, so a publish is visible on the next request rather than after a TTL.
 */
export async function handleAdminApi(
  request: Request,
  env: Env,
  parts: string[],
  origin: string,
): Promise<Response> {
  const method = request.method
  const [head, tail, ...rest] = parts

  if (head === 'stats' && method === 'GET') return stats(env)

  if (head === 'files') {
    if (method === 'POST') {
      const response = await handleUpload(request, env)
      return response
    }
    if (method === 'GET') {
      // What each file is used by comes back with it. The Assets screen can then say "used by AI
      // Video Assistant" rather than only finding out at the moment a delete is refused (§30).
      const [{ results }, used] = await Promise.all([
        env.DB.prepare('SELECT * FROM assets ORDER BY created_at DESC').all(),
        usageMap(env),
      ])
      const items = (results as Record<string, unknown>[]).map((asset) => ({
        ...asset,
        usedBy: used[String(asset.key)] ?? [],
      }))
      return json({ items })
    }
    if (method === 'DELETE') {
      const key = [tail, ...rest].filter(Boolean).join('/')
      const response = await handleDeleteFile(env, decodeURIComponent(key))
      if (response.ok) await invalidate(origin)
      return response
    }
    return fail(405, 'Method not allowed.')
  }

  if (head === 'reorder' && method === 'POST') {
    if (!tail || !SPECS[tail]) return fail(404, 'Unknown content type.')
    const payload = await body(request)
    if (!payload) return fail(400, 'Invalid request.')
    const response = await reorder(env, tail, payload)
    await invalidate(origin)
    return response
  }

  if (head && SINGLETONS[head]) {
    if (method === 'GET') return readSingleton(env, head)
    if (method === 'PUT') {
      const payload = await body(request)
      if (!payload) return fail(400, 'Invalid request.')
      const response = await writeSingleton(env, head, payload)
      await invalidate(origin)
      return response
    }
    return fail(405, 'Method not allowed.')
  }

  if (!head || !SPECS[head]) return fail(404, 'Unknown content type.')
  const spec = SPECS[head]!

  if (!tail) {
    if (method === 'GET') return listAll(env, spec.table)
    if (method === 'POST') {
      const payload = await body(request)
      if (!payload) return fail(400, 'Invalid request.')
      const response = await create(env, head, payload)
      await invalidate(origin)
      return response
    }
    return fail(405, 'Method not allowed.')
  }

  const id = decodeURIComponent(tail)

  // Draft and publish belong to projects alone. The other types are a single deliberate save, so
  // a second state to keep straight would cost more than it buys — see migrations/0003.
  const action = rest[0]
  if (action) {
    if (head !== 'projects') return fail(404, 'Not found.')
    // These carry no fields of their own; an absent body just means "no version to check".
    const payload = (await body(request)) ?? {}
    if (action === 'draft' && method === 'PUT') {
      // Deliberately no invalidate(): a draft changes nothing the public API serves.
      return saveDraft(env, id, payload)
    }
    if (action === 'draft' && method === 'DELETE') return discardDraft(env, id, payload)
    if (action === 'publish' && method === 'POST') {
      const response = await publish(env, id, payload)
      if (response.ok) await invalidate(origin)
      return response
    }
    // A duplicate is born unpublished, so it changes nothing the public API serves and there is
    // no cache to bust.
    if (action === 'duplicate' && method === 'POST') return duplicate(env, id)
    return fail(405, 'Method not allowed.')
  }

  if (method === 'PATCH') {
    const payload = await body(request)
    if (!payload) return fail(400, 'Invalid request.')
    const response = await update(env, head, id, payload)
    await invalidate(origin)
    return response
  }
  if (method === 'DELETE') {
    const response = await remove(env, head, id)
    await invalidate(origin)
    return response
  }
  return fail(405, 'Method not allowed.')
}

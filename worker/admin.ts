import type { Env } from './env'
import { fail, json, log } from './http'
import { SPECS, SINGLETONS, validate } from './tables'
import { invalidate } from './content'
import { handleUpload, handleDeleteFile, referencesTo } from './files'

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

/** Counts for the dashboard, in one batched read. */
async function stats(env: Env): Promise<Response> {
  const batch = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS n FROM projects'),
    env.DB.prepare('SELECT COUNT(*) AS n FROM projects WHERE published = 1'),
    env.DB.prepare('SELECT COUNT(*) AS n FROM certificates'),
    env.DB.prepare('SELECT COUNT(*) AS n FROM experience'),
    env.DB.prepare('SELECT COUNT(*) AS n FROM assets'),
    env.DB.prepare('SELECT updated_at FROM site WHERE id = 1'),
  ])
  const n = (i: number) => ((batch[i]?.results[0] as { n?: number } | undefined)?.n ?? 0)
  return json({
    projects: n(0),
    publishedProjects: n(1),
    certificates: n(2),
    experience: n(3),
    assets: n(4),
    lastUpdated:
      (batch[5]?.results[0] as { updated_at?: string } | undefined)?.updated_at ?? null,
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

  if (spec.unique && values[spec.unique] !== undefined) {
    const clash = await env.DB.prepare(
      `SELECT id FROM ${spec.table} WHERE ${spec.unique} = ? AND id != ?`,
    )
      .bind(values[spec.unique]!, id)
      .first()
    if (clash) return fail(409, `That ${spec.unique} is already taken.`)
  }

  const sets = [...Object.keys(values).map((c) => `${c} = ?`), 'updated_at = ?'].join(', ')
  const result = await env.DB.prepare(`UPDATE ${spec.table} SET ${sets} WHERE id = ?`)
    .bind(...Object.values(values), now(), id)
    .run()
  if (!result.meta.changes) return fail(404, 'That item no longer exists.')

  log('admin.update', { type, id, columns: Object.keys(values) })
  return json({ ok: true })
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
      const { results } = await env.DB.prepare('SELECT * FROM assets ORDER BY created_at DESC').all()
      return json({ items: results })
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

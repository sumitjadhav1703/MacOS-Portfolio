// Reading the content bundle out of D1, and the one cache entry it is served from.
//
// The mapping itself lives in map.ts and is re-exported here, so every existing importer — and
// the tests — keep working while the admin can reach the pure half without dragging the Worker
// runtime's types into a browser build.

import type { Content } from '../src/data/content'
import type { Env } from './env'
import { buildContent } from './map'
import type { Row } from './map'

export type { ContentRows, Row } from './map'
export { buildContent, mapCertificate, mapEntry, mapProject, mapSkill, mapSocial } from './map'

/**
 * One batched read for the whole published bundle. `published = 1` is applied in SQL, so a draft
 * cannot leak through a public endpoint even if a caller asks for it by slug.
 */
export async function readContent(env: Env, origin: string): Promise<Content> {
  const list = (table: string) =>
    env.DB.prepare(`SELECT * FROM ${table} WHERE published = 1 ORDER BY display_order, id`)
  const batch = await env.DB.batch([
    env.DB.prepare('SELECT * FROM site WHERE id = 1'),
    env.DB.prepare('SELECT * FROM os_content WHERE id = 1'),
    list('projects'),
    list('certificates'),
    list('experience'),
    list('education'),
    list('skills'),
    list('social_links'),
  ])
  const at = (i: number) => (batch[i]?.results ?? []) as Row[]

  return buildContent(
    {
      site: at(0)[0] ?? null,
      os: at(1)[0] ?? null,
      projects: at(2),
      certificates: at(3),
      experience: at(4),
      education: at(5),
      skills: at(6),
      social: at(7),
    },
    origin,
    env.SITE_ORIGIN,
  )
}

/** How long a cached bundle may be served. See the note in `cachedContent`. */
export const TTL_SECONDS = 60

/** The single cache entry the whole public API is served from. */
export const contentCacheKey = (origin: string) => new Request(`${origin}/api/content`)

/**
 * Reads the bundle through the edge cache. Everything the public API serves is a slice of this
 * one object, so a cache miss costs one batched D1 read no matter how many endpoints are hit,
 * and a publish only has to invalidate one entry.
 */
export async function cachedContent(
  env: Env,
  origin: string,
  ctx: ExecutionContext,
): Promise<{ content: Content; hit: boolean }> {
  const cache = caches.default
  const key = contentCacheKey(origin)
  const hit = await cache.match(key)
  if (hit) return { content: (await hit.json()) as Content, hit: true }

  const content = await readContent(env, origin)
  const body = JSON.stringify(content)
  const stored = new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // A publish deletes this entry, but the Cache API is per-colo: the delete only reaches the
      // location that served the admin request. So the TTL — not the delete — is what bounds
      // staleness everywhere else, and it is kept short deliberately. The delete still makes the
      // change instant where the owner is, and one D1 read per colo per minute is nothing
      // against the free tier's 5M rows/day.
      'Cache-Control': `public, max-age=${TTL_SECONDS}, s-maxage=${TTL_SECONDS}`,
    },
  })
  ctx.waitUntil(cache.put(key, stored.clone()))
  return { content, hit: false }
}

/** Called after every admin write. One delete, because there is only one cached entry. */
export async function invalidate(origin: string): Promise<void> {
  await caches.default.delete(contentCacheKey(origin))
}

import type { Content, Project, Certificate, Entry, SkillGroup, ProfileLink } from '../src/data/content'
import type { Env } from './env'

/** Rows come back from D1 as plain objects; JSON columns are still strings at this point. */
type Row = Record<string, unknown>

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const bool = (v: unknown): boolean => v === 1 || v === true

/** JSON columns are parsed defensively: a corrupt cell degrades to empty, it never throws. */
function parse<T>(v: unknown, fallback: T): T {
  if (typeof v !== 'string') return fallback
  try {
    const out = JSON.parse(v)
    return out === null ? fallback : (out as T)
  } catch {
    return fallback
  }
}

/** An R2 key becomes a URL on this Worker. Null keys stay undefined so callers can fall back. */
const fileUrl = (origin: string, key: unknown): string | undefined =>
  typeof key === 'string' && key ? `${origin}/files/${key}` : undefined

export function mapProject(row: Row, origin: string): Project {
  const slug = str(row.slug)
  return {
    id: str(row.id, `project-${slug}`),
    slug,
    title: str(row.title),
    desktopLabel: str(row.desktop_label) || str(row.title),
    tagline: str(row.tagline),
    status: { label: str(row.status_label), ok: bool(row.status_ok) },
    stack: parse<string[]>(row.stack, []),
    sections: parse<Project['sections']>(row.sections, []),
    links: parse<Project['links']>(row.links, []),
    aliases: parse<string[]>(row.aliases, []),
    note: str(row.note) || undefined,
    caveat: str(row.caveat) || undefined,
    coverUrl: fileUrl(origin, row.cover_key),
    featured: bool(row.featured),
  }
}

export function mapCertificate(row: Row, origin: string): Certificate {
  return {
    id: str(row.id),
    title: str(row.title),
    issuer: str(row.issuer),
    issueDate: str(row.issue_date),
    credentialUrl: str(row.credential_url) || undefined,
    fileUrl: fileUrl(origin, row.file_key),
    imageUrl: fileUrl(origin, row.image_key),
  }
}

export function mapEntry(row: Row): Entry {
  return { title: str(row.title), detail: str(row.detail), hint: str(row.hint) || undefined }
}

export function mapSkill(row: Row): SkillGroup {
  return { heading: str(row.heading), items: parse<string[]>(row.items, []) }
}

export function mapSocial(row: Row): ProfileLink {
  return {
    slug: str(row.slug),
    label: str(row.label),
    handle: str(row.handle),
    url: str(row.url),
    pill: bool(row.pill),
  }
}

/** The packaged PDF, used until a resume is uploaded. Mirrors RESUME_FILE in src/data/sections.ts. */
const PACKAGED_RESUME = '/Sumit_Jadhav_Resume.pdf'

export type ContentRows = {
  site: Row | null
  os: Row | null
  projects: Row[]
  certificates: Row[]
  experience: Row[]
  education: Row[]
  skills: Row[]
  social: Row[]
}

/**
 * Pure row → bundle mapping, kept separate from the D1 call so it can be tested without a
 * database. The shape returned is exactly what src/data/content.ts declares, which is what lets
 * the desktop swap between FALLBACK and the API without any component knowing which it has.
 */
export function buildContent(rows: ContentRows, origin: string, siteOrigin: string): Content {
  const site = rows.site ?? {}
  const os = rows.os ?? {}
  const resumeKey = str(site.resume_key)
  const stamps = [
    str(site.updated_at),
    str(os.updated_at),
    ...[...rows.projects, ...rows.certificates, ...rows.experience, ...rows.education, ...rows.skills, ...rows.social].map(
      (r) => str(r.updated_at),
    ),
  ].filter(Boolean)

  return {
    site: {
      name: str(site.name),
      initials: str(site.initials),
      subtitle: str(site.subtitle),
      paragraphs: parse<string[]>(site.paragraphs, []),
      email: str(site.email),
      resumeUrl: resumeKey ? `${origin}/files/${resumeKey}` : `${siteOrigin}${PACKAGED_RESUME}`,
    },
    projects: rows.projects.map((r) => mapProject(r, origin)),
    certificates: rows.certificates.map((r) => mapCertificate(r, origin)),
    experience: rows.experience.map(mapEntry),
    education: rows.education.map(mapEntry),
    skills: rows.skills.map(mapSkill),
    socialLinks: rows.social.map(mapSocial),
    os: {
      term: parse<Record<string, string>>(os.term, {}),
      neofetchArt: str(os.neofetch_art),
      neofetchRows: parse<[string, string][]>(os.neofetch_rows, []),
      kb: parse<[string[], string][]>(os.kb, []),
      aiFallback: str(os.ai_fallback),
      aiSuggestions: parse<string[]>(os.ai_suggestions, []),
      shortcuts: parse<[string, string][]>(os.shortcuts, []),
    },
    updatedAt: stamps.sort().pop() ?? new Date(0).toISOString(),
  }
}

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

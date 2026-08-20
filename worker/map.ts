// Row → bundle mapping, with nothing else in it.
//
// These are the only functions that decide what the public site sees, and they touch neither D1
// nor the cache, so they can be tested as plain values — and the admin's project preview can
// call `mapProject` on what is in the editor and get exactly the object the API would have
// served (spec §20).

import type { Content, Project, Certificate, Entry, SkillGroup, ProfileLink } from '../src/data/content'

/** Rows come back from D1 as plain objects; JSON columns are still strings at this point. */
export type Row = Record<string, unknown>

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const bool = (v: unknown): boolean => v === 1 || v === true

/**
 * JSON columns are parsed defensively: a corrupt cell degrades to the fallback, it never throws.
 *
 * The shape is checked as well as the syntax. A cell can hold perfectly valid JSON of the wrong
 * type — `"a string"`, `42`, `true` — and every caller here maps or spreads the result, so a
 * non-list where a list belongs breaks the desktop exactly as a syntax error would. The fallback
 * declares the expected shape, so it is the only thing this needs to compare against.
 */
function parse<T>(v: unknown, fallback: T): T {
  if (typeof v !== 'string') return fallback
  try {
    const out = JSON.parse(v)
    if (out === null) return fallback
    if (Array.isArray(fallback) !== Array.isArray(out)) return fallback
    if (typeof fallback === 'object' && typeof out !== 'object') return fallback
    return out as T
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

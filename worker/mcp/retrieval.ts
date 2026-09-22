// Published bundle → searchable documents → a small, ranked, bounded answer. Pure: no I/O.
//
// Deterministic on purpose, the same call as ai/src/retrieval.py makes for Ask Sumit: the corpus
// is a few dozen records, a token-overlap score finds the right ones, and an index recomputed
// from the bundle on every request cannot drift out of date. A project published in /admin is
// searchable here as soon as the bundle cache turns over — there is nothing to rebuild.
//
// ponytail: token overlap with a coverage floor. Add embeddings only when real questions miss.

import type { Content, ProjectSection } from '../../src/data/content'
import type { Doc, DocType, Source } from './types'
import { NO_MATCH } from './types'

export const MAX_RESULTS = 8
export const SNIPPET_CHARS = 280
export const MAX_TEXT_CHARS = 6000

/** Words that carry no signal but turn up in most questions. Short, like the Python list. */
const STOPWORDS = new Set(
  `a an and are as at be by can did do does for from has have he her him his how i in is it its me
  my of on or she that the their them there they this to was were what when where which who whom
  whose why will with you your sumit sumits tell show about please give list explain describe used
  use`.split(/\s+/),
)

/**
 * Question words that point at a kind of record. They count as a hit on every doc of that kind,
 * so "what are his projects?" reaches the projects even though no project contains "projects".
 */
const ROUTES: [string[], DocType[]][] = [
  [['project', 'built', 'build', 'made', 'portfolio', 'demo', 'app', 'shipped', 'work'], ['project']],
  [['research', 'study', 'paper', 'experiment'], ['research', 'project']],
  [['skill', 'tech', 'technology', 'stack', 'language', 'tool', 'know'], ['skill']],
  [['experience', 'job', 'role', 'intern', 'internship', 'company', 'worked'], ['experience']],
  [['education', 'degree', 'college', 'university', 'school', 'studied', 'gpa'], ['education']],
  [['certificate', 'certification', 'certified', 'course'], ['certificate']],
  [['resume', 'cv'], ['resume']],
  [['contact', 'email', 'reach', 'github', 'linkedin', 'hire', 'link', 'profile', 'social', 'bio', 'background', 'who'], ['profile']],
]

/**
 * What a caller means by a section name, against the headings projects actually carry. Also
 * used to widen a search term, so "methodology" finds a section headed "Forecasting pipeline".
 */
export const SECTION_SYNONYMS: Record<string, string[]> = {
  overview: ['what it is', 'what it does', 'overview', 'summary', 'about'],
  methodology: ['methodology', 'method', 'approach', 'pipeline', 'formula', 'model', 'implementation', 'how it works'],
  architecture: ['architecture', 'system', 'design', 'model', 'stack'],
  dataset: ['dataset', 'data', 'input features', 'features', 'observations'],
  experiments: ['experiment', 'validation', 'evaluation', 'testing'],
  results: ['results', 'result', 'performance', 'metrics', 'evaluation', 'validation', 'finding'],
  metrics: ['metrics', 'performance', 'results', 'evaluation'],
  deployment: ['deployment', 'api', 'demo', 'serving'],
  limitations: ['limitation', 'caveat', 'note'],
  references: ['links', 'references', 'source'],
}

// ---- text helpers ---------------------------------------------------------------------------

/**
 * Lowercase word tokens. `+` and `#` stay inside a token so "c++" and "c#" survive as themselves;
 * a trailing plural `s` is dropped so "projects" meets "project". Single letters are noise.
 */
export function tokens(text: string): Set<string> {
  const out = new Set<string>()
  for (const raw of text.toLowerCase().split(/[^a-z0-9+#.]+/)) {
    let word = raw.replace(/^\.+|\.+$/g, '')
    if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) word = word.slice(0, -1)
    if (word.length > 1 || /[+#]/.test(word)) out.add(word)
  }
  return out
}

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

function sectionText(section: ProjectSection): string {
  const body = section.body as Record<string, unknown>
  if (typeof body.text === 'string') return body.text
  if (Array.isArray(body.flow)) {
    return (body.flow as unknown[][]).map((row) => row.filter(Boolean).join(' — ')).join('\n')
  }
  if (Array.isArray(body.metrics)) {
    return (body.metrics as unknown[][])
      .map(([label, value, hint]) => `${label}: ${value}${hint ? ` (${hint})` : ''}`)
      .join('\n')
  }
  return ''
}

const lines = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join('\n')

// ---- index ----------------------------------------------------------------------------------

/**
 * Every published record as a document. Nothing is filtered here: the bundle this is handed
 * was restricted to `published = 1` in SQL, so there is no second visibility rule to get wrong.
 */
export function buildIndex(content: Content, siteOrigin: string, resume?: string | null): Doc[] {
  const at = content.updatedAt
  const docs: Doc[] = []
  const src = (type: DocType, title: string, url = siteOrigin, extra: Partial<Source> = {}): Source => ({
    type,
    title,
    url,
    ...extra,
  })

  const site = content.site
  const links = content.socialLinks.filter((l) => l.url)
  docs.push({
    id: 'profile:about',
    type: 'profile',
    title: site.name || 'About',
    text: lines(
      site.name && `${site.name} — ${site.subtitle}`,
      ...site.paragraphs,
      site.email && `Email: ${site.email}`,
      ...links.map((l) => `${l.label}: ${l.url}`),
      site.resumeUrl && `Resume: ${site.resumeUrl}`,
    ),
    source: src('profile', site.name || 'About'),
    updatedAt: at,
  })

  for (const p of content.projects) {
    if (!p.slug) continue
    const url = `${siteOrigin}/projects/${p.slug}`
    const sections = sectionsOf(p.sections)
    const intro = p.sections.find((s) => 'text' in s.body)
    docs.push({
      id: `project:${p.slug}`,
      type: 'project',
      title: p.title,
      text: lines(
        p.tagline,
        p.status.label && `Status: ${p.status.label}`,
        p.stack.length > 0 && `Stack: ${p.stack.join(', ')}`,
        intro && sectionText(intro),
        sections.length > 0 && `Sections: ${sections.map((s) => s.slug).join(', ')}`,
        ...p.links.map((l) => `${l.label}: ${l.url}`),
        p.note,
        p.caveat && `Caveat: ${p.caveat}`,
      ),
      extra: [p.desktopLabel, ...(p.aliases ?? []), p.slug].join(' '),
      project: p.slug,
      source: src('project', p.title, url, { slug: p.slug }),
      updatedAt: at,
    })
    for (const s of sections) {
      docs.push({
        id: `research:${p.slug}/${s.slug}`,
        type: 'research',
        title: `${p.title} — ${s.heading}`,
        text: sectionText(s.section),
        extra: [p.desktopLabel, p.slug, ...(p.aliases ?? [])].join(' '),
        project: p.slug,
        section: s.slug,
        heading: s.heading,
        source: src('research', p.title, url, { slug: p.slug, section: s.slug }),
        updatedAt: at,
      })
    }
  }

  const keyed = (type: DocType, title: string, text: string, url = siteOrigin) => {
    const key = slugify(title) || 'item'
    // Two records with the same title must not collapse into one id.
    let id = `${type}:${key}`
    for (let n = 2; docs.some((d) => d.id === id); n++) id = `${type}:${key}-${n}`
    docs.push({ id, type, title, text, source: src(type, title, url), updatedAt: at })
  }
  for (const e of content.experience) keyed('experience', e.title, lines(e.title, e.detail, e.hint))
  for (const e of content.education) keyed('education', e.title, lines(e.title, e.detail, e.hint))
  for (const g of content.skills) keyed('skill', g.heading, `${g.heading}: ${g.items.join(', ')}`)
  for (const c of content.certificates) {
    keyed(
      'certificate',
      c.title,
      lines(
        `${c.title} — issued by ${c.issuer}`,
        c.issueDate && `Issued: ${c.issueDate}`,
        c.credentialUrl && `Credential: ${c.credentialUrl}`,
      ),
      c.credentialUrl ?? c.fileUrl ?? siteOrigin,
    )
  }

  for (const part of resumeSections(resume ?? '')) {
    docs.push({
      id: `resume:${part.slug}`,
      type: 'resume',
      title: `Resume — ${part.heading}`,
      text: part.text,
      section: part.slug,
      heading: part.heading,
      source: src('resume', 'Resume', content.site.resumeUrl, { section: part.slug }),
      updatedAt: at,
    })
  }

  return docs.filter((d) => d.text.trim())
}

/**
 * Split resume text on its own headings — the short all-capitals lines a resume is laid out
 * with (EDUCATION, TECHNICAL SKILLS, WORK EXPERIENCE…). Whatever comes before the first one is
 * the header block: name and contact line.
 */
export function resumeSections(text: string): { heading: string; slug: string; text: string }[] {
  const out: { heading: string; slug: string; lines: string[] }[] = []
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  lines.forEach((line, i) => {
    const heading = i > 0 && /^[A-Z][A-Z &/,-]{2,40}$/.test(line) && /[A-Z]{3}/.test(line)
    if (heading || !out.length) {
      const name = heading ? line.charAt(0) + line.slice(1).toLowerCase() : 'Contact'
      out.push({ heading: name, slug: slugify(name), lines: heading ? [] : [line] })
    } else out[out.length - 1]!.lines.push(line)
  })
  return out.map((s) => ({ heading: s.heading, slug: s.slug, text: s.lines.join('\n') })).filter((s) => s.text)
}

function sectionsOf(list: ProjectSection[]) {
  const seen = new Set<string>()
  return list.map((section, i) => {
    const heading = section.heading?.trim() || `Section ${i + 1}`
    let slug = slugify(heading) || `section-${i + 1}`
    if (seen.has(slug)) slug = `${slug}-${i + 1}`
    seen.add(slug)
    return { heading, slug, section }
  })
}

// ---- search ---------------------------------------------------------------------------------

export type SearchInput = { query: string; type?: DocType | 'all'; project?: string; limit?: number }

export type SearchResult = {
  id: string
  type: DocType
  title: string
  snippet: string
  source: Source
  updatedAt: string
}

/** Every query term, plus what it stands for when it names a kind of section. */
function expand(term: string): string[] {
  const out = [term]
  for (const [name, words] of Object.entries(SECTION_SYNONYMS)) {
    if (tokens(name).has(term)) for (const w of words) out.push(...tokens(w))
  }
  return out
}

export function search(index: Doc[], input: SearchInput): { results: SearchResult[]; message?: string } {
  const limit = Math.min(Math.max(1, input.limit ?? 5), MAX_RESULTS)
  const terms = [...tokens(input.query)].filter((t) => !STOPWORDS.has(t))
  const phrase = input.query.trim().toLowerCase()

  const pool = index.filter(
    (d) =>
      (!input.type || input.type === 'all' || d.type === input.type) &&
      (!input.project || d.project === input.project),
  )

  const scored = pool
    .map((doc) => {
      const bag = tokens(`${doc.title} ${doc.text} ${doc.extra ?? ''}`)
      const title = tokens(`${doc.title} ${doc.extra ?? ''}`)
      let hits = 0
      let score = 0
      const matched: string[] = []
      for (const term of terms) {
        const route = ROUTES.filter(([words]) => words.includes(term))
        const routed = route.some(([, types]) => types.includes(doc.type))
        const found = expand(term).find((t) => bag.has(t))
        if (found || routed) {
          hits++
          score += 1
          if (found) matched.push(found)
          // A category word ("projects") lifts its category; it is not a title match elsewhere,
          // or a certificate called "Structuring ML Projects" outranks every project.
          if (routed) score += 1
          else if (!route.length && title.has(term)) score += 1.5
        }
      }
      if (phrase.length > 3 && `${doc.title}\n${doc.text}`.toLowerCase().includes(phrase)) score += 3
      return { doc, hits, score, matched }
    })
    // A doc must answer most of the question, not one incidental word of it: "favorite movie"
    // must not come back as the movie-recommendation project.
    .filter((r) => terms.length > 0 && r.hits / terms.length > 0.5)
    .sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id))
    .slice(0, limit)

  const results = scored.map(({ doc, matched }) => ({
    id: doc.id,
    type: doc.type,
    title: doc.title,
    snippet: snippet(doc.text, matched),
    source: doc.source,
    updatedAt: doc.updatedAt,
  }))
  return results.length ? { results } : { results, message: NO_MATCH }
}

function snippet(text: string, matched: string[]): string {
  const flat = text.replace(/\s*\n\s*/g, ' · ').replace(/\s+/g, ' ').trim()
  if (flat.length <= SNIPPET_CHARS) return flat
  const lower = flat.toLowerCase()
  const at = Math.min(...matched.map((m) => lower.indexOf(m)).filter((i) => i >= 0), flat.length)
  const start = at === flat.length ? 0 : Math.max(0, at - 60)
  const cut = flat.slice(start, start + SNIPPET_CHARS - 2)
  return `${start > 0 ? '…' : ''}${cut}…`
}

// ---- retrieval ------------------------------------------------------------------------------

export type ContextResult =
  | {
      found: true
      id: string
      type: DocType
      title: string
      section?: string
      text: string
      truncated: boolean
      availableSections?: string[]
      source: Source
      updatedAt: string
    }
  | { found: false; message: string; availableSections?: string[] }

const cap = (text: string) =>
  text.length > MAX_TEXT_CHARS
    ? { text: `${text.slice(0, MAX_TEXT_CHARS)}…`, truncated: true }
    : { text, truncated: false }

/**
 * Resolve a caller-supplied section name against a project's real sections: exact slug first,
 * then the synonym table. Returns every match, in the project's own order.
 */
export function matchSections(docs: Doc[], wanted: string): Doc[] {
  const exact = docs.filter((d) => d.section === wanted)
  if (exact.length) return exact
  const words = SECTION_SYNONYMS[wanted] ?? [wanted.replace(/-/g, ' ')]
  return docs.filter((d) => {
    const heading = (d.heading ?? '').toLowerCase()
    return words.some((w) => heading.includes(w))
  })
}

export function getContext(index: Doc[], id: string, section?: string): ContextResult {
  const doc = index.find((d) => d.id === id)
  if (!doc) return { found: false, message: NO_MATCH }

  const sections = doc.type === 'project' ? index.filter((d) => d.type === 'research' && d.project === doc.project) : []
  const availableSections = sections.length ? sections.map((d) => d.section!) : undefined

  if (!section) return { found: true, ...pick(doc), ...cap(doc.text), availableSections }

  if (doc.type !== 'project' && doc.type !== 'research') {
    return { found: false, message: `${NO_MATCH} This record has no sections.` }
  }
  const pool = doc.type === 'project' ? sections : [doc]
  const hits = matchSections(pool, section)
  if (!hits.length) {
    return {
      found: false,
      message: `${NO_MATCH} "${section}" is not a section of ${doc.source.title}.`,
      availableSections: pool.map((d) => d.section!),
    }
  }
  const text = hits.map((d) => `## ${d.heading}\n${d.text}`).join('\n\n')
  const first = hits[0]!
  return {
    found: true,
    ...pick(first),
    title: doc.source.title,
    section: hits.map((d) => d.section).join(', '),
    ...cap(text),
    availableSections,
  }
}

const pick = (d: Doc) => ({ id: d.id, type: d.type, title: d.title, section: d.section, source: d.source, updatedAt: d.updatedAt })

// ---- compact views --------------------------------------------------------------------------

export function listProjects(content: Content, siteOrigin: string) {
  return {
    projects: content.projects
      .filter((p) => p.slug)
      .map((p) => ({
        id: `project:${p.slug}`,
        slug: p.slug,
        title: p.title,
        tagline: p.tagline,
        status: p.status.label,
        stack: p.stack,
        featured: p.featured,
        url: `${siteOrigin}/projects/${p.slug}`,
      })),
    updatedAt: content.updatedAt,
  }
}

export const PROFILE_SECTIONS = ['identity', 'skills', 'experience', 'education', 'certificates', 'links', 'resume'] as const
export type ProfileSection = (typeof PROFILE_SECTIONS)[number]

/**
 * The public profile, section by section. Only fields the site already shows a visitor; no
 * database ids, no file keys — the certificate id is a UUID and is deliberately left out.
 */
export function getProfile(content: Content, siteOrigin: string, section?: ProfileSection, resume?: string | null) {
  const s = content.site
  const all = {
    identity: { name: s.name, subtitle: s.subtitle, about: s.paragraphs, email: s.email, site: siteOrigin },
    skills: content.skills.map((g) => ({ group: g.heading, items: g.items })),
    experience: content.experience.map((e) => ({ title: e.title, detail: e.detail, when: e.hint })),
    education: content.education.map((e) => ({ title: e.title, detail: e.detail, when: e.hint })),
    certificates: content.certificates.map((c) => ({
      title: c.title,
      issuer: c.issuer,
      issued: c.issueDate || undefined,
      url: c.credentialUrl ?? c.fileUrl,
    })),
    links: content.socialLinks.map((l) => ({ label: l.label, handle: l.handle, url: l.url })),
    resume: {
      url: s.resumeUrl,
      sections: resumeSections(resume ?? '').map((r) => `resume:${r.slug}`),
      ...(section === 'resume' && resume ? cap(resume) : {}),
    },
  }
  const body: Partial<typeof all> = section ? { [section]: all[section] } : all
  return { ...body, source: { type: 'profile' as const, title: s.name, url: siteOrigin }, updatedAt: content.updatedAt }
}

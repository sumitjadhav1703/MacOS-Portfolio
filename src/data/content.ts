// The shape the CMS serves and the desktop consumes. One module, imported by three places:
// the Worker (to build /api/content), the seed script (to write the first migration) and
// src/os/content.tsx (to hydrate the desktop).
//
// FALLBACK is assembled from the original src/data modules. It is what the desktop renders on
// first paint and what it keeps rendering if the API is unreachable, so the recruiter never
// waits on a network call and never sees an empty portfolio.

import { PROJECTS, slugOf } from './projects'
import type { Project as BaseProject } from './projects'
import { PROFILE_LINKS, EMAIL } from './profile'
import type { ProfileLink } from './profile'
import { PROFILE, SKILL_GROUPS, EXPERIENCE, EDUCATION, RESUME_FILE } from './sections'
import type { Entry, SkillGroup } from './sections'
import {
  TERM,
  NEOFETCH_ART,
  NEOFETCH_ROWS,
  PROJ_ALIAS,
  KB,
  AI_FALLBACK,
  AI_SUGGESTIONS,
  SHORTCUTS,
} from './os'

export type { FlowStep, Metric, SectionBody, ProjectSection, ProjectLink } from './projects'
export type { ProfileLink } from './profile'
export type { Entry, SkillGroup } from './sections'

/** A project as the CMS stores it: the original shape plus the fields admin needs. */
export type Project = BaseProject & {
  slug: string
  /** Short name for the desktop icon, Finder folder and Launchpad tile. */
  desktopLabel: string
  featured: boolean
  /** R2-backed cover image, already resolved to a URL. */
  coverUrl?: string
  /** Extra names the Shell's `project <name>` command accepts, beyond the slug. */
  aliases?: string[]
}

export type Certificate = {
  id: string
  title: string
  issuer: string
  /** ISO date, or an empty string when unknown. */
  issueDate: string
  credentialUrl?: string
  /** Resolved URLs for the R2-backed certificate PDF and preview image. */
  fileUrl?: string
  imageUrl?: string
}

export type Site = {
  name: string
  initials: string
  subtitle: string
  paragraphs: string[]
  email: string
  /** Resolved URL — the packaged PDF until one is uploaded. */
  resumeUrl: string
}

export type OsContent = {
  term: Record<string, string>
  neofetchArt: string
  neofetchRows: [string, string][]
  /** Ask Sumit's knowledge base: keyword list → answer. First match wins. */
  kb: [string[], string][]
  aiFallback: string
  aiSuggestions: string[]
  shortcuts: [string, string][]
}

export type Content = {
  site: Site
  projects: Project[]
  certificates: Certificate[]
  experience: Entry[]
  education: Entry[]
  skills: SkillGroup[]
  socialLinks: ProfileLink[]
  os: OsContent
  /** ISO timestamp of the newest edit, for the admin dashboard. */
  updatedAt: string
}

/**
 * The short labels the desktop grid and Finder carried as hardcoded lists before the CMS owned
 * them. Kept here as seed values so those surfaces look exactly as they did.
 */
const DESKTOP_LABELS: Record<string, string> = {
  'project-lazarus': 'Lazarus Sentinel',
  'project-ai-video': 'AI Video Assistant',
  'project-pm25': 'PM2.5 Forecasting',
  'project-sar': 'SAR Crop Mapping',
  'project-multi-agent': 'Multi-Agent Research',
  'project-airbnb': 'NYC Airbnb Classifier',
}

/** The aliases in src/data/os.ts, inverted onto the project they point at. */
function aliasesFor(id: string, slug: string): string[] {
  const extra = Object.entries(PROJ_ALIAS)
    .filter(([alias, target]) => target === id && alias !== slug)
    .map(([alias]) => alias)
  return extra.length ? extra : []
}

export const FALLBACK: Content = {
  site: {
    name: PROFILE.name,
    initials: PROFILE.initials,
    subtitle: PROFILE.subtitle,
    paragraphs: [...PROFILE.paragraphs],
    email: EMAIL,
    resumeUrl: RESUME_FILE,
  },
  projects: PROJECTS.map((p, i) => ({
    ...p,
    slug: slugOf(p),
    desktopLabel: DESKTOP_LABELS[p.id] ?? p.title,
    featured: i === 0,
    aliases: aliasesFor(p.id, slugOf(p)),
  })),
  certificates: [],
  experience: EXPERIENCE,
  education: EDUCATION,
  skills: SKILL_GROUPS,
  socialLinks: PROFILE_LINKS,
  os: {
    term: TERM,
    neofetchArt: NEOFETCH_ART,
    neofetchRows: NEOFETCH_ROWS,
    kb: KB,
    aiFallback: AI_FALLBACK,
    aiSuggestions: AI_SUGGESTIONS,
    shortcuts: SHORTCUTS,
  },
  updatedAt: '1970-01-01T00:00:00.000Z',
}

/**
 * Ask Sumit. The stored knowledge base is consulted first, so seeded answers behave exactly as
 * they did before the CMS; projects added through admin are matched afterwards on slug, alias
 * and title so a new project is never met with the fallback.
 */
export function answerFrom(content: Content, question: string): string {
  const q = question.toLowerCase()
  for (const [keys, answer] of content.os.kb) if (keys.some((k) => q.includes(k))) return answer
  for (const p of content.projects) {
    const keys = [p.slug, ...(p.aliases ?? []), p.title.toLowerCase()]
    if (keys.some((k) => k && q.includes(k))) return `${p.title} — ${p.tagline}`
  }
  return content.os.aiFallback
}

/** Every skill name, flattened. Replaces the hand-maintained SKILL_INDEX. */
export function skillIndex(content: Content): string[] {
  return content.skills.flatMap((g) => g.items)
}

/** Shell aliases: each project answers to its slug plus whatever aliases it carries. */
export function projectAliases(content: Content): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of content.projects) {
    out[p.slug] = p.id
    for (const a of p.aliases ?? []) out[a] = p.id
  }
  return out
}

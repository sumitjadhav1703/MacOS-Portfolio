import { FALLBACK } from '../data/content'
import type { Project } from '../data/content'
import type { AppId, StaticAppId } from './types'

/**
 * Window titles by app id.
 *
 * Project titles are content, so this map is seeded from the compiled-in fallback and then kept
 * in step by ContentProvider (see `registerTitles`). Mutating a module-level map — rather than
 * threading content through the eight chrome components that read a title — is what keeps the
 * dock menus, title bars, Mission Control and Spotlight working unchanged for a project the CMS
 * added after the build.
 */
export const TITLES: Record<string, string> = {
  finder: 'Workspace',
  terminal: 'Shell',
  safari: 'Safari',
  'sumit-ai': 'Ask Sumit',
  about: 'About',
  resume: 'Sumit_Jadhav_Resume.pdf',
  contact: 'Reach Out',
  settings: 'System',
  trash: 'Trash',
  code: 'Code',
  skills: 'Skills',
  education: 'Education',
  experience: 'Experience',
  certificates: 'Certificates',
  monitor: 'System Monitor',
  ...Object.fromEntries(FALLBACK.projects.map((p) => [p.id, p.title])),
}

/**
 * Called by ContentProvider whenever content arrives. Project entries are replaced wholesale
 * rather than merged, so a project unpublished in the CMS stops appearing in Spotlight and
 * Launchpad instead of lingering as a title with nothing behind it.
 */
export function registerTitles(projects: Project[]): void {
  for (const id of Object.keys(TITLES)) if (id.startsWith('project-')) delete TITLES[id]
  for (const project of projects) TITLES[project.id] = project.title
}

/** Never undefined, so callers can split or slice the result without a guard. */
export const titleOf = (id: string): string => TITLES[id] ?? id

/** Default window size per app; anything unlisted — every project — opens at 780×520. */
export const SIZE: Partial<Record<StaticAppId, [number, number]>> = {
  terminal: [720, 440],
  safari: [900, 600],
  finder: [860, 520],
  'sumit-ai': [620, 560],
  about: [640, 470],
  resume: [820, 620],
  contact: [700, 520],
  settings: [820, 560],
  trash: [520, 320],
  skills: [720, 520],
  education: [720, 420],
  experience: [720, 460],
  certificates: [700, 400],
  code: [880, 560],
  monitor: [720, 520],
}

/** Which dock item bounces / shows a running dot for a given app. */
export const DOCK_FOR: Partial<Record<StaticAppId, AppId>> = {
  finder: 'finder',
  terminal: 'terminal',
  safari: 'safari',
  'sumit-ai': 'sumit-ai',
  contact: 'contact',
  settings: 'settings',
  trash: 'trash',
  code: 'code',
}

/**
 * A project the CMS added after this build has no entry in TITLES until content loads, so the
 * shape of the id is the authority, not the registry.
 */
export const isAppId = (v: string): v is AppId => v in TITLES || /^project-[a-z0-9-]+$/.test(v)

export const DEFAULT_SIZE: [number, number] = [780, 520]

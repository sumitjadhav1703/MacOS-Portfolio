// The only things the MCP layer is allowed to hold.
//
// Tool code receives a `ReadonlyContextSource`, never the Worker's `env`. That is the read-only
// boundary in type form: with no D1, R2, KV, secret or admin handler in reach, a future tool
// cannot write something by accident, because there is nothing here to write with.

import type { Content } from '../../src/data/content'

export type ReadonlyContextSource = {
  /** The published bundle — the same object `/api/content` serves. Already `published = 1`. */
  getContent(): Promise<Content>
  /** Public origin of the portfolio, used to build source URLs. */
  siteOrigin: string
}

export const DOC_TYPES = [
  'project',
  'research',
  'profile',
  'experience',
  'education',
  'skill',
  'certificate',
] as const

export type DocType = (typeof DOC_TYPES)[number]

export type Source = {
  type: DocType
  title: string
  url: string
  /** Project slug, for anything that belongs to a project. */
  slug?: string
  /** Section slug, for a `research` document. */
  section?: string
}

/** One retrievable record, derived from the bundle on every request. */
export type Doc = {
  /** `<type>:<key>` — built from slugs and titles, never from a database id. */
  id: string
  type: DocType
  title: string
  text: string
  /** Extra words that should find this doc but are not worth returning (aliases, labels). */
  extra?: string
  project?: string
  section?: string
  /** The section's own heading, as the project shows it. */
  heading?: string
  source: Source
  updatedAt: string
}

export const NO_MATCH = 'No matching published context was found.'

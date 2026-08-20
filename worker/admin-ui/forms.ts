// Form logic with no React in it, so it can be tested without a DOM.

/**
 * The Worker answers a failed write with prose messages that each begin with the column they are
 * about — `"title is required"`, `"credential_url must be a valid http, https or mailto URL"`.
 * That prefix is enough to put the message under the field that caused it, instead of joining
 * them into one banner sentence the author then has to match up against the form by hand.
 *
 * Only the first message per column is kept: a field with two complaints has one problem.
 */
export function fieldErrors(messages: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const message of messages) {
    const col = message.split(' ')[0]
    if (col && !(col in out)) out[col] = message
  }
  return out
}

/**
 * The slug a title suggests. Matches the Worker's `^[a-z0-9][a-z0-9-]*$` rule, so a suggestion is
 * never something the server would then refuse.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
}

/**
 * Client-side URL check, deliberately the same allowlist worker/tables.ts enforces. This is the
 * faster of the two answers, never the authoritative one: the Worker validates every write again
 * whatever this said (spec §15).
 */
export function urlProblem(text: string, required = false): string | null {
  const value = text.trim()
  if (!value) return required ? 'A URL is needed here.' : null
  try {
    const url = new URL(value)
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
      return 'Use an http, https or mailto address.'
    }
    return null
  } catch {
    return 'That is not a valid URL.'
  }
}

/** The certificate date rule, mirrored from the Worker: a year, a month, or a full date. */
export function dateProblem(text: string): string | null {
  const value = text.trim()
  if (!value) return null
  return /^\d{4}(-\d{2}(-\d{2})?)?$/.test(value) ? null : 'Use YYYY, YYYY-MM or YYYY-MM-DD.'
}

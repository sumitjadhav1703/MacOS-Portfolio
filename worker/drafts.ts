// The draft state for projects, as pure functions.
//
// A draft is the *validated column values* of a pending edit, stored as one JSON cell on the row
// it belongs to. Keeping it in the same shape as the live columns is what makes publishing a
// straight copy rather than a second mapping layer that can drift from the first.
//
// Nothing here touches D1, so the rules below are testable without a database.

import type { Field, Validated } from './tables'
import { validate } from './tables'

/** What a validated draft cell holds: column name → the value that would be written. */
export type DraftValues = Record<string, string | number>

/**
 * A draft cell is parsed defensively. A corrupt one means "no pending edit", never a thrown
 * request — the live columns are still intact and the editor can simply start again.
 */
export function parseDraft(cell: unknown): DraftValues | null {
  if (typeof cell !== 'string' || !cell) return null
  try {
    const out = JSON.parse(cell)
    return out && typeof out === 'object' && !Array.isArray(out) ? (out as DraftValues) : null
  } catch {
    return null
  }
}

/**
 * Validate an incoming editor body into a draft.
 *
 * `partial` is false on purpose: the editor sends the whole form, so a missing title is caught
 * while the author is still looking at the form rather than at publish time, when the message
 * would be about a screen they have already left.
 */
export function draftFrom(fields: Record<string, Field>, body: Record<string, unknown>): Validated {
  return validate(fields, body, false)
}

/**
 * What actually gets stored in the cell: the body, narrowed to columns this table owns, and
 * *before* validation serialises the JSON ones.
 *
 * Storing the validated output instead would round-trip a list through `JSON.stringify` on the
 * way in and hand a string back to the list check on the way out, so publishing its own draft
 * would fail validation. Keeping the author's shape means the draft is validated by exactly the
 * same rules going in and coming out.
 */
export function pickFields(
  fields: Record<string, Field>,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const name of Object.keys(fields)) {
    if (Object.prototype.hasOwnProperty.call(body, name)) out[name] = body[name]
  }
  return out
}

/**
 * The values that publishing writes. The draft is validated a second time, with the same
 * create-strength rules, so a cell edited by any other route cannot be promoted into a live row
 * that create itself would have refused. No draft means publish only flips the flag.
 */
export function publishValues(
  fields: Record<string, Field>,
  draftCell: unknown,
): Validated {
  const draft = parseDraft(draftCell)
  if (!draft) return { values: { published: 1 }, errors: [] }
  const { values, errors } = validate(fields, draft, false)
  return { values: { ...values, published: 1 }, errors }
}

/**
 * A project's id is `project-<slug>` and the desktop uses it as the window id, so a renamed slug
 * has to carry its id with it — otherwise the row answers to one name in `/projects/<slug>` and
 * to another on the desktop. Returns null when the id is already right.
 */
export function renamedId(currentId: string, values: DraftValues): string | null {
  const slug = values.slug
  if (typeof slug !== 'string' || !slug) return null
  const next = `project-${slug}`
  return next === currentId ? null : next
}

/**
 * Optimistic concurrency, one string compare. The editor sends back the `updated_at` it loaded;
 * if the row has moved on since, the write is refused rather than silently overwriting whatever
 * the other tab saved. Callers that send nothing opt out, which is what the pre-existing
 * single-tab flows do.
 */
export function isStale(expected: unknown, actual: unknown): boolean {
  return typeof expected === 'string' && !!expected && expected !== actual
}

// ── Duplication ──────────────────────────────────────────────────────────────────────────────
// A copy is made from the live columns, never from the draft: duplicating a project you are
// midway through editing gives you the thing that is published, which is the only version that
// has a settled meaning.

/**
 * A slug no other project holds. `demo` → `demo-copy` → `demo-copy-2`.
 *
 * An existing `-copy` suffix is stripped first, so duplicating a duplicate does not grow
 * `demo-copy-copy-copy`, and the stem is trimmed to leave room for the counter inside the
 * column's 60-character limit.
 */
export function freeSlug(base: string, taken: Set<string>): string {
  const stem = `${(base || 'project').replace(/-copy(-\d+)?$/, '').slice(0, 45)}-copy`
  if (!taken.has(stem)) return stem
  for (let n = 2; n < 1000; n++) {
    const next = `${stem}-${n}`
    if (!taken.has(next)) return next
  }
  return `${stem}-${Date.now()}`
}

/** " (copy)" on the end, unless that would push the title past what the column accepts. */
export function copyTitle(title: unknown, max: number): string {
  const text = typeof title === 'string' ? title : ''
  const suffix = ' (copy)'
  return text.length + suffix.length <= max ? text + suffix : text
}

/**
 * The body a duplicate is created from: every column the table owns, taken off the live row.
 *
 * JSON columns come back out of D1 as text and are parsed here, because the copy goes through
 * the same `validate` + `create` path as a hand-typed project — the duplicate route knows how to
 * pick a name, and nothing else.
 */
export function copyValues(
  row: Record<string, unknown>,
  fields: Record<string, Field>,
  slug: string,
  order: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [name, field] of Object.entries(fields)) {
    const value = row[name]
    if (value === null || value === undefined) continue
    if (field.kind === 'json') {
      try {
        out[name] = JSON.parse(String(value))
      } catch {
        out[name] = []
      }
    } else {
      out[name] = value
    }
  }
  out.slug = slug
  out.display_order = order
  // A copy is never born public. Spec §33: duplicating must not put anything on the live site.
  out.published = 0
  const title = fields.title
  if (title && title.kind === 'text') out.title = copyTitle(row.title, title.max)
  return out
}

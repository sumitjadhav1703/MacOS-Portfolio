// Searching, filtering and sorting a content list — as pure functions, so the rules can be
// tested without a browser and reused by the global search palette.
//
// Everything happens on rows already in memory. The whole portfolio is a few dozen rows; asking
// the Worker to filter them would cost a round trip to answer a question the client can answer
// between keystrokes (spec §31, §51).

export type Row = Record<string, any>

export type Sort = 'order' | 'recent' | 'title'
export type Status = 'all' | 'published' | 'unpublished' | 'changes' | 'featured'
export type Query = { text: string; status: Status; sort: Sort }

/** Everything, in the order the author arranged. What a list shows before anyone types. */
export const ALL: Query = { text: '', status: 'all', sort: 'order' }

/**
 * The text one row is searched against. JSON columns arrive from D1 as their own source text, so
 * a project whose `stack` cell reads `["Python","PyTorch"]` is found by "pytorch" without this
 * having to know which columns hold lists.
 */
export function haystack(row: Row, cols: string[]): string {
  return cols
    .map((col) => row[col])
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
    .join(' ')
    .toLowerCase()
}

/** Every word must appear somewhere in the row, so "video assistant" narrows rather than widens. */
export function matches(row: Row, text: string, cols: string[]): boolean {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = haystack(row, cols)
  return words.every((word) => hay.includes(word))
}

export function keep(row: Row, status: Status): boolean {
  switch (status) {
    case 'published':
      return !!row.published
    case 'unpublished':
      return !row.published
    case 'changes':
      return !!row.draft
    case 'featured':
      return !!row.featured
    default:
      return true
  }
}

/**
 * Sorting never mutates the array it was given — the store hands out the same array the whole
 * admin reads, and a sort in place would silently rewrite the author's display order.
 */
export function applyQuery(rows: Row[], query: Query, cols: string[], titleCol: string): Row[] {
  const out = rows.filter((row) => keep(row, query.status) && matches(row, query.text, cols))
  if (query.sort === 'recent') {
    return [...out].sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))
  }
  if (query.sort === 'title') {
    return [...out].sort((a, b) =>
      String(a[titleCol] ?? '').localeCompare(String(b[titleCol] ?? ''), undefined, {
        sensitivity: 'base',
      }),
    )
  }
  return out
}

/** Reordering only means anything against the whole list in its own order. */
export const canReorder = (query: Query): boolean =>
  query.sort === 'order' && query.status === 'all' && !query.text.trim()

// Each pair is "divide by this, and the answer is in these". Seconds are where counting starts.
const UNITS: [number, string][] = [
  [60, 'minute'],
  [60, 'hour'],
  [24, 'day'],
  [7, 'week'],
  [4.35, 'month'],
  [12, 'year'],
]

/**
 * "3 hours ago". The exact stamp is still available on hover; this is for the answer the list is
 * actually asked, which is whether something was touched recently.
 */
export function relative(iso: unknown, now: number = Date.now()): string {
  if (typeof iso !== 'string' || !iso) return '—'
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return '—'
  let amount = (now - then) / 1000
  if (amount < 45) return 'just now'
  let unit = 'second'
  for (const [size, next] of UNITS) {
    if (amount < size) break
    amount /= size
    unit = next
  }
  const n = Math.round(amount)
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`
}

import { describe, expect, it } from 'vitest'
import { ALL, applyQuery, canReorder, haystack, keep, matches, relative } from './filters'

const rows = [
  { id: 'a', title: 'AI Video Assistant', stack: '["Python","PyTorch"]', published: 1, updated_at: '2026-08-02T00:00:00Z' },
  { id: 'b', title: 'Beacon', stack: '["React"]', published: 0, draft: '{"title":"x"}', updated_at: '2026-08-09T00:00:00Z' },
  { id: 'c', title: 'Cartographer', stack: '[]', published: 1, featured: 1, updated_at: '2026-08-05T00:00:00Z' },
]
const cols = ['title', 'stack']

describe('search', () => {
  it('reads inside a JSON column without being told which one', () => {
    expect(haystack(rows[0]!, cols)).toContain('pytorch')
    expect(matches(rows[0]!, 'pytorch', cols)).toBe(true)
  })

  it('narrows on every word rather than widening', () => {
    expect(matches(rows[0]!, 'video assistant', cols)).toBe(true)
    expect(matches(rows[0]!, 'video beacon', cols)).toBe(false)
  })

  it('matches everything when nothing was typed', () => {
    expect(matches(rows[1]!, '   ', cols)).toBe(true)
  })
})

describe('filters', () => {
  it('separates published, unpublished, pending and featured', () => {
    expect(rows.filter((r) => keep(r, 'published')).map((r) => r.id)).toEqual(['a', 'c'])
    expect(rows.filter((r) => keep(r, 'unpublished')).map((r) => r.id)).toEqual(['b'])
    expect(rows.filter((r) => keep(r, 'changes')).map((r) => r.id)).toEqual(['b'])
    expect(rows.filter((r) => keep(r, 'featured')).map((r) => r.id)).toEqual(['c'])
  })
})

describe('applyQuery', () => {
  it('leaves the author order alone by default', () => {
    expect(applyQuery(rows, ALL, cols, 'title').map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('sorts by newest and by title without mutating the input', () => {
    const before = rows.map((r) => r.id)
    expect(applyQuery(rows, { ...ALL, sort: 'recent' }, cols, 'title').map((r) => r.id)).toEqual([
      'b',
      'c',
      'a',
    ])
    expect(applyQuery(rows, { ...ALL, sort: 'title' }, cols, 'title').map((r) => r.id)).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(rows.map((r) => r.id)).toEqual(before)
  })

  it('combines a filter and a search', () => {
    const q = { text: 'react', status: 'unpublished' as const, sort: 'order' as const }
    expect(applyQuery(rows, q, cols, 'title').map((r) => r.id)).toEqual(['b'])
  })
})

describe('canReorder', () => {
  it('is only true when the list is showing everything in its own order', () => {
    expect(canReorder(ALL)).toBe(true)
    expect(canReorder({ ...ALL, sort: 'title' })).toBe(false)
    expect(canReorder({ ...ALL, text: 'x' })).toBe(false)
    expect(canReorder({ ...ALL, status: 'published' })).toBe(false)
  })
})

describe('relative', () => {
  const now = Date.parse('2026-08-19T12:00:00Z')

  it('says something useful for each scale', () => {
    expect(relative('2026-08-19T11:59:50Z', now)).toBe('just now')
    expect(relative('2026-08-19T11:00:00Z', now)).toBe('1 hour ago')
    expect(relative('2026-08-17T12:00:00Z', now)).toBe('2 days ago')
  })

  it('does not invent a time it does not have', () => {
    expect(relative(null, now)).toBe('—')
    expect(relative('not a date', now)).toBe('—')
  })
})

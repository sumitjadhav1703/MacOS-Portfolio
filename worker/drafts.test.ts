import { describe, expect, it } from 'vitest'
import { SPECS, validate } from './tables'
import {
  copyValues,
  draftFrom,
  freeSlug,
  isStale,
  parseDraft,
  pickFields,
  publishValues,
  renamedId,
} from './drafts'

const fields = SPECS.projects!.fields

const form = {
  slug: 'demo',
  title: 'Demo',
  tagline: 'A demo',
  stack: ['React'],
  sections: [],
  links: [],
  aliases: [],
}

describe('draftFrom', () => {
  it('validates a draft with the same strength as creating the row', () => {
    const { values, errors } = draftFrom(fields, { ...form, title: '' })
    expect(errors).toContain('title is required')
    expect(values.title).toBeUndefined()
  })

  it('serialises JSON columns for the live row', () => {
    const { values, errors } = draftFrom(fields, form)
    expect(errors).toEqual([])
    expect(values.stack).toBe('["React"]')
  })
})

describe('pickFields', () => {
  it('keeps the author\'s shape, not the serialised one, so the draft revalidates', () => {
    const stored = pickFields(fields, { ...form, notAColumn: 'dropped' })
    expect(stored.stack).toEqual(['React'])
    expect(stored).not.toHaveProperty('notAColumn')
  })
})

describe('parseDraft', () => {
  it('reads back what pickFields wrote', () => {
    expect(parseDraft(JSON.stringify(pickFields(fields, form)))?.title).toBe('Demo')
  })

  it('treats an empty, corrupt or non-object cell as no pending edit', () => {
    expect(parseDraft(null)).toBeNull()
    expect(parseDraft('')).toBeNull()
    expect(parseDraft('{oops')).toBeNull()
    expect(parseDraft('[1,2]')).toBeNull()
  })
})

describe('publishValues', () => {
  it('promotes the draft and marks the project published', () => {
    const promoted = publishValues(fields, JSON.stringify(pickFields(fields, form)))
    expect(promoted.errors).toEqual([])
    expect(promoted.values.title).toBe('Demo')
    expect(promoted.values.published).toBe(1)
  })

  it('publishes with no draft by flipping the flag alone', () => {
    expect(publishValues(fields, null)).toEqual({ values: { published: 1 }, errors: [] })
  })

  it('refuses to promote a draft that create itself would have refused', () => {
    const { errors } = publishValues(fields, JSON.stringify({ slug: 'demo', title: '' }))
    expect(errors).toContain('title is required')
  })
})

describe('renamedId', () => {
  it('carries the id across when the slug moved', () => {
    expect(renamedId('project-old', { slug: 'new' })).toBe('project-new')
  })

  it('leaves the id alone when the slug did not move, or was not part of the write', () => {
    expect(renamedId('project-demo', { slug: 'demo' })).toBeNull()
    expect(renamedId('project-demo', { title: 'Demo' })).toBeNull()
  })
})

describe('isStale', () => {
  it('refuses a write holding a version the row has moved past', () => {
    expect(isStale('2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z')).toBe(true)
  })

  it('lets a matching version, or a caller that sent none, through', () => {
    expect(isStale('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(false)
    expect(isStale(undefined, '2026-01-01T00:00:00.000Z')).toBe(false)
  })
})

describe('freeSlug', () => {
  it('names the first copy after the original', () => {
    expect(freeSlug('demo', new Set(['demo']))).toBe('demo-copy')
  })

  it('counts up rather than colliding', () => {
    expect(freeSlug('demo', new Set(['demo', 'demo-copy', 'demo-copy-2']))).toBe('demo-copy-3')
  })

  it('does not grow a -copy chain when a copy is copied', () => {
    expect(freeSlug('demo-copy-2', new Set(['demo', 'demo-copy']))).toBe('demo-copy-2')
  })

  it('stays inside the 60-character slug limit', () => {
    const long = 'a'.repeat(60)
    const taken = new Set([long, `${'a'.repeat(45)}-copy`])
    expect(freeSlug(long, taken).length).toBeLessThanOrEqual(60)
  })
})

describe('copyValues', () => {
  const fields = SPECS.projects!.fields

  // A row as D1 hands it back: JSON columns are text, not arrays.
  const row = {
    id: 'project-demo',
    slug: 'demo',
    title: 'Demo',
    stack: '["Python","PyTorch"]',
    links: '[{"label":"Code","url":"https://github.com/x/y"}]',
    published: 1,
    featured: 1,
    cover_key: 'portfolio/projects/abc.png',
    draft: '{"title":"pending"}',
    created_at: 'x',
  }

  it('produces a body that create() accepts', () => {
    const values = copyValues(row, fields, 'demo-copy', 7)
    const { errors } = validate(fields, values, false)
    expect(errors).toEqual([])
  })

  it('never copies the published flag', () => {
    expect(copyValues(row, fields, 'demo-copy', 7).published).toBe(0)
  })

  it('keeps the shared cover reference rather than the draft', () => {
    const values = copyValues(row, fields, 'demo-copy', 7)
    expect(values.cover_key).toBe('portfolio/projects/abc.png')
    expect(values.draft).toBeUndefined()
    expect(values.title).toBe('Demo (copy)')
  })

  it('leaves a title alone when " (copy)" would overflow the column', () => {
    const title = 'x'.repeat(120)
    expect(copyValues({ ...row, title }, fields, 'demo-copy', 0).title).toBe(title)
  })
})

// The shapes the content pipeline meets when the database is not the tidy six-project seed:
// nothing published, one row, many rows, a field left empty, a JSON cell that got corrupted, and
// text nobody expected. Spec §4 — the cases that break a mapper long after the happy path is
// covered.

import { describe, expect, it } from 'vitest'
import { buildContent, mapProject } from './content'
import type { ContentRows } from './content'
import { parseDraft, pickFields, publishValues } from './drafts'
import { SPECS, validate } from './tables'
import { INVISIBLE_STRINGS, UNICODE_STRINGS, XSS_STRINGS } from './security-fixtures'

const ORIGIN = 'https://api.example.workers.dev'
const SITE = 'https://site.example.com'

const empty: ContentRows = {
  site: null,
  os: null,
  projects: [],
  certificates: [],
  experience: [],
  education: [],
  skills: [],
  social: [],
}

const fields = SPECS.projects!.fields
const project = (over: Record<string, unknown> = {}) => ({ slug: 'a', title: 'A', ...over })

describe('how many projects there are', () => {
  it('builds a whole bundle from none at all', () => {
    const content = buildContent(empty, ORIGIN, SITE)
    expect(content.projects).toEqual([])
    // Every consumer indexes into this object; a missing key is a crash on the desktop.
    for (const key of ['projects', 'certificates', 'experience', 'education', 'skills', 'socialLinks', 'site', 'os']) {
      expect(content, key).toHaveProperty(key)
    }
  })

  it('builds one from exactly one', () => {
    const content = buildContent({ ...empty, projects: [project()] }, ORIGIN, SITE)
    expect(content.projects).toHaveLength(1)
  })

  it('builds one from two hundred without losing or reordering any', () => {
    const many = Array.from({ length: 200 }, (_, i) => project({ slug: `p${i}`, title: `Project ${i}` }))
    const content = buildContent({ ...empty, projects: many }, ORIGIN, SITE)
    expect(content.projects).toHaveLength(200)
    expect(content.projects[0]!.slug).toBe('p0')
    expect(content.projects[199]!.slug).toBe('p199')
    expect(new Set(content.projects.map((p) => p.slug)).size).toBe(200)
  })
})

describe('fields left empty', () => {
  it('gives a project with no stack, links, sections or aliases empty lists, never undefined', () => {
    const mapped = mapProject(project(), ORIGIN)
    expect(mapped.stack).toEqual([])
    expect(mapped.links).toEqual([])
    expect(mapped.sections).toEqual([])
    expect(mapped.aliases).toEqual([])
  })

  it('leaves the cover out rather than pointing at a file that is not there', () => {
    expect(mapProject(project({ cover_key: null }), ORIGIN).coverUrl).toBeFalsy()
    expect(mapProject(project({ cover_key: '' }), ORIGIN).coverUrl).toBeFalsy()
  })

  it('falls back to the packaged resume when none has been uploaded', () => {
    const content = buildContent({ ...empty, site: { resume_key: null } }, ORIGIN, SITE)
    expect(content.site.resumeUrl).toBe(`${SITE}/Sumit_Jadhav_Resume.pdf`)
  })

  it('survives a site row that does not exist yet', () => {
    expect(() => buildContent(empty, ORIGIN, SITE)).not.toThrow()
    expect(buildContent(empty, ORIGIN, SITE).site).toBeTruthy()
  })
})

describe('cells that are not what the schema promised', () => {
  it('degrades a corrupt JSON column to its fallback instead of throwing', () => {
    for (const broken of ['{oops', 'null', '"a string"', '42', '', '[1,2,', 'undefined']) {
      const mapped = mapProject(project({ stack: broken, links: broken, sections: broken }), ORIGIN)
      expect(Array.isArray(mapped.stack), broken).toBe(true)
      expect(Array.isArray(mapped.links), broken).toBe(true)
    }
  })

  it('does not let one broken row take the whole bundle down', () => {
    const content = buildContent(
      { ...empty, projects: [project({ slug: 'ok' }), project({ slug: 'bad', stack: '{{{' })] },
      ORIGIN,
      SITE,
    )
    expect(content.projects).toHaveLength(2)
  })

  it('reads a draft cell defensively', () => {
    for (const cell of [null, undefined, '', '{oops', '[]', '"text"', 42, {}]) {
      expect(() => parseDraft(cell)).not.toThrow()
    }
  })
})

describe('text nobody expected', () => {
  it('carries unicode and emoji through the mapper unchanged', () => {
    for (const title of UNICODE_STRINGS) {
      expect(mapProject(project({ title }), ORIGIN).title, title).toBe(title)
    }
  })

  it('carries markup through as text — escaping is the renderer’s job, not the mapper’s', () => {
    for (const tagline of XSS_STRINGS) {
      expect(mapProject(project({ tagline }), ORIGIN).tagline, tagline).toBe(tagline)
    }
  })

  it('accepts a title at exactly the maximum and refuses one character more', () => {
    const max = (fields.title as { max: number }).max
    expect(validate(fields, { slug: 'a', title: 'x'.repeat(max) }, false).errors).toEqual([])
    expect(validate(fields, { slug: 'a', title: 'x'.repeat(max + 1) }, false).errors).not.toEqual([])
  })

  it('keeps an invisible character out of a slug, where two slugs would look identical', () => {
    for (const slug of INVISIBLE_STRINGS) {
      expect(validate(fields, { slug, title: 'A' }, false).errors, slug).not.toEqual([])
    }
  })
})

describe('publish, edit, unpublish, republish', () => {
  // The sequence that catches a state machine that only works in one direction. Each step calls
  // the same pure function the admin route calls, so what is asserted here is what the route does.
  //
  // A draft cell holds the whole field set, not a delta: `pickFields` narrows the submitted body
  // to this table's columns and stores the author's shape, and `publishValues` re-validates it
  // with create-strength rules. That is why a partial draft cannot be promoted — and why this
  // test builds a full one.

  const cellFor = (body: Record<string, unknown>) => JSON.stringify(pickFields(fields, body))

  it('keeps the draft and the live row consistent all the way round', () => {
    const live = { slug: 'pm25', title: 'PM2.5 Forecasting', published: 1, tagline: 'First' }

    // 1. Edit a published project. The edit becomes a draft; the live row is untouched.
    const draft = cellFor({ ...live, tagline: 'Second' })
    expect(parseDraft(draft)).toMatchObject({ tagline: 'Second' })
    expect(live.tagline).toBe('First')

    // 2. Publish. The draft is promoted through the same validation a hand-typed project gets,
    //    and the row comes out published.
    const published = publishValues(fields, draft)
    expect(published.errors).toEqual([])
    expect(published.values.tagline).toBe('Second')
    expect(published.values.published).toBe(1)

    // 3. Unpublish, then republish. The promoted values survive the round trip untouched.
    const unpublished = validate(fields, { ...published.values, published: 0 }, true)
    expect(unpublished.errors).toEqual([])
    expect(unpublished.values.published).toBe(0)
    expect(unpublished.values.tagline).toBe('Second')

    const republished = validate(fields, { ...unpublished.values, published: 1 }, true)
    expect(republished.errors).toEqual([])
    expect(republished.values.published).toBe(1)
    expect(republished.values.tagline).toBe('Second')
  })

  it('flips the flag and nothing else when there is no draft to promote', () => {
    for (const cell of [null, '', '{oops', '[]']) {
      const promoted = publishValues(fields, cell)
      expect(promoted.errors, String(cell)).toEqual([])
      expect(promoted.values, String(cell)).toEqual({ published: 1 })
    }
  })

  it('will not promote a draft that create itself would have refused', () => {
    for (const bad of [
      { slug: 'Not A Slug', title: 'OK' },
      { slug: 'ok', title: '' },
      { slug: '', title: 'OK' },
      { slug: 'ok' }, // title missing entirely
    ]) {
      expect(publishValues(fields, cellFor(bad)).errors, JSON.stringify(bad)).not.toEqual([])
    }
  })

  it('will not promote a draft carrying a link that would execute', () => {
    const cell = cellFor({
      slug: 'ok',
      title: 'OK',
      links: [{ label: 'Demo', url: 'javascript:alert(1)' }],
    })
    expect(publishValues(fields, cell).errors).not.toEqual([])
  })

  it('never shows a draft through the public mapper, whatever it holds', () => {
    const mapped = mapProject(
      project({ draft: cellFor({ slug: 'ok', title: 'Unreleased thing', tagline: 'secret' }) }),
      ORIGIN,
    )
    expect(JSON.stringify(mapped)).not.toContain('Unreleased thing')
    expect(JSON.stringify(mapped)).not.toContain('secret')
    expect(mapped).not.toHaveProperty('draft')
  })
})

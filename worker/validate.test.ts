import { describe, expect, it } from 'vitest'
import { SINGLETONS, SPECS, urlAllowed, validate } from './tables'
import { isOwnKey, makeKey, sniff } from './files'
import {
  DANGEROUS_URLS,
  INVISIBLE_STRINGS,
  NOT_SSRF_RELEVANT,
  OVERSIZED,
  SAFE_URLS,
  SQL_STRINGS,
  UNICODE_STRINGS,
  XSS_STRINGS,
} from './security-fixtures'

const projectFields = SPECS.projects!.fields

const bytes = (...values: number[]) => new Uint8Array(values)

describe('validate', () => {
  it('accepts a well-formed project and serialises its JSON columns', () => {
    const { values, errors } = validate(
      projectFields,
      { slug: 'demo', title: 'Demo', stack: ['React'], published: true },
      false,
    )
    expect(errors).toEqual([])
    expect(values.stack).toBe('["React"]')
    expect(values.published).toBe(1)
  })

  it('requires the fields marked required, but only on create', () => {
    expect(validate(projectFields, { title: 'No slug' }, false).errors).toContain('slug is required')
    expect(validate(projectFields, { title: 'No slug' }, true).errors).toEqual([])
  })

  it('rejects slugs that would not be safe in a URL or an app id', () => {
    for (const slug of ['Demo', 'de mo', '../etc', '-lead', 'de/mo', 'demo!']) {
      expect(validate(projectFields, { slug, title: 'X' }, false).errors).toContain(
        'slug has an invalid format',
      )
    }
    expect(validate(projectFields, { slug: 'a-good-slug-9', title: 'X' }, false).errors).toEqual([])
  })

  it('rejects over-long text and over-full lists', () => {
    expect(validate(projectFields, { title: 'x'.repeat(121), slug: 'a' }, false).errors).toEqual([
      'title is longer than 120 characters',
    ])
    expect(
      validate(projectFields, { slug: 'a', title: 'X', stack: Array(41).fill('x') }, false).errors,
    ).toContain('stack has more than 40 entries')
  })

  it('rejects a list that should hold text but does not', () => {
    expect(validate(projectFields, { slug: 'a', title: 'X', stack: [1, 2] }, false).errors).toContain(
      'stack must be a list of text values',
    )
  })

  it('rejects URLs with a scheme that is not http, https or mailto', () => {
    const fields = SPECS['social-links']!.fields
    const bad = validate(fields, { slug: 'x', label: 'X', url: 'javascript:alert(1)' }, false)
    expect(bad.errors).toContain('url must be a valid http, https or mailto URL')
    expect(validate(fields, { slug: 'x', label: 'X', url: 'https://ok.example' }, false).errors).toEqual([])
  })

  it('drops keys that are not part of the spec instead of writing them', () => {
    const { values } = validate(projectFields, { slug: 'a', title: 'X', id: 'hijack' }, false)
    expect(values.id).toBeUndefined()
  })
})

describe('upload safety', () => {
  it('identifies files by their leading bytes, not their name or claimed type', () => {
    expect(sniff(bytes(0x25, 0x50, 0x44, 0x46, 0x2d))?.mime).toBe('application/pdf')
    expect(sniff(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mime).toBe('image/png')
    expect(sniff(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe('image/jpeg')
    // '#!/bin/sh' — a shell script called evil.png
    expect(sniff(bytes(0x23, 0x21, 0x2f, 0x62, 0x69, 0x6e))).toBeNull()
    expect(sniff(bytes())).toBeNull()
  })

  it('generates keys that carry nothing from the client', () => {
    const key = makeKey('projects', 'png')
    expect(key).toMatch(/^portfolio\/projects\/[0-9a-f-]{36}\.png$/)
    expect(isOwnKey(key)).toBe(true)
  })

  it('refuses keys it did not generate, including traversal shapes', () => {
    for (const key of [
      'portfolio/projects/../../etc/passwd',
      '../secret',
      '/etc/passwd',
      'portfolio/projects/anything.png',
      'portfolio/evil/00000000-0000-0000-0000-000000000000.png',
      'portfolio/projects/00000000-0000-0000-0000-000000000000.svg',
    ]) {
      expect(isOwnKey(key)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// The URL allowlist, and the hole it was added to close.
//
// Until this, `validate`'s `url` kind guarded exactly two columns — social_links.url and
// certificates.credential_url. `projects.links` is a `json` field, so it was checked for shape
// and size and nothing else, while `mapProject` copies it verbatim into the public bundle and
// the desktop renders each entry straight into an href. The admin UI's own check is
// client-side, so a direct PATCH walked past it.

describe('urlAllowed', () => {
  it('permits the three schemes a link may use', () => {
    for (const url of SAFE_URLS) expect(urlAllowed(url), url).toBe(true)
  })

  it('refuses every scheme that executes or reads the local disk', () => {
    for (const url of DANGEROUS_URLS) expect(urlAllowed(url.trim()), url).toBe(false)
  })

  it('does not treat a private or loopback host as a reason to refuse', () => {
    // The Worker renders these; it never fetches them. Blocking them would break real demo links.
    for (const url of NOT_SSRF_RELEVANT) expect(urlAllowed(url), url).toBe(true)
  })
})

describe('project links', () => {
  const fields = SPECS.projects!.fields

  it('accepts a normal set of links', () => {
    const { errors, values } = validate(
      fields,
      { links: [{ label: 'Code', url: 'https://github.com/x/y' }, { label: 'Demo', url: 'https://example.com' }] },
      true,
    )
    expect(errors).toEqual([])
    expect(JSON.parse(String(values.links))).toHaveLength(2)
  })

  it('refuses a link whose URL would execute when clicked', () => {
    for (const url of DANGEROUS_URLS) {
      const { errors } = validate(fields, { links: [{ label: 'Demo', url }] }, true)
      expect(errors, url).not.toEqual([])
    }
  })

  it('refuses one bad link among good ones', () => {
    const { errors } = validate(
      fields,
      {
        links: [
          { label: 'Code', url: 'https://github.com/x/y' },
          { label: 'Bad', url: 'javascript:alert(1)' },
        ],
      },
      true,
    )
    expect(errors).not.toEqual([])
  })

  it('refuses a URL that is not text at all', () => {
    for (const url of [123, true, { href: 'https://x.com' }, ['https://x.com']]) {
      const { errors } = validate(fields, { links: [{ label: 'x', url }] }, true)
      expect(errors, JSON.stringify(url)).not.toEqual([])
    }
  })

  it('leaves a link with no URL alone — a label-only entry is not an attack', () => {
    for (const entry of [{ label: 'x' }, { label: 'x', url: '' }, { label: 'x', url: null }]) {
      const { errors } = validate(fields, { links: [entry] }, true)
      expect(errors, JSON.stringify(entry)).toEqual([])
    }
  })

  it('checks the same list the other URL columns are checked against', () => {
    // One allowlist, not two. If these ever disagree, one of them has been edited alone.
    for (const url of DANGEROUS_URLS) {
      const asLink = validate(SPECS.projects!.fields, { links: [{ url }] }, true).errors.length > 0
      const asColumn = validate(SPECS['social-links']!.fields, { url }, true).errors.length > 0
      expect(asLink, url).toBe(asColumn)
    }
  })
})

describe('the profile email', () => {
  const fields = SINGLETONS.site!.fields

  it('accepts an ordinary address', () => {
    expect(validate(fields, { email: 'sumit@example.com' }, true).errors).toEqual([])
    expect(validate(fields, { email: '' }, true).errors).toEqual([])
  })

  it('refuses something that is not an address, since it lands in a mailto href', () => {
    for (const email of ['javascript:alert(1)', 'not an email', 'a@b', '@example.com', 'a b@example.com']) {
      expect(validate(fields, { email }, true).errors, email).not.toEqual([])
    }
  })
})

describe('text fields under hostile input', () => {
  const fields = SPECS.projects!.fields

  it('stores markup as text rather than refusing it — React escapes on render', () => {
    for (const title of XSS_STRINGS) {
      const { errors, values } = validate(fields, { title }, true)
      expect(errors, title).toEqual([])
      expect(values.title, title).toBe(title)
    }
  })

  it('stores injection-shaped text as text — D1 only ever sees bound parameters', () => {
    for (const title of SQL_STRINGS) {
      expect(validate(fields, { title }, true).errors, title).toEqual([])
    }
  })

  it('keeps unicode and emoji intact', () => {
    for (const title of UNICODE_STRINGS) {
      const { values } = validate(fields, { title }, true)
      expect(values.title, title).toBe(title)
    }
  })

  it('refuses those same strings where a slug is expected', () => {
    for (const slug of [...XSS_STRINGS, ...SQL_STRINGS, ...INVISIBLE_STRINGS, ...UNICODE_STRINGS]) {
      expect(validate(fields, { slug }, true).errors, slug).not.toEqual([])
    }
  })

  it('refuses an oversized value on every text field it has', () => {
    for (const [name, field] of Object.entries(fields)) {
      if (field.kind !== 'text') continue
      expect(validate(fields, { [name]: OVERSIZED }, true).errors, name).not.toEqual([])
    }
  })
})

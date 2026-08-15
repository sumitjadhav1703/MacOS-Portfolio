import { describe, expect, it } from 'vitest'
import { SPECS, validate } from './tables'
import { isOwnKey, makeKey, sniff } from './files'

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

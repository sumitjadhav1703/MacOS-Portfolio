import { describe, expect, it } from 'vitest'
import { dateProblem, fieldErrors, slugify, urlProblem } from './forms'

describe('fieldErrors', () => {
  it('files each message under the column it names', () => {
    expect(
      fieldErrors(['title is required', 'credential_url must be a valid http, https or mailto URL']),
    ).toEqual({
      title: 'title is required',
      credential_url: 'credential_url must be a valid http, https or mailto URL',
    })
  })

  it('keeps the first complaint per column, because a field has one problem', () => {
    expect(fieldErrors(['slug is required', 'slug has an invalid format']).slug).toBe(
      'slug is required',
    )
  })

  it('is empty for no messages', () => {
    expect(fieldErrors([])).toEqual({})
  })
})

describe('slugify', () => {
  it('suggests the slug a title implies', () => {
    expect(slugify('AI Video Assistant')).toBe('ai-video-assistant')
    expect(slugify('C++ / Rust  Bridge!')).toBe('c-rust-bridge')
  })

  it('never suggests something the Worker would refuse', () => {
    const pattern = /^[a-z0-9][a-z0-9-]*$/
    for (const title of ['  Leading spaces ', '—dashes—', 'x'.repeat(200)]) {
      const slug = slugify(title)
      if (slug) expect(pattern.test(slug)).toBe(true)
      expect(slug.length).toBeLessThanOrEqual(60)
    }
  })

  it('has nothing to suggest for a title with no letters', () => {
    expect(slugify('!!!')).toBe('')
  })
})

describe('urlProblem', () => {
  it('accepts what the Worker accepts', () => {
    expect(urlProblem('https://github.com/x')).toBeNull()
    expect(urlProblem('mailto:someone@example.com')).toBeNull()
  })

  it('refuses a scheme the Worker would refuse', () => {
    expect(urlProblem('javascript:alert(1)')).toBe('Use an http, https or mailto address.')
    expect(urlProblem('not a url')).toBe('That is not a valid URL.')
  })

  it('treats blank as a question of whether the field is required', () => {
    expect(urlProblem('')).toBeNull()
    expect(urlProblem('  ', true)).toBe('A URL is needed here.')
  })
})

describe('dateProblem', () => {
  it('takes a year, a month or a day', () => {
    for (const value of ['', '2026', '2026-08', '2026-08-19']) expect(dateProblem(value)).toBeNull()
    expect(dateProblem('19/08/2026')).toBe('Use YYYY, YYYY-MM or YYYY-MM-DD.')
  })
})

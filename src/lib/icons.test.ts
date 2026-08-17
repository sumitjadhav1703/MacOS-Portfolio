import { describe, expect, it } from 'vitest'
import { hasIcon, hostLabel, platformSlug, tagSlug } from './icons'

describe('platformSlug', () => {
  it('reads the platform off the host, not off a stored field', () => {
    expect(platformSlug('https://github.com/sumitjadhav1703/repo')).toBe('github')
    expect(platformSlug('https://www.github.com/sumitjadhav1703')).toBe('github')
    expect(platformSlug('https://huggingface.co/spaces/sumit1703/pm25')).toBe('huggingface')
    expect(platformSlug('https://www.kaggle.com/sumitjadhav')).toBe('kaggle')
  })

  // Simple Icons carries no LinkedIn mark, and hand-drawing a trademark is worse than not
  // drawing it — so the profile card falls back to the generic ring.
  it('falls back rather than inventing a mark the catalogue refuses to carry', () => {
    expect(platformSlug('https://www.linkedin.com/in/sumit')).toBeNull()
  })

  it('follows a subdomain to its platform', () => {
    expect(platformSlug('https://sumit.github.io/thing')).toBe('github')
    expect(platformSlug('https://pm25-forecast.streamlit.app')).toBe('streamlit')
    expect(platformSlug('https://portfolio-os.vercel.app')).toBe('vercel')
  })

  it('maps mailto: to the local mail glyph', () => {
    expect(platformSlug('mailto:someone@example.com')).toBe('email')
    expect(platformSlug('MAILTO:someone@example.com')).toBe('email')
  })

  it('returns null rather than guessing, and never throws', () => {
    expect(platformSlug('https://some-unknown-host.example/thing')).toBeNull()
    expect(platformSlug('not a url')).toBeNull()
    expect(platformSlug('')).toBeNull()
  })
})

describe('tagSlug', () => {
  it('normalises case and punctuation', () => {
    expect(tagSlug('Python')).toBe('python')
    expect(tagSlug('PYTHON')).toBe('python')
    expect(tagSlug('  PyTorch ')).toBe('pytorch')
    expect(tagSlug('C++')).toBe('cplusplus')
    expect(tagSlug('Hugging Face Spaces')).toBe('huggingface')
    expect(tagSlug('scikit-learn')).toBe('scikitlearn')
    expect(tagSlug('TypeScript')).toBe('typescript')
  })

  it('keeps conceptual tags bare', () => {
    expect(tagSlug('Capella Space X-band SAR')).toBeNull()
    expect(tagSlug('')).toBeNull()
  })
})

describe('hasIcon', () => {
  it('is true for catalogue slugs and the local glyph', () => {
    expect(hasIcon('python')).toBe(true)
    expect(hasIcon('PyTorch'.toLowerCase())).toBe(true)
    expect(hasIcon('email')).toBe(true)
  })

  it('is false for a technology with no mark, so the chip stays plain text', () => {
    expect(hasIcon('somethingnobodyhasalogofor')).toBe(false)
  })
})

describe('hostLabel', () => {
  it('strips the scheme and www', () => {
    expect(hostLabel('https://www.github.com/a/b')).toBe('github.com')
    expect(hostLabel('https://huggingface.co/spaces/x')).toBe('huggingface.co')
  })

  it('is empty for a non-web URL', () => {
    expect(hostLabel('mailto:a@b.c')).toBe('')
    expect(hostLabel('nonsense')).toBe('')
  })
})

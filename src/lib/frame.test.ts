import { describe, expect, it } from 'vitest'
import { checkableUrl, embedUrl, frameVerdict, isPrivateAddress, safeHref } from './frame'

const ORIGIN = 'https://portfolio.example'
const h = (init: Record<string, string>) => new Headers(init)

describe('frameVerdict', () => {
  it('refuses on X-Frame-Options', () => {
    expect(frameVerdict(h({ 'x-frame-options': 'DENY' }), ORIGIN)).toBe(false)
    expect(frameVerdict(h({ 'x-frame-options': 'sameorigin' }), ORIGIN)).toBe(false)
  })
  it('refuses on a frame-ancestors list that does not name us', () => {
    expect(frameVerdict(h({ 'content-security-policy': "default-src 'self'; frame-ancestors 'none'" }), ORIGIN)).toBe(false)
    expect(frameVerdict(h({ 'content-security-policy': "frame-ancestors 'self' https://other.example" }), ORIGIN)).toBe(false)
  })
  it('allows a wildcard, our origin, or no restriction at all', () => {
    expect(frameVerdict(h({ 'content-security-policy': 'frame-ancestors *' }), ORIGIN)).toBe(true)
    expect(frameVerdict(h({ 'content-security-policy': `frame-ancestors ${ORIGIN}/` }), ORIGIN)).toBe(true)
    expect(frameVerdict(h({ 'content-security-policy': "script-src 'self'" }), ORIGIN)).toBe(true)
    expect(frameVerdict(h({}), ORIGIN)).toBe(true)
  })
})

describe('checkableUrl', () => {
  it('takes public http(s) URLs only', () => {
    expect(checkableUrl('https://en.wikipedia.org/wiki/Cat')?.host).toBe('en.wikipedia.org')
    for (const bad of [
      null,
      'not a url',
      'javascript:alert(1)',
      'file:///etc/passwd',
      'http://localhost:8787',
      'http://127.0.0.1',
      'http://169.254.169.254/latest',
      'http://[::1]/',
      'http://printer.local',
      'https://user:pw@example.com',
    ]) expect(checkableUrl(bad), String(bad)).toBeNull()
  })
})

describe('embedUrl', () => {
  it('frames the embeddable twin of a Space or a Streamlit app, and anything else as typed', () => {
    expect(embedUrl('https://huggingface.co/spaces/sumit1703/pm25_Forecasting')).toBe('https://sumit1703-pm25-forecasting.hf.space/')
    expect(embedUrl('https://x-abc.streamlit.app/')).toBe('https://x-abc.streamlit.app/?embed=true')
    expect(embedUrl('https://huggingface.co/sumit1703')).toBe('https://huggingface.co/sumit1703')
    expect(embedUrl('https://en.wikipedia.org/wiki/Cat')).toBe('https://en.wikipedia.org/wiki/Cat')
  })
})

describe('safeHref', () => {
  it('keeps web and mail addresses, drops script and data URLs', () => {
    expect(safeHref('https://example.com/a')).toBe('https://example.com/a')
    expect(safeHref('mailto:a@b.co')).toBe('mailto:a@b.co')
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', 'nope']) {
      expect(safeHref(bad), bad).toBeNull()
    }
  })
})

describe('isPrivateAddress', () => {
  it('flags private, loopback and link-local addresses only', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) {
      expect(isPrivateAddress(ip), ip).toBe(true)
    }
    for (const ip of ['8.8.8.8', '172.32.0.1', '140.82.112.3', '2606:4700::1111']) expect(isPrivateAddress(ip), ip).toBe(false)
  })
})

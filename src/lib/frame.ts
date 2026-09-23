// Whether a page will agree to be shown inside Safari's iframe, decided from its response headers.
//
// A refusal cannot be detected from inside the browser (AGENTS.md rule 7): the frame fires `load`
// either way. The headers can be read, though — server-side, where CORS does not apply — so
// app/api/frame-check asks the host first and Safari only frames what will actually render.

/** True when a host name is something a public checker has no business fetching. */
export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true
  // Any IP literal, v4 or v6. Real sites are reached by name; a literal is almost always a probe.
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':')
}

/** The URL to check, or null when it is not a public http(s) address. */
export function checkableUrl(raw: string | null): URL | null {
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password || isPrivateHost(url.hostname)) return null
  return url
}

/** False when the headers forbid framing by `origin`, true otherwise. */
export function frameVerdict(headers: Headers, origin: string): boolean {
  const xfo = headers.get('x-frame-options')?.trim().toLowerCase()
  if (xfo === 'deny' || xfo === 'sameorigin') return false
  const csp = headers.get('content-security-policy') ?? ''
  const directive = csp
    .split(',')
    .flatMap((policy) => policy.split(';'))
    .map((d) => d.trim().split(/\s+/))
    .find(([name]) => name?.toLowerCase() === 'frame-ancestors')
  if (!directive) return true
  const host = new URL(origin).host
  return directive.slice(1).some((source) => {
    const src = source.toLowerCase().replace(/\/$/, '')
    return src === '*' || src === 'https:' || src === origin.toLowerCase() || src === host
  })
}

/**
 * The address to frame for a URL whose host publishes an embeddable twin. A Hugging Face Space
 * page refuses framing but the app itself, on `<user>-<space>.hf.space`, does not; a Streamlit
 * Cloud app sends a cookie redirect loop unless it is asked for its `?embed=true` view. Every
 * other URL is framed as typed.
 */
export function embedUrl(raw: string): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return raw
  }
  const host = url.hostname.toLowerCase()
  const space = host === 'huggingface.co' && url.pathname.match(/^\/spaces\/([^/]+)\/([^/]+)\/?$/)
  if (space) {
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return `https://${slug(space[1]!)}-${slug(space[2]!)}.hf.space/`
  }
  if (host.endsWith('.streamlit.app')) {
    url.searchParams.set('embed', 'true')
    return url.href
  }
  return raw
}

import { lookup } from 'node:dns/promises'
import { checkableUrl, frameVerdict, isPrivateAddress } from '../../../src/lib/frame'

// GET /api/frame-check?url=… → { frameable: true | false | null }
//
// Safari asks this before it frames a page, so a host that refuses shows a clear "open in a new
// tab" card instead of a blank pane. null means the host could not be asked; Safari then frames
// optimistically, as it always did. Only the headers are read — the body is cancelled unread.
//
// Each hop is checked twice: by name (checkableUrl) and by every address the name resolves to, so
// a public name pointed at 127.0.0.1 or a metadata address is refused before it is fetched.
// ponytail: fetch resolves the name again, so a DNS-rebinding host could still answer differently
// the second time. Pin the resolved address with a custom dispatcher if this ever runs on a
// network with something to reach; Vercel's functions have none.

async function resolvesPublic(url: URL): Promise<boolean> {
  const addresses = await lookup(url.hostname, { all: true })
  return addresses.length > 0 && !addresses.some((a) => isPrivateAddress(a.address))
}

export async function GET(request: Request) {
  const target = checkableUrl(new URL(request.url).searchParams.get('url'))
  if (!target) return Response.json({ error: 'A public http(s) URL is required.' }, { status: 400 })

  let frameable: boolean | null = null
  try {
    // Redirects are followed by hand so every hop goes through the same public-host check.
    let url: URL | null = target
    for (let hop = 0; url && hop < 5; hop++) {
      if (!(await resolvesPublic(url))) break
      const res: Response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(4000),
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; SumitOS frame-check)' },
      })
      await res.body?.cancel()
      const location = res.headers.get('location')
      if (res.status >= 300 && res.status < 400 && location) {
        url = checkableUrl(new URL(location, url).href)
        continue
      }
      frameable = frameVerdict(res.headers, new URL(request.url).origin)
      break
    }
  } catch {
    // Timeout, DNS failure, TLS error: unknown, not refused.
  }

  return Response.json(
    { frameable },
    { headers: { 'cache-control': frameable === null ? 'no-store' : 'public, s-maxage=86400' } },
  )
}

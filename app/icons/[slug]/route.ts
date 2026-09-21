// One brand mark per request, drawn straight from the Simple Icons package.
//
// The mark is served rather than bundled: `src/lib/icons.tsx` paints it as a CSS mask, so the
// glyph takes its colour from `currentColor` and both themes work without a second copy. Path
// data is heavy (a few megabytes across the catalogue) and never needs to reach the browser.
//
// `?c=brand` opts out of that and bakes the brand's own hex into the file, for the one place
// that wants real logo colour — the Skills chips. Simple Icons ships the hex next to the path;
// it was being read and thrown away here, and baking 3459 of them into the client bundle
// instead would roughly double a payload that exists only to answer `hasIcon()`.
import * as simpleIcons from 'simple-icons'

/** Slug → icon, built once per instance. The package exports `siPython`-style names only. */
const BY_SLUG = new Map(Object.values(simpleIcons).map((icon) => [icon.slug, icon]))

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params
  const brand = new URL(request.url).searchParams.get('c') === 'brand'
  const key = slug.replace(/\.svg$/, '').toLowerCase()

  const icon = /^[a-z0-9-]+$/.test(key) ? BY_SLUG.get(key) : undefined
  if (!icon) return new Response('Not found', { status: 404 })

  // `currentColor` is what makes the inline <svg> path in src/lib/icons.tsx and this one
  // interchangeable; when used as a mask the fill is ignored anyway. A brand request is the
  // exception: it is loaded as an <img>, which has no currentColor to inherit.
  const fill = brand ? `#${icon.hex}` : 'currentColor'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" role="img"><title>${icon.title.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</title><path d="${icon.path}"/></svg>`

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

import type { CSSProperties } from 'react'

const cache = new Map<string, CSSProperties>()

/**
 * Parse a CSS declaration string into a React style object.
 *
 * The original design carries its layout in inline `style="…"` attributes. Keeping those
 * declarations as literal text — rather than hand-translating every one into camelCase —
 * is what makes this port faithful: the string in the JSX is the string from the design.
 */
export function s(css: string): CSSProperties {
  const hit = cache.get(css)
  if (hit) return hit

  const style: Record<string, string> = {}
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':')
    if (i === -1) continue
    const prop = decl.slice(0, i).trim()
    const value = decl.slice(i + 1).trim()
    if (!prop || !value) continue
    // Custom properties keep their name; everything else goes camelCase for React.
    const key = prop.startsWith('--')
      ? prop
      : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    style[key] = value
  }

  const out = style as CSSProperties
  cache.set(css, out)
  return out
}

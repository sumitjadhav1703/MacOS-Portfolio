// Shared brand/tech icon lookup, ported from legacy/icons.js.
//
// Every entry's `path` is exact path data copied from Simple Icons
// (simpleicons.org, CC0-1.0), on the standard 24x24 viewBox. Nothing here is
// traced or redrawn by hand — a wrong logo is worse than no logo, so a slug we
// cannot source verbatim is listed in PENDING and falls through to the generic
// glyph instead.

type IconDef = { title: string; path: string }

const ICONS: Record<string, IconDef> = {
  github: {
    title: 'GitHub',
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
}

// Slugs the portfolio will want, still to be sourced verbatim from Simple Icons.
// They resolve to the generic glyph until their exact path data is added above.
export const PENDING = [
  'linkedin', 'kaggle', 'huggingface',
  'python', 'cplusplus', 'openjdk', 'javascript', 'mysql',
  'pytorch', 'tensorflow', 'scikitlearn', 'pandas', 'numpy', 'opencv',
  'langchain', 'mistralai', 'fastapi', 'docker', 'streamlit', 'postgresql',
  'react', 'electron', 'vitest', 'githubactions', 'git',
]

// Original fallback mark — a plain ring with a core. Deliberately not brand-like,
// so an unsourced slug reads as "no logo" rather than "wrong logo".
const GENERIC: IconDef = {
  title: 'Link',
  path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 1.8a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 0 1 0-16.4zm0 4.6a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z',
}

// Original, non-brand glyphs. These are ours, so they are safe to draw by hand.
const LOCAL: Record<string, IconDef> = {
  email: {
    title: 'Email',
    path: 'M2 5.4A2.4 2.4 0 0 1 4.4 3h15.2A2.4 2.4 0 0 1 22 5.4v13.2a2.4 2.4 0 0 1-2.4 2.4H4.4A2.4 2.4 0 0 1 2 18.6zm2.35-.4a.4.4 0 0 0-.26.7l7.65 6.64a.4.4 0 0 0 .52 0l7.65-6.64a.4.4 0 0 0-.26-.7zM20 8.16l-6.83 5.93a1.8 1.8 0 0 1-2.34 0L4 8.16V18.6c0 .22.18.4.4.4h15.2a.4.4 0 0 0 .4-.4z',
  },
}

/** True when a real mark exists for this slug (brand or local glyph). */
export function hasIcon(slug: string): boolean {
  const key = slug.toLowerCase()
  return key in ICONS || key in LOCAL
}

const TAG_SLUG: Record<string, string | null> = {
  'hugging face spaces': 'huggingface',
  'hugging face': 'huggingface',
  'postgresql / pgvector': 'postgresql',
  'c++': 'cplusplus',
  java: 'openjdk',
  sql: 'mysql',
  'capella space x-band sar': null,
  'search / reader / writer / critic': null,
}

/** Icon slug for a free-text tag, or null when the tag is conceptual, not a product. */
export function tagSlug(tag: string): string | null {
  const key = tag.toLowerCase().trim()
  if (key in TAG_SLUG) return TAG_SLUG[key]
  return key.replace(/[^a-z0-9]/g, '') || null
}

type IconProps = {
  slug: string
  size?: number
  /** Pass a label to expose the icon to assistive tech; omit to mark it decorative. */
  label?: string
}

export function Icon({ slug, size = 16, label }: IconProps) {
  const key = slug.toLowerCase()
  const def = ICONS[key] ?? LOCAL[key] ?? GENERIC
  const decorative = label === undefined
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      style={{ display: 'block', flex: 'none' }}
      {...(decorative
        ? { 'aria-hidden': true, focusable: false }
        : { role: 'img', 'aria-label': label })}
    >
      <path d={def.path} />
    </svg>
  )
}

// Icon resolution, in one place.
//
// Two questions get answered here and nowhere else:
//
//   a free-text tag  ("PyTorch", "C++")          → tagSlug()      → a Simple Icons slug
//   an external URL  ("https://github.com/…")    → platformSlug() → a Simple Icons slug
//
// Both answers are derived from the human-readable content the CMS stores, so a project or a
// skill added through /admin gets its mark with no source change. Nothing writes an icon id
// into the database.
//
// The marks themselves come from Simple Icons (simpleicons.org, CC0-1.0). Only the slug list
// is baked into the bundle (src/generated/icon-slugs.ts); each glyph is fetched from
// app/icons/[slug]/route.ts and painted as a CSS mask, which is what keeps it the colour of
// the text beside it in every theme.
import { ICON_SLUGS } from '../generated/icon-slugs'
import { s } from '../os/css'

type IconDef = { title: string; path: string }

// Original fallback mark — a plain ring with a core. Deliberately not brand-like,
// so an unsourced slug reads as "no logo" rather than "wrong logo".
const GENERIC: IconDef = {
  title: 'Link',
  path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 1.8a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 0 1 0-16.4zm0 4.6a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z',
}

// Original, non-brand glyphs. These are ours, so they are safe to draw by hand — and Simple
// Icons has no mark for a generic mailbox.
const LOCAL: Record<string, IconDef> = {
  email: {
    title: 'Email',
    path: 'M2 5.4A2.4 2.4 0 0 1 4.4 3h15.2A2.4 2.4 0 0 1 22 5.4v13.2a2.4 2.4 0 0 1-2.4 2.4H4.4A2.4 2.4 0 0 1 2 18.6zm2.35-.4a.4.4 0 0 0-.26.7l7.65 6.64a.4.4 0 0 0 .52 0l7.65-6.64a.4.4 0 0 0-.26-.7zM20 8.16l-6.83 5.93a1.8 1.8 0 0 1-2.34 0L4 8.16V18.6c0 .22.18.4.4.4h15.2a.4.4 0 0 0 .4-.4z',
  },
}

/** True when a real mark exists for this slug (brand or local glyph). */
export function hasIcon(slug: string): boolean {
  const key = slug.toLowerCase()
  return key in LOCAL || ICON_SLUGS.has(key)
}

// Tags whose slug cannot be guessed by stripping punctuation, plus the ones that are a
// concept rather than a product and must stay bare.
const TAG_SLUG: Record<string, string | null> = {
  'hugging face spaces': 'huggingface',
  'hugging face': 'huggingface',
  'postgresql / pgvector': 'postgresql',
  postgres: 'postgresql',
  'c++': 'cplusplus',
  'c#': 'dotnet',
  java: 'openjdk',
  sql: 'mysql',
  py: 'python',
  ts: 'typescript',
  js: 'javascript',
  node: 'nodedotjs',
  'node.js': 'nodedotjs',
  'react.js': 'react',
  'vue.js': 'vuedotjs',
  'next.js': 'nextdotjs',
  sklearn: 'scikitlearn',
  'scikit-learn': 'scikitlearn',
  k8s: 'kubernetes',
  'github actions': 'githubactions',
  'capella space x-band sar': null,
  'search / reader / writer / critic': null,
}

/** Icon slug for a free-text tag, or null when the tag is conceptual, not a product. */
export function tagSlug(tag: string): string | null {
  const key = tag.toLowerCase().trim()
  if (key in TAG_SLUG) return TAG_SLUG[key]
  return key.replace(/[^a-z0-9]/g, '') || null
}

// Hostname → slug, for the platforms whose domain does not spell their slug. Anything not
// listed falls through to the bare second-level label, which already covers github.com,
// kaggle.com, vercel.com, gitlab.com, render.com and most of the rest.
const HOST_SLUG: Record<string, string> = {
  'huggingface.co': 'huggingface',
  'x.com': 'x',
  'twitter.com': 'x',
  'npmjs.com': 'npm',
  'pypi.org': 'pypi',
  'colab.research.google.com': 'googlecolab',
  'colab.google.com': 'googlecolab',
  'hub.docker.com': 'docker',
  'docker.com': 'docker',
  'notion.so': 'notion',
  'stackoverflow.com': 'stackoverflow',
  'youtu.be': 'youtube',
  'dev.to': 'devdotto',
  'read.cv': 'readdotcv',
  'streamlit.app': 'streamlit',
  'streamlit.io': 'streamlit',
  'netlify.app': 'netlify',
  'vercel.app': 'vercel',
  'github.io': 'github',
  'pages.dev': 'cloudflare',
  'workers.dev': 'cloudflare',
  'onrender.com': 'render',
}

/**
 * Icon slug for an external URL, derived from its host — or null when nothing sensible
 * matches. Never throws: a malformed URL is a content problem, not a render problem.
 */
export function platformSlug(url: string): string | null {
  const raw = url.trim()
  if (raw.toLowerCase().startsWith('mailto:')) return 'email'

  let host: string
  try {
    host = new URL(raw).hostname.toLowerCase()
  } catch {
    return null
  }
  if (!host) return null
  host = host.replace(/^www\./, '')

  if (host in HOST_SLUG) return HOST_SLUG[host]

  // Match the longest registrable-looking suffix first, so `sumit.github.io` and
  // `demo.streamlit.app` resolve the same way their bare domains do.
  const parts = host.split('.')
  for (let i = 1; i < parts.length - 1; i++) {
    const suffix = parts.slice(i).join('.')
    if (suffix in HOST_SLUG) return HOST_SLUG[suffix]
  }

  // Fall back to the second-level label: github.com → github, kaggle.com → kaggle.
  const label = parts.length > 1 ? parts[parts.length - 2] : parts[0]
  const slug = label.replace(/[^a-z0-9]/g, '')
  return slug && hasIcon(slug) ? slug : null
}

/** Hostname for display beside a link, or an empty string when the URL is not a web address. */
export function hostLabel(url: string): string {
  try {
    return new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

type IconProps = {
  /** Null renders the generic mark — the honest answer when nothing matched. */
  slug: string | null
  size?: number
  /** Pass a label to expose the icon to assistive tech; omit to mark it decorative. */
  label?: string
}

export function Icon({ slug, size = 16, label }: IconProps) {
  const key = (slug ?? '').toLowerCase()
  const decorative = label === undefined
  const a11y = decorative
    ? ({ 'aria-hidden': true, focusable: false } as const)
    : ({ role: 'img', 'aria-label': label } as const)

  // Brand marks are painted as a mask so they inherit the surrounding text colour. The glyph
  // is one immutable, long-cached request; no path data ships in the bundle.
  if (!(key in LOCAL) && ICON_SLUGS.has(key)) {
    const mask = `url(/icons/${key}.svg) center / contain no-repeat`
    return (
      <span
        {...a11y}
        style={{
          ...s(`display:block;flex:none;width:${size}px;height:${size}px;background:currentColor`),
          WebkitMask: mask,
          mask,
        }}
      />
    )
  }

  const def = LOCAL[key] ?? GENERIC
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      style={{ display: 'block', flex: 'none' }}
      {...a11y}
    >
      <path d={def.path} />
    </svg>
  )
}

/**
 * The mark for a link, chosen from its URL alone. Callers never name an icon — change the URL
 * in the CMS and the icon follows.
 */
export function PlatformIcon({ url, size = 14, label }: { url: string; size?: number; label?: string }) {
  return <Icon slug={platformSlug(url)} size={size} label={label} />
}

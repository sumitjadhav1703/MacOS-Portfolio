// The mark a piece of content resolves to, shown where it is typed.
//
// The component and the resolvers are the public site's own — `Icon`, `tagSlug`, `platformSlug`
// and `hasIcon` from src/lib/icons — so what the admin previews beside a technology or a link is
// exactly what a visitor will see, down to the same glyph request. Nothing here decides which
// icon anything gets; it only asks and draws the answer.
//
// `Icon` masks `/icons/<slug>.svg`, which Next serves on the public origin. worker/index.ts
// redirects that path so the same relative URL resolves on the admin origin too.

import { Icon, hasIcon, platformSlug, tagSlug } from '../../src/lib/icons'

/** What a technology name resolves to. Unknown names get the generic ring, never a wrong brand. */
export const TagIcon = ({ tag, size = 14 }: { tag: string; size?: number }) => (
  <Icon slug={tagSlug(tag)} size={size} />
)

/** What a URL resolves to. Change the URL and this changes with it — there is no icon field. */
export const LinkIcon = ({ url, size = 14 }: { url: string; size?: number }) => (
  <Icon slug={platformSlug(url)} size={size} />
)

/**
 * The name of the platform a URL points at, for the line under a link field. A valid URL with no
 * mark is still a valid URL, so it gets a name rather than a complaint (spec §15).
 */
export function platformLabel(url: string): string {
  const value = url.trim()
  if (!value) return ''
  const slug = platformSlug(value)
  if (slug) return slug === 'email' ? 'Email' : slug[0]!.toUpperCase() + slug.slice(1)
  try {
    return new URL(value).hostname.replace(/^www\./, '') || 'External website'
  } catch {
    return ''
  }
}

/** Whether a technology name found a real mark, for the note under a chip list. */
export const tagHasIcon = (tag: string): boolean => {
  const slug = tagSlug(tag)
  return !!slug && hasIcon(slug)
}

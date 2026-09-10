// The public origin, in one place.
//
// It appears in metadataBase (app/layout.tsx) and printed on the OG cards (src/og/card.tsx), and
// those two must never disagree — a card advertising a host the site no longer answers on is a
// broken share preview that nothing in CI would catch.
//
// `NEXT_PUBLIC_SITE_URL` wins if it is set. Otherwise Vercel's own
// `VERCEL_PROJECT_PRODUCTION_URL`, which the platform injects into every build and which is right
// by construction — no variable to remember, and it follows a renamed project on its own. The
// literal is the last resort, for a build that happens somewhere else entirely.
const configured =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://mac-os-portfolio-self-nine.vercel.app')

export const SITE_URL = configured.replace(/\/$/, '')

/** The same origin without its scheme, which is what the OG card prints. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '')

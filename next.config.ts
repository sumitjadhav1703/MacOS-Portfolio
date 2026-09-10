import type { NextConfig } from 'next'

/**
 * Security headers for every response the site serves.
 *
 * `frame-ancestors 'none'` is the one with teeth — nothing here is meant to be embedded, and the
 * Worker sets the same header on /admin for the same reason. The CSP stops there deliberately:
 * the desktop paints with inline `style` attributes throughout and Next emits its own inline
 * bootstrap, so a script-src or style-src directive would need nonce plumbing through both and
 * would break the page long before it stopped anything. Adding one is a separate piece of work,
 * not a header line.
 */
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]

const nextConfig: NextConfig = {
  // The desktop is one client tree; nothing here needs image optimisation or rewrites.
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
  // Next writes AGENTS.md/CLAUDE.md into the repo root by default; this project keeps its
  // own notes in README.md instead.
  agentRules: false,
}

export default nextConfig

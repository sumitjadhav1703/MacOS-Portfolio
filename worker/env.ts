import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider'

export type Env = {
  /** D1 binding — structured content, sessions, rate-limit counters. */
  DB: D1Database
  /** R2 binding — resume, project covers, certificate files. Bucket is private. */
  BUCKET: R2Bucket
  /** Static assets binding — the admin SPA build in worker/assets. */
  ASSETS: Fetcher
  /** Origin of the public portfolio, allowed through CORS. Plain var, not a secret. */
  SITE_ORIGIN: string
  /** Secret: `pbkdf2$<iterations>$<salt-b64>$<hash-b64>`. Set with `wrangler secret put`. */
  ADMIN_PASSWORD_HASH: string
  /**
   * Service binding to `sumitos-ai`, the Python Worker that answers Ask Sumit. That Worker has
   * no route and no D1 binding: it is reachable only through here, and it can only see the
   * published bundle this Worker hands it.
   */
  ASK_AI: Fetcher
  /** Rate-limit binding guarding `/api/ask`, keyed on the client IP. */
  ASK_LIMIT: RateLimit
  /** Rate-limit binding guarding `/mcp`, keyed on the authenticated subject. */
  MCP_LIMIT: RateLimit
  /** KV for the OAuth provider: clients, grants and (hashed) tokens. No portfolio content. */
  OAUTH_KV: KVNamespace
  /** Injected by the OAuth provider into the default handler's env; used by /admin/authorize. */
  OAUTH_PROVIDER: OAuthHelpers
}

/** The shape of Cloudflare's rate-limiting binding, which has no type in workers-types yet. */
export type RateLimit = {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

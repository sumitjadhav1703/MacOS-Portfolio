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
}

# Deployment

How SumitOS gets from this repository to the internet, written for someone deploying it for the
first time. Every step says what it does, why it exists, where you run it, what a good result
looks like, and what to do when it does not.

Nothing here needs to be memorised. Follow it top to bottom the first time; after that, the
[Rollback](#rollback) and [Troubleshooting](#troubleshooting) sections are the parts you come
back to.

## The two halves, and why they are separate

```
recruiter ──▶ <project>.vercel.app          Vercel · Next.js · static, no login anywhere
                   │  GET /api/content      anonymous, cross-origin, cached 60s
                   ▼
owner ──────▶ sumitos-api.<subdomain>.workers.dev
                   │                        /admin — password + HttpOnly session cookie
              Worker ──┬── D1               structured content, sessions
                       ├── R2               resume, project covers, certificate files
                       └── sumitos-ai       the Ask Sumit assistant, no route of its own
```

The public site never writes anything and never holds a credential. Everything that can write
lives on one Cloudflare Worker, behind one session check, on its own origin. That split is the
security model, so keep it: do not move the site onto Cloudflare and do not put a Worker secret
into Vercel.

**LOCAL and REMOTE are different worlds throughout this document.** A local command touches a
SQLite file inside `.wrangler/` on your laptop. A remote command touches the live database that
your published site reads. The commands look nearly identical — `worker:migrate:local` versus
`worker:migrate` — so read the suffix before pressing enter.

---

## Prerequisites

| | |
|---|---|
| Node 24 | `node -v`. There is an `.nvmrc`, so `nvm use` picks it up |
| A GitHub account | Vercel builds from the repository |
| A Cloudflare account | Free tier is enough for all of this |
| `uv` | Only for `ai/`, the Python assistant Worker |

Wrangler is Cloudflare's command-line tool. It is **not** installed globally — it is a dependency
of this project, which is why every command below starts with `npx` or an `npm run` script. That
keeps the version pinned in `package-lock.json` rather than depending on what your machine
happens to have.

```bash
npm ci        # installs exactly what the lockfile says — not `npm install`
npm run ci    # lint, tests, types, secret scan, migration check, build, bundle size
```

`npm run ci` is the same command GitHub Actions runs. If it is green here it will be green there.
Do not deploy from a red one.

---

## Local development

Run this before you deploy anything. It is the same system, on your laptop, with its own
database — and if it works here, the only things that can still be wrong in production are
configuration.

```bash
npm run worker:migrate:local   # LOCAL database. Creates it on first run
npm run worker:dev             # http://localhost:8787 — API and /admin
```

In a second terminal:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 npm run dev   # http://localhost:3000
```

`wrangler dev` reads `.dev.vars`, which is gitignored and must stay that way. Two lines belong
in it:

```bash
ADMIN_PASSWORD_HASH='pbkdf2$...'      # single quotes — the hash is full of $
SITE_ORIGIN=http://localhost:3000     # the origin `npm run dev` serves
```

Generate the hash with `node scripts/hash-password.mjs`. Use a throwaway password locally; there
is no reason for your local database to share a credential with production.

Without the second line the local Worker refuses the local site — `SITE_ORIGIN` is the CORS
allowlist — and the desktop quietly falls back to its compiled-in content instead of telling you.
That silence is the single most confusing failure in this project, and it behaves identically in
production. See [Troubleshooting](#troubleshooting).

---

## Deployment order

This order is not arbitrary. Each step produces a value the next one needs.

```
1. Enable R2 on the account          (dashboard, once)
2. Deploy the site to Vercel         → gives you the real public URL
3. Create D1                         → gives you database_id
4. Create the R2 bucket
5. Put both values in wrangler.jsonc → commit them
6. Migrate the REMOTE database
7. Deploy sumitos-ai                 → must exist before the API binds to it
8. Deploy sumitos-api                → gives you the Worker URL
9. Set the admin secret
10. Set NEXT_PUBLIC_API_URL on Vercel and redeploy
11. Verify
```

Step 2 comes before step 5 because `SITE_ORIGIN` must be the origin Vercel actually assigned, not
one you guessed. Step 7 comes before step 8 because `wrangler.jsonc` binds `ASK_AI` to the
`sumitos-ai` service; a binding to a Worker that does not exist yet fails the deploy.

---

## Cloudflare setup

### Are you logged in?

**WHAT** Wrangler stores an OAuth token for one Cloudflare account.
**WHY** Every command below acts on that account. Deploying to the wrong one is a confusing mess
to undo.
**WHERE** Anywhere in the repository.

```bash
npx wrangler whoami
```

**EXPECTED** Your email address, and a table with one account name and account ID.
**IF IT FAILS** `npx wrangler login` opens a browser and asks you to authorise. Never paste an
API token into a file in this repository.

### Enable R2

**WHAT** R2 is Cloudflare's file storage — the resume PDF, project covers and certificate files
live there. It is off by default on a new account.
**WHY** No command-line tool can turn it on. This is the one step that must happen in a browser.
**WHERE** dash.cloudflare.com → **R2** in the sidebar → **Enable R2**.

Cloudflare asks for a payment method even though the free tier (10 GB stored, free egress) covers
this project many times over.

**EXPECTED** `npx wrangler r2 bucket list` prints an empty list instead of an error.
**IF IT FAILS** `Please enable R2 through the Cloudflare Dashboard. [code: 10042]` means it is
still off. There is no way around it — uploads, the resume and every cover image depend on it.

---

## D1 setup

D1 is Cloudflare's SQL database. It holds every content row — projects, certificates, experience,
education, skills, links, site copy — plus the admin session table.

**WHAT** Create the database named `sumitos`.
**WHY** The Worker's `DB` binding points at it by ID. Until it exists there is no ID to point at.
**WHERE** Repository root.

```bash
npx wrangler d1 create sumitos
```

**EXPECTED** A block of configuration ending in `"database_id": "<a uuid>"`.
**IF IT FAILS** `already exists` is fine — `npx wrangler d1 list` shows the existing one; get its
ID from there.

Then put that ID into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`, and set
`vars.SITE_ORIGIN` to the URL Vercel gave you. Commit both. `wrangler.jsonc` is tracked, and the
configuration that deployed must be the one in git.

`npm run worker:deploy` runs `scripts/check-deploy.mjs` first and refuses to deploy while either
value is still a placeholder. That guard exists because `wrangler deploy --dry-run` happily
accepts a fake database ID — it never asks whether the ID is real.

### Migrate the remote database

**WHAT** Apply `migrations/0001_init.sql`, `0002_seed.sql` and `0003_project_draft.sql` to the
live database, in order.
**WHY** The Worker queries tables. Without this the database is empty and every API call fails.
**WHERE** Repository root. **This is a REMOTE command — it changes live data.**

```bash
npm run seed              # regenerates migrations/0002_seed.sql from src/data/
npm run check:migrations  # numbering is sequential, applied files are unchanged
npm run worker:migrate    # --remote
```

**EXPECTED** Wrangler lists the migrations it is about to apply, asks for confirmation, and
reports each as successful.
**IF IT FAILS** `no such table` on a later migration means an earlier one did not apply — read
the output from the top rather than rerunning. Verify what actually landed:

```bash
npx wrangler d1 execute sumitos --remote \
  --command "select name from sqlite_master where type='table'"
```

**Migrations only go forwards.** D1 has no rollback. If a migration is wrong, write a new
numbered migration that corrects it; never edit one that has been applied. `check-migrations`
enforces this with checksums in `migrations/.checksums`.

---

## R2 setup

**WHAT** Create the bucket the Worker's `BUCKET` binding names.
**WHY** Uploads write here; `/files/:key` reads from here.
**WHERE** Repository root, after R2 is enabled on the account.

```bash
npx wrangler r2 bucket create sumitos-assets
```

**EXPECTED** `Created bucket 'sumitos-assets'`.
**IF IT FAILS** Error 10042 means R2 is still not enabled — go back to [Enable R2](#enable-r2).

The bucket is private. Nothing reads it directly; the Worker serves objects through `/files/:key`
after checking that a content row references the key. There are no R2 access keys anywhere in
this project, which is deliberate — the binding is the credential.

---

## Worker secrets

There is exactly one secret in this system.

**WHAT** `ADMIN_PASSWORD_HASH` — a PBKDF2-SHA256 hash of your admin password, 210,000 iterations.
**WHY** It is the only thing standing between the internet and your CMS. Storing a hash rather
than the password means a leak of the Cloudflare configuration is not a leak of the password.
**WHERE** Repository root. Cloudflare stores the value encrypted; it is never in git.

```bash
node scripts/hash-password.mjs               # prompts; the password never touches shell history
npx wrangler secret put ADMIN_PASSWORD_HASH  # paste the printed line
```

**EXPECTED** `Success! Uploaded secret ADMIN_PASSWORD_HASH`.
**IF IT FAILS** If the Worker has not been deployed yet, Wrangler offers to create it — say yes,
or set the secret again after the first deploy.

Use at least 12 characters; the script refuses anything shorter. To rotate it, run both commands
again with a new password — the change is live immediately and existing sessions keep working
until they expire, so sign out of `/admin` afterwards if the rotation was because of a leak.

Never put the hash in `wrangler.jsonc`, a README, a screenshot, or a chat message. Locally it
goes in `.dev.vars`, which is gitignored.

---

## Worker deployment

Deploy the assistant first, then the API.

```bash
npm run ai:deploy        # sumitos-ai — Python Worker, no route of its own
npm run worker:deploy    # sumitos-api — checks config, builds the admin UI, deploys
```

**WHY THIS ORDER** `wrangler.jsonc` declares a service binding `ASK_AI` → `sumitos-ai`. A binding
to a Worker that does not exist fails the deploy of the one that binds it.

**EXPECTED** For each: an uploaded bundle, a version ID, and for `sumitos-api` a
`https://sumitos-api.<your-subdomain>.workers.dev` URL. Write that URL down — Vercel needs it.
`sumitos-ai` prints no URL, because it has `workers_dev: false` and is reachable only through the
binding. That is intentional: one public surface, one CORS policy, one rate limiter.

**IF IT FAILS**

- `check-deploy: … database_id is "REPLACE_WITH_D1_DATABASE_ID"` — you skipped the D1 step.
- `service "sumitos-ai" not found` — deploy `ai/` first.
- A TypeScript error — `npm run worker:check` gives the same errors faster.

Nothing deploys from CI, on purpose. `wrangler deploy` stays a deliberate human action, and that
is what keeps every Cloudflare credential out of this repository.

---

## Vercel setup

The public site stays on Vercel. Do not migrate it to Cloudflare.

1. vercel.com → **Add New** → **Project** → import the GitHub repository.
2. Framework detection should say **Next.js**. Build command `npm run build`, install command
   `npm ci`. Leave both as detected.
3. **Leave `NEXT_PUBLIC_API_URL` unset for the very first deploy.**
4. Deploy, and open the URL it gives you.

Step 3 is a deliberate test, not an oversight. With no API URL the site serves the content
compiled in from `src/data/` — so a working first deploy proves the site half is sound before the
API half exists, and any later problem is definitely configuration.

Once the Worker is deployed, add the variable and redeploy:

| Variable | Environment | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Production | `https://sumitos-api.<your-subdomain>.workers.dev` |

Vercel does not apply a new environment variable to an existing build. Redeploy from the
Deployments tab after adding it, or the site keeps serving the bundled content.

**Never put `ADMIN_PASSWORD_HASH`, or any Worker secret, into Vercel.** Anything prefixed
`NEXT_PUBLIC_` is compiled into JavaScript that every visitor downloads. `NEXT_PUBLIC_API_URL` is
a public URL, which is why it is allowed to be one.

---

## Environment variables

Three names in total. Only the last is a secret.

| Name | Lives in | Owner | Public? | How to change it |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Vercel project settings | You | Yes — it ships in the client bundle | Vercel dashboard, then redeploy |
| `SITE_ORIGIN` | `wrangler.jsonc` → `vars` | The repository | Yes | Edit, commit, `npm run worker:deploy` |
| `ADMIN_PASSWORD_HASH` | Cloudflare, encrypted | You | **No** | `npx wrangler secret put ADMIN_PASSWORD_HASH` |

Locally the last two come from `.dev.vars` instead, which overrides `vars` in `wrangler.jsonc`.

| Environment | `NEXT_PUBLIC_API_URL` | `SITE_ORIGIN` |
|---|---|---|
| LOCAL | `http://127.0.0.1:8787` | `http://localhost:3000` (in `.dev.vars`) |
| Vercel preview | unset — previews serve bundled content | n/a |
| PRODUCTION | the Worker's `workers.dev` URL | the Vercel production URL |

Preview deployments are left unset on purpose. Every preview gets its own generated hostname, and
`SITE_ORIGIN` allows exactly one origin — so a preview pointed at the production API would be
refused by CORS anyway, and would fall back silently. Bundled content is the honest answer there.

---

## Production verification

```bash
node scripts/smoke.mjs https://<your-site>.vercel.app https://sumitos-api.<subdomain>.workers.dev
```

Safe to run against production: every check is a GET except the anonymous mutations, which are
expected to be refused. It covers the homepage, a project route, both OG images, a brand glyph,
the packaged resume, the content bundle, the resume endpoint, that the public API is read-only,
that an anonymous admin mutation is refused, and that no draft reaches the public bundle.

Then, by hand, because a browser is the only thing that can check these:

- **1440×900** — boot, desktop, dock, menu bar, Finder, Launchpad, Spotlight, Shell, Ask Sumit,
  a project window, `/projects/<slug>` opened directly.
- **390×844** — the stacked mobile shell.
- The console: no errors, no hydration warnings, no failed request that changes what renders.
- `/admin` on the Worker: sign in, create a project, save a draft, publish, confirm it appears on
  the public site, then delete it. Do not leave test content in a live portfolio.

Content is cached for 60 seconds at the edge (`TTL_SECONDS` in `worker/content.ts`), so a publish
is visible immediately in the location that served the admin request and within a minute
everywhere else. That is expected behaviour, not a bug.

---

## Rollback

### Worker

Deployments are versioned. A bad deploy is one command back.

```bash
npx wrangler deployments list
npx wrangler rollback [deployment-id]
```

**EXPECTED** The previous version serving within seconds. Secrets and bindings are not affected.

### Vercel

Deployments tab → the last known-good deployment → **Promote to Production**. The old build is
still there; nothing rebuilds.

### D1 — there is no rollback

Say it plainly: a D1 migration cannot be undone. There is no `down` migration and no snapshot to
restore from. When a schema change is wrong, the fix is a **new numbered migration that corrects
it**, applied the same way as any other. Editing an applied migration is worse than useless —
`check-migrations` will fail on the checksum, and the live database is already past it.

This is why `npm run worker:migrate:local` exists and why the CI runs migrations on every pull
request. A migration should have been applied twice locally before it ever meets production.

### R2

Objects are immutable — an upload writes a fresh UUID key rather than replacing one. Nothing is
deleted from R2 while a content row still references it, so "rolling back" a file usually means
pointing the row back at the previous key, which is still there.

---

## Troubleshooting

| Problem | Check |
|---|---|
| **Worker deploy fails** | `npx wrangler whoami` (right account?), `database_id` is a real UUID, `sumitos-ai` deployed first, Node 24, `npm run worker:check` |
| **Site loads but content never updates** | `NEXT_PUBLIC_API_URL` set on Vercel *and* redeployed since; `SITE_ORIGIN` in `wrangler.jsonc` exactly matches the site's origin; open the browser network tab and look for a CORS failure on `/api/content`. The site never says it fell back — it just serves `src/data/` |
| **`/api/content` returns 500** | Migrations applied to the **remote** database (`--remote`, not `--local`); tables exist; `npx wrangler tail sumitos-api` for the real error |
| **Admin login always fails** | `ADMIN_PASSWORD_HASH` set as a secret on the deployed Worker; the whole `pbkdf2$...` line was pasted; not locked out (10 failures from one IP in 15 minutes); the `sessions` table exists |
| **Signed in, then immediately signed out** | Cookie is `Secure; SameSite=Strict; Path=/admin` — use the `https://` Worker URL, not an IP or a proxy, and use `/admin` on the Worker's own origin, never through the Vercel site |
| **Uploads fail** | R2 enabled on the account; `sumitos-assets` exists; the file is genuinely the type it claims — uploads are checked against their leading bytes, not the filename or `Content-Type` |
| **A file 404s at `/files/:key`** | The key must be referenced by a content row. An orphaned object is unreachable by design |
| **Ask Sumit returns an error** | `npm run ai:deploy` ran; the `ASK_AI` binding names `sumitos-ai`; the rate limit is 20 questions per IP per minute |
| **`R2 … [code: 10042]`** | R2 is not enabled on the account. Dashboard only |
| **`npm ci` fails on a clean machine** | Node 24 (`nvm use`), and `npm ci` rather than `npm install` — the lockfile is authoritative |

`npx wrangler tail sumitos-api` streams live logs from the deployed Worker. It is the fastest way
to see what a 500 actually was.

---

## Future: a custom domain

There is no custom domain today, and this project does not need one to be live. When there is:

```
sumitjadhav.dev       → Vercel            (add the domain in the Vercel project)
api.sumitjadhav.dev   → Cloudflare Worker (Custom Domain on sumitos-api)
admin.sumitjadhav.dev → Cloudflare Worker (optionally behind Cloudflare Access)
```

Attaching a Worker to a subdomain requires the domain to be a zone on the same Cloudflare
account. Three things must change together on the day it happens: the Vercel domain,
`vars.SITE_ORIGIN`, and `NEXT_PUBLIC_API_URL`. Changing one without the others produces exactly
the silent CORS fallback described above.

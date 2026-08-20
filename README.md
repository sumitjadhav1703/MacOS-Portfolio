# Sumit's Portfolio OS

An interactive portfolio built as a desktop environment — windows, dock, Launchpad,
Spotlight, a Shell, Spaces, Mission Control and a boot sequence. Next.js (App Router),
React and TypeScript, deployed on Vercel.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # next build — prerenders every route and OG image
npm start          # serve the build
npm test           # vitest: content invariants, worker mapping, validation, auth, routes
npm run lint       # oxlint, zero warnings
npm run ci         # everything CI runs, in one command
```

Needs **Node 24** (there is an `.nvmrc`), and `uv` only if you are working on `ai/`.

Content is served by a Cloudflare Worker (see **The CMS** below). The site runs without it —
`src/data/` is compiled in as a fallback — so `npm run dev` needs no extra setup.

## Layout

```
app/
  layout.tsx                 document, site metadata
  page.tsx                   the desktop
  opengraph-image.tsx        1200×630 site card
  projects/[slug]/
    page.tsx                 generateStaticParams + generateMetadata, opens that project
    opengraph-image.tsx      1200×630 card for the project, via next/og ImageResponse
src/
  data/                      projects, profile links, section copy, Shell/AI text
  og/card.tsx                the card both images render
  os/
    store.tsx                windows, Spaces, preferences (useReducer + context)
    shell/                   menu bar, dock, Launchpad, context menus, wallpaper,
                             Notification Center, Control Center, toasts, boot
    wm/                      window chrome, drag, resize, snapping, Mission Control
    apps/                    About, Finder, Safari, Shell, Ask Sumit, Code, System,
                             Resume, Contact, and one window per project
    search/                  Spotlight (⌘K) and the shortcut sheet (?)
    mobile/                  the stacked layout used below 768px
  styles/os.css              chrome stylesheet, lifted from the original design
worker/                      the Cloudflare Worker: public read API + admin API + admin UI
  index.ts                   router
  content.ts                 D1 rows -> the content bundle, and its edge cache
  auth.ts admin.ts files.ts  sessions, CRUD, R2 uploads
  tables.ts                  one spec per content type; the CRUD handler is generic
  admin-ui/                  the admin SPA (Vite + React), built into worker/assets
migrations/                  versioned D1 migrations; 0002 is generated from src/data
legacy/                      the original single-file build, kept for reference
```

## Adding a project

Through the admin, at `/admin` on the Worker: **Projects -> Add project**, then Publish. The
desktop folder, Finder entry, Launchpad tile, window, Spotlight hit, Shell alias,
`/projects/<slug>` route and preview image all follow from the one record.

`src/data/projects.ts` is now the seed and the offline fallback rather than the live source.
Editing it changes what a fresh database is seeded with, and what the site shows if the API
is unreachable; it does not change published content.

## Keyboard

⌘K search · F4 Launchpad · ? shortcuts · ⌘↑ or F3 Mission Control · ⌃← / ⌃→ Spaces ·
⌃⌘← / ⌃⌘→ tile left/right · ⌘⇧F Projects · ⌘W close · ⌘M minimise · ⌘, System · Esc dismiss.
Right-click the desk, a folder, a dock icon or a title bar for its menu.

## Testing

```bash
npm run ci          # lint, tests, types, secret scan, migration check, build, bundle size
npm run ai:test     # pytest over ai/ — pure Python, no runtime needed
npm run e2e         # the desktop and the mobile shell, in Chromium
npm run e2e:admin   # the CMS, against a real Worker with a real local D1
```

`npm run ci` is the same command GitHub Actions runs, so a green terminal and a green workflow
mean the same thing. It ends with the build, which is where the app's own types are checked.

`npm run e2e:admin` builds the admin SPA, migrates a throwaway local database, generates a
password for that run alone and starts `wrangler dev --local`. No credential is stored anywhere,
and `--local` is the only mode used — there is no path from a test to the production database.

Some things are still only checkable in a browser. [AGENTS.md](AGENTS.md) lists them, and
[docs/release-checklist.md](docs/release-checklist.md) asks for them before a release.

## Continuous integration

| Workflow | Runs on | Does |
|---|---|---|
| `ci.yml` | pull request, push to `master` | the gate, the Python suite, both browser suites, migrations |
| `security.yml` | pull request, push, weekly | CodeQL over the code and over the workflows |
| `dependency-review.yml` | pull request | blocks a new high or critical advisory |
| `release.yml` | tag `v*` | runs the gate, drafts a release |

Nothing deploys from CI. `wrangler deploy` stays a deliberate human action, which is what keeps
every Cloudflare credential out of this repository.

Branch protection is configured in GitHub rather than in these files — see
[docs/github-settings.md](docs/github-settings.md).

## Notes

- Preferences and window geometry persist in `localStorage` (`sumit-os-prefs`); a wallpaper
  dropped on the desk persists as `sumit-os-wallpaper`, with `public/wallpaper.png` as the
  default.
- The Code app reads `src/generated/sources.ts`, written by `scripts/gen-sources.mjs` on
  `predev` / `prebuild`.
- Deploy the site: import the repo on Vercel. It detects Next.js and runs `npm run build`;
  the shipped project pages and their OG images are prerendered at build time, and projects
  added later render on demand.

## The CMS

The public site stays on Vercel. One Cloudflare Worker holds everything else: D1 for
structured content, R2 for files, the read-only public API, the admin API and the admin UI.

```
recruiter -> sumitjadhav.vercel.app          Vercel, static, no login anywhere
                 |  GET /api/content         anonymous, cached at the edge
                 v
owner     -> sumitos-api.<account>.workers.dev/admin
                 |                           password + HttpOnly session cookie
             Worker --+-- D1                 content, sessions
                      +-- R2                 resume, covers, certificate files
```

The admin UI is served by the Worker, same origin as the admin API, so the session cookie is
`HttpOnly; Secure; SameSite=Strict` and is never a third-party cookie. The public site only
ever makes anonymous cross-origin `GET`s; the API rejects every other method outright.

### Endpoints

Public, read-only, `GET` only. Each is a slice of one cached bundle, so extra endpoints cost
no extra database reads:

```
/api/content   /api/projects   /api/projects/:slug   /api/certificates   /api/experience
/api/education /api/skills     /api/social-links     /api/site           /api/os
/api/resume    /files/:key
```

Admin, all behind the session check, all on the Worker's own origin:

```
POST   /admin/api/login  logout            GET /admin/api/me  stats
GET|POST      /admin/api/:type             PATCH|DELETE /admin/api/:type/:id
PUT           /admin/api/site  /admin/api/os
POST          /admin/api/reorder/:type
GET|POST      /admin/api/files             DELETE /admin/api/files/:key
```

### First deploy

```bash
npx wrangler login
npx wrangler d1 create sumitos              # put the printed id in wrangler.jsonc
npx wrangler r2 bucket create sumitos-assets

node scripts/hash-password.mjs              # prints the hash; the password is never stored
npx wrangler secret put ADMIN_PASSWORD_HASH # paste it

npm run seed                                # regenerates migrations/0002_seed.sql
npm run worker:migrate                      # applies 0001 + 0002 to the remote database
npm run worker:deploy                       # builds the admin UI, deploys the Worker
```

Then set `NEXT_PUBLIC_API_URL` on Vercel to the Worker's URL and redeploy the site. Leave it
unset and the site simply serves its compiled-in content.

Update `SITE_ORIGIN` in `wrangler.jsonc` if the site's origin ever changes — it is the only
origin CORS lets through.

### Environment

Nothing here is a secret except the last row, and that one is never in a file that is committed.

| Name | Where | What it is |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Vercel | The Worker's origin. **Unset** and the site serves `src/data/` — which is why it builds and runs with no database at all |
| `SITE_ORIGIN` | `wrangler.jsonc`, plain var | The public origin. Used for CORS and to resolve the packaged resume URL |
| `ADMIN_PASSWORD_HASH` | `wrangler secret put` | The one real secret. `pbkdf2$<iterations>$<salt>$<hash>`, from `node scripts/hash-password.mjs` |

Locally the last two live in `.dev.vars`, which is gitignored and must stay that way. Quote the
hash with **single** quotes — the file is parsed as dotenv and the hash is full of `$`.

### Local development

```bash
npm run worker:migrate:local                # local D1, never the production database
npm run worker:dev                          # http://localhost:8787, /admin included
NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 npm run dev
```

`wrangler dev` reads secrets from `.dev.vars` (gitignored). Put an `ADMIN_PASSWORD_HASH=` line
in it, generated the same way as above.

### Rollback

```bash
npx wrangler deployments list
npx wrangler rollback [deployment-id]
```

Worker deployments are versioned, so a bad deploy is one command back. Database changes are
not — add a new numbered migration rather than editing an applied one.

### What it costs

Everything sits inside the Cloudflare free tier with a wide margin: Workers 100k requests/day,
D1 5M rows read and 100k written per day with 5 GB storage, R2 10 GB-month with free egress.
The whole public API is one cached bundle refreshed at most once a minute per location, and R2
objects are immutable so they are cached indefinitely.

## Security

Please report a vulnerability privately, through
[a security advisory](https://github.com/sumitjadhav1703/MacOS-Portfolio/security/advisories/new)
rather than as a public issue. [SECURITY.md](SECURITY.md) has the details, and explains how the
security model actually works — which makes for better reports.

## Releasing

[docs/release-process.md](docs/release-process.md) covers versioning, deployment order and
rollback. The short version: content changes are edited in `/admin` and publish immediately with
no release at all; code changes get a SemVer tag, and a bad schema migration is fixed forward
because D1 has no way back.

## Licence

[MIT](LICENSE), for the code.

The content is not covered by it: the resume, the biography, the project write-ups and the
photographs are Sumit Jadhav's. Take the desktop, the window manager and the CMS and do what you
like with them — please do not publish them as your own portfolio with the name changed.

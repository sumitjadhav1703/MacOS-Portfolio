# Sumit's Portfolio OS

An interactive portfolio built as a desktop environment — windows, dock, Launchpad,
Spotlight, a Shell, Spaces, Mission Control and a boot sequence. Next.js (App Router),
React and TypeScript, deployed on Vercel.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # next build — prerenders every route and OG image
npm start          # serve the build
npm test           # vitest: content invariants, worker mapping, validation, auth
npm run lint       # oxlint
```

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

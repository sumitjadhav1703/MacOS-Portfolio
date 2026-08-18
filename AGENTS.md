# AGENTS.md — orientation for a new session

Read this first. It says what this repo is, how it is put together, and which rules will
bite you if you ignore them.

(Next.js can generate its own `AGENTS.md`; that is switched off with `agentRules: false`
in `next.config.ts` so this hand-written file survives builds.)

## What this is

Sumit Jadhav's portfolio, built as a macOS-style desktop environment. Visitors get a boot
sequence, a menu bar, a dock, draggable/resizable windows, Launchpad, Spotlight, a Shell,
Spaces, Mission Control and a Notification Center. Each project is a window; each project
also has a shareable URL with a generated link-preview image.

Stack: **Next.js 16 (App Router) · React 19 · TypeScript · Vitest**. No CSS framework, no
UI library, no state library. The site deploys to **Vercel**; content comes from a
**Cloudflare Worker** (D1 + R2) that also serves the private admin CMS at `/admin`.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # next build — prerenders every route and OG image
npm start       # serve the build
npm test        # vitest
npm run lint    # oxlint

npm run worker:check          # tsc over worker/ and worker/admin-ui/
npm run worker:migrate:local  # apply migrations to a local D1
npm run worker:dev            # wrangler dev on :8787, admin UI included

npm run ai:test               # pytest over ai/ — pure Python, no runtime needed
npm run ai:dev                # pywrangler dev (needs uv >= 0.12.3)
npm run ai:deploy             # deploy sumitos-ai before sumitos-api, not after
```

The site runs standalone: without `NEXT_PUBLIC_API_URL` it serves the content compiled into
`src/data/`. Start the Worker only when working on the CMS.

`predev` / `prebuild` / `pretest` run `npm run gen`: `scripts/gen-sources.mjs` writes
`src/generated/sources.ts` (the files the in-app Code viewer displays) and
`scripts/gen-icons.mjs` writes `src/generated/icon-slugs.ts` (the Simple Icons slug names).
Both are gitignored and regenerated — anything that runs before them sees neither.

## Where things live

```
app/                          routes only — thin server components
  layout.tsx                  document + site metadata
  page.tsx                    the desktop
  opengraph-image.tsx         site-level 1200×630 card
  projects/[slug]/
    page.tsx                  generateStaticParams + generateMetadata + deep link
    opengraph-image.tsx       per-project card via next/og ImageResponse
  icons/[slug]/route.ts       one Simple Icons SVG per slug, immutable — never bundled
  favicon.ico
src/
  data/                       projects.ts, profile.ts, sections.ts, os.ts — now the SEED and
                              the offline fallback, not the live source
    content.ts                the Content shape, FALLBACK, and the pure helpers that used to
                              be hardcoded lists (aliases, skill index, Ask Sumit matching)
    server.ts                 getContent() for server components — revalidated, never fatal
  og/card.tsx                 the card both OG images render
  lib/icons.tsx               tagSlug + platformSlug + Icon/PlatformIcon — the only resolvers
  os/
    content.tsx               ContentProvider + useContent — FALLBACK first, API after mount
    store.tsx                 single reducer: windows, Spaces, prefs, overlays, power state
    cmd.ts                    the menu bar's one channel to the focused window
    types.ts registry.ts packs.ts anim.ts css.ts
    useTheme.ts useMedia.ts useHotkeys.ts
    DesktopRoot.tsx           the 'use client' boundary the routes render
    shell/                    menu bar, dock, Launchpad, context menus, wallpaper,
                              Notification Center, Control Center, toasts, grid
      appMenus.tsx            which menus the focused app puts in the bar
      Boot.tsx                the startup curtain, and Sleep / Restart / Shut Down
    wm/                       Window (drag/resize/snap), WindowManager, Mission Control
    apps/                     one component per window; index.tsx maps AppId → component
    search/                   Spotlight (⌘K), shortcut sheet (?)
    mobile/MobileShell.tsx    stacked page below 768px
  styles/os.css               chrome stylesheet
  components/primitives.tsx   Body, PageHead, Chips, StatusPill, FlowDiagram, MetricGrid…
worker/                       Cloudflare Worker: public read API, admin API, admin SPA
  ask.ts                      POST /api/ask — rate limit, origin, then hand off to sumitos-ai
ai/                           second Worker, in Python: Ask Sumit's retrieval + prompt + model
  src/retrieval.py            bundle → the few records that answer one question, no embeddings
  src/prompting.py            the grounding rules and the quoted-data context block
  src/safety.py               what is allowed in, and what is allowed back out
migrations/                   versioned D1 migrations (0002 is generated, do not hand-edit)
legacy/                       the original single-file build — reference only, not shipped
scripts/gen-sources.mjs scripts/gen-icons.mjs scripts/seed-d1.mjs scripts/hash-password.mjs
```

## Conventions that are load-bearing

**Styling is inline CSS strings through `s()`.** `src/os/css.ts` parses a declaration
string into a React style object: `style={s('display:flex;gap:8px')}`. The design this was
ported from carried its layout in inline `style="…"` attributes, and keeping the literal
text is what makes the port faithful. Do not convert these to Tailwind, CSS modules or
styled-components.

**`src/styles/os.css` is the original design's stylesheet, kept verbatim.** Its selectors
key off element ids (`#dock`, `#menubar`, `#wm`) and data attributes (`[data-root]`,
`[data-theme]`, `[data-glasspane]`, `[data-iconface]`). Keep those ids and attributes on
the elements that carry them, or the chrome quietly loses its glass.

**Colour comes from CSS custom properties** (`--s-win`, `--s-dim`, `--s-accent`, …) defined
per theme in `os.css`, plus the theme packs in `src/os/packs.ts`. Never hardcode a hex in a
component; the exception is `src/og/card.tsx`, because Satori has no CSS variables.

**The menu bar is a table, not markup.** `src/os/shell/appMenus.tsx` maps the focused `AppId` to
its menus; `MenuBar.tsx` renders whatever comes back. Adding a command means adding a `MenuEntry`
there, never a new `<Menu>` in the bar. Almost every entry is a store action. The three or four
that act on state inside one component — clear the Shell, copy the open file, retry the last
question — go through `src/os/cmd.ts`, a single `os:cmd` window event, the same trick
`pickWallpaper` has always used. Do not grow that into a command registry: an item that needs
more than a name belongs in the reducer instead. Every entry must do something, and one whose
target is closed is `disabled` rather than absent — a menu that only looks like a menu teaches
the visitor that the chrome is a picture.

**One store.** `src/os/store.tsx` is a `useReducer` + context. Add an action to the union,
handle it in the reducer, dispatch it from a component. No side effects in the reducer.

**Content comes from `useContent()`.** Components render it; they never own copy and they no
longer import `src/data/*` directly. A published project yields a desktop folder, a Finder
entry, a Launchpad tile, a window, a Spotlight hit, a Shell alias, an Ask Sumit answer, a
`/projects/<slug>` route and an OG image — with no code change at all. That property is
deliberate; keep it true. Before this it was only half true: six separate hardcoded lists had
to agree, and they have been deleted. Do not reintroduce one.

**Icons are derived, never stored.** `src/lib/icons.tsx` holds both resolvers: `tagSlug()` for a
free-text tag ("PyTorch", "C++") and `platformSlug()` for an external URL's host. The database
stores the readable name and the URL; nothing writes an icon id, and no component names one —
`<PlatformIcon url={…} />` works it out. Change a link in the CMS and its mark follows. Add a
second detection table and that stops being true. Marks come from Simple Icons: the slug names
are baked in so `hasIcon()` can answer during render, and `app/icons/[slug]/route.ts` serves the
artwork as a mask over `currentColor`. A tag with no mark renders as a plain chip — that is the
correct outcome, not a gap to fill by hand. Simple Icons carries no LinkedIn mark; it falls back
to the generic ring rather than to a hand-drawn trademark.

**The assistant is handed content; it never reads it.** `ai/` is a second Worker, in Python,
with an `AI` binding and nothing else — no D1, no R2, no route. `worker/ask.ts` passes it the
same `cachedContent()` bundle every public endpoint is a slice of. That is the privacy design,
not a convenience: `readContent` already applied `published = 1` in SQL, so a draft is not
withheld from the assistant by a rule someone has to remember — it is never in the process that
answers, and there is no second query to get wrong. It is also why publishing in `/admin` makes
a project answerable within the 60-second cache TTL, with no knowledge file and no redeploy.
Give that Worker a database binding and both properties are gone at once.

**Project ids are not a closed set.** `AppId` is `StaticAppId | \`project-${string}\``, so
anything that looks up an id must tolerate one it has never seen. Use `isAppId` to validate
and `titleOf` to read a title; `TITLES` is a mutable registry that `ContentProvider` refreshes
during render.

## Rules that will bite you

1. **No browser globals during render.** The desktop is prerendered on the server.
   `localStorage`, `matchMedia`, `navigator` and `window.innerWidth` must be read in an
   effect or through `src/os/useMedia.ts` (`useMedia`, `useIsMobile`, `useOnline`), which
   uses `useSyncExternalStore` with a server snapshot. Preferences arrive via the
   `hydrate` action after mount — that is why the first paint uses defaults.
2. **Nothing time-dependent renders on the server.** The menu-bar clock renders `—` until
   mounted; do the same for anything else derived from `new Date()`.
3. **The reducer runs on the server too.** Actions that need viewport size (`open`, `snap`)
   take it in the payload rather than reading `window`.
4. **`useHotkeys` treats Ctrl as ⌘** for the cross-platform bindings, so Space and tiling
   shortcuts must test `e.ctrlKey` / `e.metaKey` explicitly. This was a real bug once.
5. **Opacity-zero plus `backdrop-filter` still paints in Chromium.** Dock tooltips also
   toggle `visibility`. Watch for it on any new blurred, hidden surface.
6. **The public API is read-only and the admin API is guarded server-side.** Route guards in
   the admin SPA are convenience only; `worker/index.ts` is what actually rejects anonymous
   requests. Never add a mutation path outside `/admin/api/*`. `POST /api/ask` is the single
   exception and stays one: it writes nothing, and it is matched *before* the read-only guard
   because that guard would otherwise 405 it. A JSON POST preflights, so `corsHeaders` has to
   name both `POST` and `Content-Type` — dropping either breaks Ask Sumit from Vercel only,
   which local development will not show you.
7. **A refused iframe cannot be detected.** Safari frames third-party sites, and a host that
   sends `frame-ancestors 'none'` is indistinguishable from one that loaded: both fire `load`,
   both report a null `contentDocument`, both throw on `contentWindow.location`. Measured, not
   assumed. Detecting it inside `onLoad` is how every code host became a blank white pane once.
   The app frames optimistically and offers a way out instead.
8. **An uncaught exception in a Python Worker is returned to the caller as its traceback.**
   Body and all, with `/session/metadata/*.py` paths in it. `ai/src/entry.py` therefore wraps
   the whole handler and emits one fixed sentence instead. Measured against `pywrangler dev`,
   not assumed — reading an absent binding is enough to trigger it, which is why
   `providers/workers_ai.py` looks up `env.AI` at the moment it uses it rather than in its
   constructor.
9. **`legacy/portfolio-os.html` is the source of truth for behaviour questions.** If you
   are unsure how something used to move, read it there rather than inventing.

## How it got here

1. Imported from a Claude Design project (`Portfolio OS.dc.html`) as one 1,900-line HTML
   file with a hand-written desktop environment.
2. Briefly rewritten as a plain scrolling page — reverted, the desktop is the portfolio.
3. Ported feature-for-feature to React + TypeScript components (Vite at the time).
4. Migrated to Next.js for `generateMetadata()` and `next/og`, then given Launchpad,
   context menus, window snapping, Spaces, Safari and Notification Center.
5. Content moved out of `src/data/` and behind a Cloudflare Worker (D1 + R2) with a private
   admin CMS; those modules stayed on as the seed and the offline fallback.
6. The bar became app-aware (`appMenus.tsx`), the desk got a System Monitor and Sleep / Restart /
   Shut Down, and the packaged wallpaper photograph gave way to the theme packs' own layered
   gradients — it sat on top of all three and made them invisible.
7. Ask Sumit stopped matching keywords. `answerFrom` and `os.kb` are still there and still
   run — they are what answers with no Worker configured and what answers when the assistant
   is unreachable — but a configured site now asks a model grounded in the published bundle.

Deliberate substitutions from the original: the wallpaper picker stores the image as a data
URL in `localStorage` instead of the Claude Design sidecar, the desk defaults to the active
pack's gradient rather than to `/wallpaper.png` (`DEFAULT_WALLPAPER` is `null`, and Reset in the
picker returns to it), and the Code app shows the real React sources rather than the old single
file.

## Checks before you call something done

- `npm run build` (type-checks and prerenders — the routes list should show six
  `/projects/<slug>` pages and six matching `opengraph-image` entries; those six come from
  `FALLBACK`, so the build never needs the Worker)
- `npm test`, `npm run ai:test` and `npm run worker:check`
- If the Worker changed: `npm run worker:dev`, then confirm anonymous `POST`/`PATCH`/`DELETE`
  against `/admin/api/*` all return 401
- If `ai/` changed: `npm run ai:dev` and send one grounded ask. Workers AI has no local
  emulation, so this needs `wrangler login` and opens a remote session — a 502 there means the
  payload conversion in `providers/workers_ai.py` stopped matching what the binding accepts,
  which no unit test can see. Also try one question the portfolio does not cover: it must come
  back as the fallback line without the model being called at all.
- Drive the actual desktop in a browser at 1440×900: boot, dock, drag, resize, ⌘K, F4,
  right-click, ⌃→, and once at 390×844 for the mobile stack. Console must be clean.

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
UI library, no state library. Deploy target is **Vercel**.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # next build — prerenders every route and OG image
npm start       # serve the build
npm test        # vitest
npm run lint    # oxlint
```

`predev` / `prebuild` run `scripts/gen-sources.mjs`, which writes `src/generated/sources.ts`
(the files the in-app Code viewer displays). That file is gitignored and regenerated.

## Where things live

```
app/                          routes only — thin server components
  layout.tsx                  document + site metadata
  page.tsx                    the desktop
  opengraph-image.tsx         site-level 1200×630 card
  projects/[slug]/
    page.tsx                  generateStaticParams + generateMetadata + deep link
    opengraph-image.tsx       per-project card via next/og ImageResponse
  favicon.ico
src/
  data/                       ALL content: projects.ts, profile.ts, sections.ts, os.ts
  og/card.tsx                 the card both OG images render
  os/
    store.tsx                 single reducer: windows, Spaces, prefs, overlays
    types.ts registry.ts packs.ts anim.ts css.ts
    useTheme.ts useMedia.ts useHotkeys.ts
    DesktopRoot.tsx           the 'use client' boundary the routes render
    shell/                    menu bar, dock, Launchpad, context menus, wallpaper,
                              Notification Center, Control Center, toasts, boot, grid
    wm/                       Window (drag/resize/snap), WindowManager, Mission Control
    apps/                     one component per window; index.tsx maps AppId → component
    search/                   Spotlight (⌘K), shortcut sheet (?)
    mobile/MobileShell.tsx    stacked page below 768px
  styles/os.css               chrome stylesheet
  components/primitives.tsx   Body, PageHead, Chips, StatusPill, FlowDiagram, MetricGrid…
legacy/                       the original single-file build — reference only, not shipped
scripts/gen-sources.mjs
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

**One store.** `src/os/store.tsx` is a `useReducer` + context. Add an action to the union,
handle it in the reducer, dispatch it from a component. No side effects in the reducer.

**Content lives in `src/data/`.** Components render it; they never own copy. Adding a
project to `PROJECTS` in `src/data/projects.ts` gives you a desktop folder, a Finder entry,
a window, a Spotlight hit, an Ask Sumit answer target, a `/projects/<slug>` route and an OG
image — with no other edit. That property is deliberate; keep it true.

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
6. **`legacy/portfolio-os.html` is the source of truth for behaviour questions.** If you
   are unsure how something used to move, read it there rather than inventing.

## How it got here

1. Imported from a Claude Design project (`Portfolio OS.dc.html`) as one 1,900-line HTML
   file with a hand-written desktop environment.
2. Briefly rewritten as a plain scrolling page — reverted, the desktop is the portfolio.
3. Ported feature-for-feature to React + TypeScript components (Vite at the time).
4. Migrated to Next.js for `generateMetadata()` and `next/og`, then given Launchpad,
   context menus, window snapping, Spaces, Safari and Notification Center.

Deliberate substitutions from the original: the wallpaper picker stores the image as a data
URL in `localStorage` instead of the Claude Design sidecar, and the Code app shows the real
React sources rather than the old single file.

## Checks before you call something done

- `npm run build` (type-checks and prerenders — the routes list should show six
  `/projects/<slug>` pages and six matching `opengraph-image` entries)
- `npm test`
- Drive the actual desktop in a browser at 1440×900: boot, dock, drag, resize, ⌘K, F4,
  right-click, ⌃→, and once at 390×844 for the mobile stack. Console must be clean.

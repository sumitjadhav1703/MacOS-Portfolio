# Sumit's Portfolio OS

An interactive portfolio built as a desktop environment — windows, dock, Launchpad,
Spotlight, a Shell, Spaces, Mission Control and a boot sequence. Next.js (App Router),
React and TypeScript, deployed on Vercel.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # next build — prerenders every route and OG image
npm start          # serve the build
npm test           # vitest: project data invariants
```

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
legacy/                      the original single-file build, kept for reference
```

## Adding a project

Append to `PROJECTS` in `src/data/projects.ts`. The route `/projects/<slug>`, its metadata
and its preview image are all generated from that array — nothing else to touch. The slug
is the id without the `project-` prefix.

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
- Deploy: import the repo on Vercel. It detects Next.js and runs `npm run build`; the
  project pages and their OG images are prerendered at build time.

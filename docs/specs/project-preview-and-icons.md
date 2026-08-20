# SumitOS — Smart Project Preview + Automatic Platform and Skill Icons

You are modifying an existing production-oriented SumitOS portfolio.

READ `AGENTS.md` FIRST and treat it as the source of truth for project architecture and constraints.

The project is:

- Next.js 16 App Router
- React 19
- TypeScript
- Vitest
- Next.js `next/og` for generated project Open Graph images
- Vercel for the public site
- Cloudflare Worker + D1 + R2 for CMS/backend
- private admin at the Worker `/admin`
- `ContentProvider` + `FALLBACK`
- dynamic CMS-created projects
- project routes `/projects/[slug]`
- project-specific `opengraph-image.tsx`

Do not rebuild or redesign the application.

Do not introduce another backend.

Do not introduce Supabase, Firebase, Neon, or another CMS.

Preserve the existing SumitOS visual system, inline `s()` styling, `os.css`, element IDs, data attributes, reducer architecture, fallback behavior, and first-paint behavior.

---

# MAIN GOAL

Implement three connected capabilities:

1. Improve the existing project preview / Open Graph system so project links automatically produce useful visual previews.
2. Automatically show the correct platform icon next to external links.
3. Automatically show the correct technology/skill icon next to skills and project stack items.

These must be data-driven and automatically apply to:

- all existing projects
- all existing skills
- all existing social/platform links
- every project created later through the CMS
- every skill added later through the CMS
- every link changed later through the CMS

No project-specific component edits should be required.

---

# IMPORTANT EXISTING IMPLEMENTATION

The repository already contains:

```text
app/opengraph-image.tsx
app/projects/[slug]/opengraph-image.tsx
src/og/card.tsx
```

and already generates project-specific Open Graph preview cards with `next/og`.

Therefore:

## DO NOT build a second unrelated OG-image system.

First inspect the existing implementation and extend it.

The existing OG/card rendering should remain the single source of truth for the visual design of project preview images.

---

# PHASE 0 — INSPECT ONLY

Before writing code, inspect:

```text
app/opengraph-image.tsx
app/projects/[slug]/opengraph-image.tsx
src/og/card.tsx
src/data/content.ts
src/data/projects.ts
src/os/content.tsx
src/os/apps/
src/os/shell/
worker/content.ts
worker/tables.ts
worker/admin.ts
worker/admin-ui/
```

Also search for every place that renders:

- project links
- GitHub links
- social links
- skill names
- technology stacks
- project stack chips
- certificate links
- external links

Report:

```text
Current OG architecture:
Current preview UI:
Current project link architecture:
Current social link architecture:
Current skill architecture:
Current CMS fields involved:
Reusable link components:
Reusable chip/skill components:
```

Do NOT modify code in this phase.

STOP after reporting.

---

# PHASE 1 — IMPROVE THE EXISTING PROJECT PREVIEW SYSTEM

## Objective

Use the existing project OG-card architecture and make project previews automatically richer.

Do not replace `src/og/card.tsx`.

Extend it.

The preview should be able to represent:

- project title
- tagline
- status
- technology stack
- platform/site identity
- live URL hostname
- GitHub URL hostname
- existing project imagery where available
- existing SumitOS visual identity

Use the existing SumitOS OG-card style.

Do not introduce a generic social-media card design.

---

# PHASE 1A — LINK METADATA

First determine what metadata is already available locally from the project CMS.

Prefer project data already stored in D1:

```text
title
tagline
stack
links
cover_key
featured
```

Do not fetch an external website merely to generate the project's own OG image if the existing CMS data already gives enough information.

The goal is deterministic generation.

---

# PHASE 1B — OPTIONAL EXTERNAL METADATA

Only if a project explicitly benefits from it, investigate whether the Worker can safely resolve metadata from the project's external URL.

If implementing external metadata resolution:

- only HTTP/HTTPS
- SSRF protection
- reject localhost/private/link-local addresses
- strict timeout
- strict response-size limit
- redirect validation
- never execute downloaded JavaScript
- never store arbitrary HTML
- extract only metadata

Store resolved metadata in D1 if appropriate.

Never fetch external metadata during every public page render.

---

# PHASE 1C — PREVIEW UI

Find the current in-app project presentation.

If there is already a project preview region, improve it using the same OG-card design.

If there is not one, create one shared reusable component.

Use the same visual language as:

```text
src/og/card.tsx
```

Do not create a second visual design system.

The component must work for every project.

---

# PHASE 1D — FUTURE PROJECTS

Create a new project through `/admin`.

Enter:

```text
Title
Tagline
Live URL
GitHub URL
Stack
```

The system must automatically:

- derive platform identity
- show platform icons
- show technology icons
- generate the project OG preview
- expose the project through the existing dynamic project route
- preserve existing Finder/Launchpad/window behavior

No source-code modification is allowed.

---

# PHASE 2 — PLATFORM ICON SYSTEM

Create one reusable platform resolver.

Concept:

```text
URL
 ↓
normalize hostname
 ↓
platform key
 ↓
icon
```

Examples:

```text
github.com       → GitHub
linkedin.com     → LinkedIn
huggingface.co   → Hugging Face
kaggle.com       → Kaggle
vercel.com       → Vercel
render.com       → Render
```

Do not hardcode icon components into individual projects.

---

# PHASE 2A — ICON SOURCE

Prefer an established icon set with developer/platform coverage.

Use an Iconify-compatible source.

Prefer:

- Simple Icons for company/platform brands
- Devicon for developer technologies

Use on-demand loading or an efficient local registry.

Do not bundle hundreds of unused icons into the public JavaScript.

---

# PHASE 2B — SHARED COMPONENT

Create one reusable component such as:

```text
PlatformIcon
```

Usage should conceptually be:

```tsx
<PlatformIcon url={link.url} />
```

The caller should NOT need to specify:

```text
icon="github"
```

The resolver should determine this automatically.

---

# PHASE 2C — APPLY IT EVERYWHERE

Apply the platform resolver to every reusable external-link rendering location.

At minimum inspect:

```text
project links
social links
profile links
contact links
certificate links
project detail pages
project Finder/window UI
admin preview
```

Do not duplicate detection logic.

If:

```text
https://github.com/...
```

becomes:

```text
https://huggingface.co/...
```

the icon must automatically change.

---

# PHASE 3 — TECHNOLOGY / SKILL ICON SYSTEM

Create one reusable technology resolver.

Concept:

```text
skill name
 ↓
normalize
 ↓
alias lookup
 ↓
icon identifier
```

Examples:

```text
Python
python
PYTHON
```

→ Python icon.

Examples:

```text
PyTorch
TensorFlow
React
TypeScript
JavaScript
Docker
HTML
CSS
FastAPI
Git
```

→ matching technology icons where an appropriate icon exists.

Do not assume every technology has a reliable logo.

---

# PHASE 3A — CENTRALIZED ALIASES

Maintain one centralized alias/resolver map.

For example:

```text
"python"      → python
"py"          → python
"pytorch"     → pytorch
"react.js"    → react
"react"       → react
"ts"          → typescript
"typescript"  → typescript
```

The project data must continue storing the human-readable skill name.

Do not replace:

```text
"Python"
```

with an icon ID in the database.

The icon is derived from the human-readable content.

---

# PHASE 3B — UNKNOWN TECHNOLOGIES

If a new skill is added from `/admin` and there is no known icon:

DO NOT fail.

Use:

```text
generic technology icon
```

or:

```text
clean text chip without an icon
```

The portfolio must continue rendering normally.

---

# PHASE 3C — ADMIN EXPERIENCE

The normal workflow must be:

```text
Admin
 ↓
Add Skill
 ↓
Type "PyTorch"
 ↓
Icon automatically appears
```

Do NOT require:

```text
upload SVG
choose icon file
edit source code
modify React component
```

Optionally provide a manual override only for rare unsupported/incorrect mappings.

Automatic resolution must remain the default.

---

# PHASE 4 — PROJECT STACK ICONS

Apply the technology resolver to every project's `stack`.

For example:

```text
Python
PyTorch
FastAPI
Docker
```

renders as:

```text
[icon] Python
[icon] PyTorch
[icon] FastAPI
[icon] Docker
```

Preserve the current SumitOS visual style.

Do not create a giant logo grid.

Icons should improve recruiter scanning.

---

# PHASE 5 — SOCIAL / PROFILE ICONS

Apply the same platform resolver to:

- GitHub
- LinkedIn
- Hugging Face
- Kaggle
- email
- website
- other platform links

Do not maintain separate platform detection systems.

There should be one resolver.

---

# PHASE 6 — VISUAL RULES

The icons must:

- align consistently with existing text
- preserve existing spacing
- work in both light and dark themes
- remain readable at 1440×900
- remain usable at 390×844
- never dominate the content
- not create excessive color noise
- use accessible labels
- use `aria-hidden="true"` when purely decorative

Prefer approximately 16–20px icons where appropriate, adapting to the current typography.

Do not hardcode new colors if the existing theme system can provide the correct styling.

Remember:

> `src/os/css.ts` and `src/styles/os.css` are load-bearing.

Do not convert these components to Tailwind/CSS modules/styled-components.

---

# PHASE 7 — PERFORMANCE

The existing project deliberately keeps the recruiter-facing first paint independent of the Worker.

Do not break this.

The new feature must NOT require:

```text
browser
 ↓
wait for icon API
 ↓
wait for metadata API
 ↓
render portfolio
```

Instead:

```text
FALLBACK content
 ↓
initial desktop render
 ↓
optional CMS replacement after mount
```

must remain intact.

Icons must load efficiently.

Do not eagerly load an enormous icon catalogue.

Preview generation should happen at build/runtime generation points or server-side resolution, NOT on every browser render.

---

# PHASE 8 — CMS INTEGRATION

Make sure the current CMS remains the single source of editable content.

The data model should continue storing:

```text
project.links
project.stack
social_links
skills
```

rather than storing rendered icon components.

The rendering layer derives icons.

When the content changes:

```text
edit URL
→ platform icon updates

edit skill
→ technology icon updates

add project
→ preview + icons automatically appear
```

No source-code change.

---

# PHASE 9 — CACHE / DATA CONSISTENCY

Use the existing `/api/content` bundle and cache architecture.

Do not create a second cache architecture unless necessary.

If any new persisted metadata is introduced:

- update cache invalidation
- update D1 migration
- update seed generation
- update fallback mapping
- verify admin mutations invalidate relevant content

Remember that the existing implementation intentionally has approximately a 60-second public-cache propagation window.

Do not redesign global cache invalidation merely for this feature.

---

# PHASE 10 — TESTING

Run:

```bash
npm run build
npm test
npm run lint
npm run worker:check
```

Then manually test at:

```text
1440×900
390×844
```

Test:

### Existing projects

```text
[ ] project opens
[ ] GitHub icon correct
[ ] live-site icon correct
[ ] stack icons correct
[ ] OG preview still generates
[ ] deep link works
```

### New project

Create from `/admin`:

```text
[ ] title
[ ] live URL
[ ] GitHub URL
[ ] stack
[ ] publish
```

Verify automatically:

```text
[ ] project appears in Finder
[ ] project appears in Launchpad
[ ] project opens
[ ] Spotlight finds it
[ ] Shell alias exists
[ ] project route works
[ ] OG image works
[ ] platform icons work
[ ] stack icons work
```

### Editing

Change:

```text
GitHub URL
Live URL
Stack item
Social link
Skill
```

Confirm that the appropriate icon/preview changes automatically.

---

# PHASE 11 — SECURITY

If external URL metadata fetching is implemented, explicitly test:

```text
localhost
127.0.0.1
private IP ranges
link-local addresses
invalid protocols
redirect to private addresses
oversized response
slow response
```

All unsafe cases must be rejected.

Never execute external JavaScript.

Never forward cookies or credentials from the Worker to arbitrary third-party sites.

---

# PHASE 12 — REGRESSION CHECK

Verify that these existing rules still hold:

```text
[ ] no browser globals during render
[ ] no time-dependent server rendering
[ ] reducer remains side-effect-free
[ ] existing keyboard shortcuts unchanged
[ ] existing IDs and data attributes unchanged
[ ] CSS system unchanged
[ ] ContentProvider still FALLBACK-first
[ ] Worker outage still allows fallback desktop boot
[ ] public API remains GET-only
[ ] admin mutations remain server-side protected
```

---

# PHASE 13 — FINAL REPORT

Report:

1. Existing preview implementation discovered
2. What was reused versus changed
3. Platform resolver design
4. Technology resolver design
5. Icon source used
6. New files
7. Modified files
8. D1 changes, if any
9. Worker changes, if any
10. Admin UI changes
11. Tests run
12. Desktop/mobile verification
13. Security verification
14. Performance impact
15. Remaining limitations

---

# HARD REQUIREMENTS

The implementation is NOT complete unless:

```text
[ ] all existing projects still work
[ ] future CMS projects work automatically
[ ] platform icons derive from URLs
[ ] technology icons derive from names
[ ] no per-project icon hardcoding
[ ] no per-project source changes
[ ] no icon uploads required
[ ] unknown platforms fail gracefully
[ ] unknown technologies fail gracefully
[ ] existing OG generation is reused/extended
[ ] generated previews remain available
[ ] first paint remains independent of API availability
[ ] public bundle remains reasonable
[ ] admin content remains the source of truth
[ ] build passes
[ ] tests pass
[ ] worker checks pass
[ ] mobile and desktop are verified
```

---

# EXECUTION RULE

Implement one phase at a time.

After each phase:

```text
inspect
→ implement
→ test
→ verify
→ report
→ STOP
```

Never implement the entire feature in one uncontrolled change.

Do not move to the next phase until the current phase has been verified.
# Changelog

Notable changes to SumitOS. The format follows [Keep a Changelog](https://keepachangelog.com/),
and this project uses [Semantic Versioning](https://semver.org/).

**Content is not in here.** Projects, certificates, experience, skills and the resume are edited
in `/admin` and publish immediately. Only code releases get a version. See
[docs/release-process.md](docs/release-process.md).

## [Unreleased]

## [1.0.0] — 2026-08-20

First tagged release. The desktop, the CMS behind it and the assistant that answers about it were
all built before this point; what this version adds is everything needed to change them safely.

### Added

- **Continuous integration.** Four workflows: the quality gate on every pull request and push to
  `master`, CodeQL over both the application code and the workflow files, dependency review on
  the diff, and a release workflow that runs the gate on a tag and drafts a release. Least
  privilege throughout — `contents: read` at the top of every file, and the only write scope in
  the repository is on the job that drafts a release, after verification passes.
- **`npm run ci`**, one command running lint, tests, type checks, the secret scan, the migration
  check, the build and the bundle-size gate. CI runs the same command a developer does.
- **Worker route, authorization and upload tests.** `worker/index.ts` and `worker/admin.ts` had
  none. The authorization matrix is derived from the table specs rather than typed out, so a
  content type added later is covered as soon as it is declared. 106 tests across 13 files became
  456 across 19.
- **A browser suite.** The desktop at 1440×900, the stacked shell at 390×844, and the CMS end to
  end against a real Worker with a real local D1 — sign in, create, draft, publish, duplicate,
  unpublish, upload, delete, log out. Every spec asserts a clean console.
- **Accessibility checks** with axe on the desktop, an open window and a project page.
- **A repository secret scan** (`npm run scan:secrets`), run locally and in CI, over everything
  git tracks plus the generated files.
- **A migration guard** (`scripts/check-migrations.mjs`) enforcing sequential numbering and the
  immutability of anything already applied, with checksums in `migrations/.checksums`.
- **A bundle-size gate** (`scripts/check-bundle.mjs`) against a measured baseline of 238.8 kB
  gzipped, warning at +5% and failing at +10%.
- **A production smoke test** (`npm run smoke`) that is safe to point at the live site: every
  check is a GET except four anonymous mutations that must be refused.
- **Documentation**: `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE` (MIT), this changelog, and
  `docs/` covering the release process, the release checklist, and the GitHub settings that
  cannot be configured from the repository.
- Dependabot for npm and GitHub Actions, a pull request template, issue templates and CODEOWNERS.

### Fixed

- **A project link's URL was never validated on the server.** `validate`'s `url` field kind
  guarded only `social_links.url` and `certificates.credential_url`; `projects.links` is a `json`
  field and was checked for shape alone, while the desktop renders each entry straight into an
  `href`. The admin UI's check runs in the browser, so a direct
  `PATCH /admin/api/projects/<id>` with a `javascript:` URL was accepted and stored. There is now
  one URL allowlist, called by both field kinds, on the path every write already takes.
- **A JSON column holding valid JSON of the wrong type reached the public bundle.** `parse` in
  `worker/map.ts` degraded a cell that failed to parse but not one holding `"a string"` or `42`,
  where every caller maps or spreads a list.
- **`site.email` had no format check** despite landing in a `mailto:` href.
- **`npm run worker:check` would fail on a clean checkout.** `worker/admin-ui/tsconfig.json`
  includes a gitignored generated file, and this was the one script with no `pre` hook to
  generate it.
- Two lint warnings in `src/os/store.tsx` — `...(win.restore ?? {})`, where spreading `undefined`
  is already a no-op.

### Changed

- **`npm run lint` can now fail.** It exited 0 with five warnings, three of them in `legacy/`,
  which is reference-only and excluded from every tsconfig but not from lint. With `legacy/` and
  the generated files ignored and the other two fixed, it runs at `--max-warnings=0`.
- Node is pinned to 24 in `engines` and `.nvmrc`.
- `vitest.config.ts` names the unit directories explicitly, so `npm test` no longer tries to
  collect the Playwright suites.
- The three specification documents this project was built from move from the repository root to
  `docs/specs/`, with a README saying they record what was asked for rather than what the code
  does.
- `next-env.d.ts` is no longer tracked. Next writes different contents for `next dev` than for
  `next build`, so a committed copy is dirty half the time.

### Security

- The URL allowlist fix above closes a stored-XSS path reachable by an authenticated admin
  request that bypassed the browser-side check.
- Authorization is now asserted against the server for every admin route: no cookie, a malformed
  cookie, an unknown session and an expired session all return 401; a mutation with a missing or
  foreign `Origin` returns 403. Both guards were verified by removing them — without the 401 gate
  182 tests fail, without the link allowlist 5 do.
- Login lockout, cookie flags, session expiry and revocation are covered, along with a blanket
  assertion that no response body contains a password, a hash or a session id.
- Upload guards are covered: size, empty files, unknown categories, and bytes that do not match
  the claimed type. Asset deletion is covered, including the refusal to delete a file a content
  row still references.
- The four repository scripts no longer ask whether a file exists before reading or writing it —
  the operation itself answers that, and the two questions could disagree. CodeQL raised this on
  the branch's first run.
- `astral-sh/setup-uv` is pinned to a commit rather than a tag. It is the only action here that
  is not first-party GitHub or CodeQL, and a tag can be moved.

## Before 1.0.0

The application's own history, from `git log`. These were not tagged at the time.

- **`/admin` stopped being a database editor.** Every ` :: `-delimited textarea became a real
  editor, projects gained a draft that publishing promotes, the editor previews the actual window
  it will produce, and the list learned search, filters, quick edit and duplicate. Saves gained
  optimistic concurrency, so a second tab cannot silently overwrite the first.
- **The menu bar became app-aware**, the desk got a System Monitor and Sleep / Restart / Shut
  Down, and the packaged wallpaper gave way to the theme packs' own layered gradients.
- **Ask Sumit stopped matching keywords.** A configured site now asks a model grounded in the
  published bundle, through a second Worker written in Python that holds an `AI` binding and no
  database — so unpublished content is not withheld by a rule someone has to remember, it is
  never in the process that answers.
- **Icons became derived rather than stored.** One resolver reads a technology from a free-text
  tag and a platform from a URL's host, so changing a link in the CMS changes its mark.
- **Content moved out of `src/data/` and behind a Cloudflare Worker** (D1 + R2) with a private
  admin CMS. Those modules stayed on as the seed and the offline fallback, which is why the site
  still runs, and still builds, with no database at all.
- **The original single-file HTML desktop** was ported to React and TypeScript, then to Next.js
  for `generateMetadata()` and `next/og`, and given Launchpad, context menus, window snapping,
  Spaces, Safari and a Notification Center.

[Unreleased]: https://github.com/sumitjadhav1703/MacOS-Portfolio/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/sumitjadhav1703/MacOS-Portfolio/releases/tag/v1.0.0

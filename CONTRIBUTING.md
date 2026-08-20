# Contributing

This is a personal portfolio, not a product with a roadmap. Issues and pull requests are welcome
anyway — especially anything that is broken, wrong, or insecure.

Read [AGENTS.md](AGENTS.md) first. It explains how the desktop is put together and lists the
conventions that will bite you if you ignore them. This file is only about the mechanics of
making a change.

## Setup

Node 24 (there is an `.nvmrc`), and `uv` if you are touching `ai/`.

```bash
npm install
npm run dev          # http://localhost:3000
```

The site runs standalone. Without `NEXT_PUBLIC_API_URL` it serves the content compiled into
`src/data/`, so you need no database, no account and no Cloudflare login to work on the desktop.
Start the Worker only if you are working on the CMS:

```bash
npm run worker:migrate:local   # once
npm run worker:dev             # :8787, admin UI included
```

For `/admin` you need a password. Generate one, and put the printed line in `.dev.vars` as
`ADMIN_PASSWORD_HASH` — in **single quotes**, because the file is parsed as dotenv and the hash is
full of `$`:

```bash
node scripts/hash-password.mjs
```

`.dev.vars` is gitignored and must stay that way.

## Branching

Branch off `master`. Name it for what it does: `feat/…`, `fix/…`, `chore/…`, `docs/…`. `master`
is protected and takes changes through a pull request.

## Before you push

```bash
npm run ci        # lint, tests, types, secret scan, migration check, build, bundle size
```

That is the same command CI runs, so if it passes here it passes there. Then, depending on what
you touched:

```bash
npm run ai:test       # ai/ changed
npm run e2e           # the desktop changed
npm run e2e:admin     # the Worker or the admin changed
```

And if anything visual changed, drive it in a browser at 1440×900 and again at 390×844. The
console must be clean. The browser is still the only place several things can fail — that is why
AGENTS.md ends with a list of them.

## Tests

Use the cheapest layer that can actually catch the bug:

| The thing | Where it belongs |
|---|---|
| A pure function — mapping, validation, a draft | a `*.test.ts` next to it |
| A route, a guard, a status code | `worker/*.test.ts`, driving the real handler through `worker/test-harness.ts` |
| Something that needs a rendered page | `e2e/` |
| The CMS end to end | `e2e/admin.spec.ts`, via `npm run e2e:admin` |

Hostile input — XSS strings, `javascript:` URLs, traversal, fake MIME types — lives in
`worker/security-fixtures.ts`. Import from there. Do not paste a new copy into your suite; the
whole point is that adding a thirteenth attack string covers every boundary at once.

If you add a guard, check that removing it fails a test. A test that passes either way is
decoration.

## Migrations

Applied migrations are immutable. D1 records what it has run and never re-runs it, so editing an
old file changes what a fresh database gets while every existing database stays on the old shape
— silently, and with no way back. If `0001` is wrong, write `0004` that corrects it.

```bash
# after adding migrations/0004_something.sql
node scripts/check-migrations.mjs --write   # updates migrations/.checksums
```

Commit the checksums with the migration.

## Commits

Sentence-style subjects in the imperative, describing what the change does rather than which
files moved: *"Give the menu bar to the focused app"*, not *"feat(menubar): updates"*. Look at
`git log` and match it.

The body is for **why**. If the reasoning is obvious from the diff, there does not need to be
one. If you measured something, or ruled something out, or the obvious approach was wrong — write
that down. It is the part nobody can reconstruct later.

## Security-sensitive changes

Anything touching auth, sessions, uploads, validation, CORS, the public bundle, or adding a
dependency. Say so in the pull request, and be able to answer:

- Can this reach a mutation without a session?
- Does this render a value into an `href` or `src` without passing through `validate`?
- Does this put anything in the public bundle that `published = 1` did not already allow?

Found an actual vulnerability? Do not open a pull request. See [SECURITY.md](SECURITY.md).

## What is unlikely to be merged

- Converting the inline `s('…')` styles to Tailwind or CSS modules. Keeping the literal
  declaration text is what makes the port faithful; AGENTS.md explains it.
- A second place that maps a tag or a URL to an icon. There is one resolver, deliberately.
- A `draft` column on a second table to make the admin symmetric. The asymmetry is the honest
  part.
- A state library, a UI library, or a CSS framework.

If you think one of these is genuinely right, open an issue and make the argument first — do not
spend a weekend on a pull request that starts from a "no".

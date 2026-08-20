# Release checklist

Work through it in order. The point is not ceremony — it is that steps 10 to 13 have no undo, and
everything before them is what makes those safe.

For a **content** change (a project, a certificate, the resume), none of this applies. Edit it in
`/admin` and publish. See [release-process.md](release-process.md).

## Before you start

- [ ] Working tree clean — `git status`
- [ ] On `master`, up to date with `origin/master`
- [ ] Every pull request intended for this release is merged
- [ ] `git diff --check` — no whitespace errors, no conflict markers

## The gate

Run it from a clean state, not from whatever the last build left behind:

```bash
rm -rf node_modules src/generated .next
npm ci
npm run ci
```

- [ ] `npm run ci` passes — lint, tests, types, secret scan, migration check, build, bundle size
- [ ] `npm run ai:test` passes
- [ ] `npm run e2e` passes
- [ ] `npm run e2e:admin` passes
- [ ] Bundle size did not grow unexpectedly — if `check:bundle` warned, know why

## Security

- [ ] `npm run scan:secrets` clean
- [ ] CodeQL alerts on `master` are zero, or every one is triaged with a reason
- [ ] Dependency review passed on every pull request in this release
- [ ] `npm audit` reviewed — a high or critical in a runtime dependency blocks the release
- [ ] Nothing new in `git ls-files` that should not be tracked
- [ ] No `.env`, `.dev.vars` or credential in the diff

## Migrations

Skip if this release adds none.

- [ ] Read the migration. Every statement, out loud if it drops or renames anything
- [ ] It is a **new** numbered file — no applied migration was edited
- [ ] `migrations/.checksums` regenerated and committed with it
- [ ] Applied against a local database and the app still works:
      `npm run worker:migrate:local && npm run e2e:admin`
- [ ] If it drops or renames a column: you have exported the affected table first
- [ ] You know what the forward fix looks like if it goes wrong. There is no rollback

## The browser

Automated tests do not see everything. AGENTS.md lists these because each has failed at least
once in a way nothing else caught.

- [ ] `/` at 1440×900: boot, dock, drag, resize, ⌘K, F4, right-click, ⌃→. Console clean
- [ ] `/` at 390×844: the mobile stack renders and does not scroll sideways
- [ ] A project deep link opens the right window
- [ ] `/admin` at both sizes: editors, save bar, publish, preview, ⌘K, an upload
- [ ] Brand marks actually paint — a cross-origin mask is dropped silently, and typecheck, tests
      and `curl` all pass while it is broken

## Documentation

- [ ] `CHANGELOG.md` updated, describing what shipped rather than which files changed
- [ ] `README.md` still accurate — commands, environment variables, architecture
- [ ] `AGENTS.md` updated if a convention or a gotcha changed
- [ ] No secret, real hostname or private URL in any of them

## Cut it

- [ ] `package.json` version bumped
- [ ] Changelog and version bump committed together
- [ ] Tag created and pushed — `git push origin master --follow-tags`
- [ ] `release.yml` went green
- [ ] Draft release **read** before publishing — generated notes describe commits, not outcomes

## Deploy

Order matters. A service binding to a Worker that does not exist yet fails to deploy.

- [ ] `npm run worker:migrate` — schema first, if there is one
- [ ] `npm run ai:deploy` — if `ai/` changed. Before the API, never after
- [ ] `npm run worker:deploy`
- [ ] Vercel build went green

## Verify it

- [ ] `npm run smoke -- https://<site> https://<worker>` — all checks pass
- [ ] Homepage loads and boots
- [ ] A known project route loads, and its link preview image renders
- [ ] `/api/content` returns the expected number of published projects
- [ ] An anonymous `POST /admin/api/projects` returns 401
- [ ] Sign in to `/admin` by hand and load one editor. This is not automated against production,
      on purpose — there is no production password in CI
- [ ] Ask Sumit answers a real question, and answers one it does not cover with the fallback line

## If something is wrong

- [ ] You know which layer broke — see the table in [release-process.md](release-process.md)
- [ ] Site: promote the previous Vercel deployment
- [ ] Worker: `npx wrangler rollback`
- [ ] Schema: **forward fix only**. Do not invent a down-migration

# Release process

How a version of SumitOS ships, and how to get back if it goes wrong.

## Two kinds of change

This repository holds an application. The site also has **content**, which lives in D1 and is
edited at `/admin`. They release completely differently, and conflating them is how a portfolio
ends up cutting a version for a typo.

### Content — no release

A project, a certificate, an experience entry, a skill group, the resume, profile copy, Shell or
Ask Sumit text.

Edit it in `/admin` and publish. That is the whole process. It is live within the 60-second cache
TTL, and immediately in the location the admin request was served from. Ask Sumit can answer
about a new project within the same TTL, with no knowledge file and no redeploy.

**No tag, no release, no deploy, no commit.** `src/data/` is the seed and the offline fallback,
not the live source — editing it changes what a fresh database is seeded with and what the site
shows when the API is unreachable. It does not change published content.

### Code — a release

React components, Worker code, the admin UI, the schema, dependencies, the Python assistant.

Tests, CI, a tag, and the checklist below.

## Versioning

SemVer, tagged `vMAJOR.MINOR.PATCH`.

| | |
|---|---|
| **Major** | A breaking change to the API shape, the content bundle, or the database schema in a way that is not backward compatible |
| **Minor** | A new capability — a desktop feature, an admin screen, a new content type |
| **Patch** | A fix, a dependency bump, a documentation change worth cutting |

The version lives in exactly two places that must agree: `package.json` and the git tag.

**There is no `release.json`.** Spec §21 offers one and permits skipping it, and it is skipped
deliberately: a third copy of the version — one nothing reads at runtime, since the site is
statically prerendered and the Worker serves content rather than metadata — is one more thing to
forget to update. If a build ever needs to identify itself, `package.json` plus the commit SHA
already do it.

Do not cut a version for a content change. See above.

## Cutting a release

1. Work through [release-checklist.md](release-checklist.md). All of it.
2. Update `CHANGELOG.md`: move `Unreleased` into a dated version heading.
3. Bump `package.json`.
4. Commit both together: `Release v1.2.0`.
5. Tag and push:

   ```bash
   git tag -a v1.2.0 -m "v1.2.0"
   git push origin master --follow-tags
   ```

6. `release.yml` runs the full gate and drafts a GitHub release with generated notes.
7. **Read the draft.** Generated notes describe commits, and commits sometimes describe work
   differently from how it shipped. Edit it, then publish.

## Deploying

CI does not deploy. That is deliberate: no Cloudflare or Vercel credential exists in this
repository, so there is no token to leak and no way to make a tag push to production.

Deploy in this order, from a machine that is already authenticated:

```bash
# 1. Schema first, if the release has a migration.
npm run worker:migrate         # --remote

# 2. The assistant, if ai/ changed. Before the API, never after:
#    a service binding to a Worker that does not exist yet fails to deploy.
npm run ai:deploy

# 3. The API and the admin SPA.
npm run worker:deploy

# 4. The site. Vercel deploys from master on push; nothing to run.
```

Then smoke it:

```bash
npm run smoke -- https://<site> https://<worker>
```

## Rolling back

The three layers roll back differently, and one of them does not roll back at all.

### The site — Vercel

Promote the previous deployment in the Vercel dashboard. Instant, and it does not touch the
Worker or the database.

### The Worker — versioned

```bash
npx wrangler deployments list
npx wrangler rollback [deployment-id]
```

Worker deployments are versioned, so this is a real rollback. Note that it reverts **code only**.
Anything the newer code wrote to D1 or R2 stays written.

### The database — forward only

**There is no rollback.** D1 migrations are forward-only: wrangler records what it has applied and
never re-runs it. There is no down-migration in this repository and one must not be invented — a
generated `DROP COLUMN` against a live database is how a portfolio loses its content permanently.

If a migration is wrong, write the next one:

```
migrations/0004_fix_whatever_0003_did.sql
```

Then `node scripts/check-migrations.mjs --write` and commit the checksums with it.

This is why the checklist asks you to read the migration before tagging. It is the one step with
no undo.

### Which one do I need?

| What broke | Do |
|---|---|
| The desktop renders wrongly | Promote the previous Vercel deployment |
| The API returns the wrong thing | `wrangler rollback` |
| The admin is broken | `wrangler rollback` — the SPA ships with the Worker |
| A migration did the wrong thing | Write a forward migration. Do not roll the Worker back and leave the schema ahead of it |
| Content is wrong | Edit it in `/admin`. This is not a release problem |

## If a secret leaks

1. Rotate first, discuss after. `node scripts/hash-password.mjs`, then
   `npx wrangler secret put ADMIN_PASSWORD_HASH`.
2. Every existing session survives a password change — the rows are independent of it. Clear them:
   `npx wrangler d1 execute sumitos --remote --command "DELETE FROM sessions"`.
3. Rotate any Cloudflare or Vercel token that was exposed, in their dashboards.
4. Removing the secret from the repository history does not un-leak it. Treat anything that was
   pushed as public, permanently.

# SumitOS — Final Architecture Cleanup, Production Deployment & Release Setup

You are performing the **final engineering and deployment phase** of the existing SumitOS portfolio.

This is not a feature-development task.

The goal is to leave the repository:

- cleanly structured
- understandable
- maintainable
- reproducible
- production-ready
- safely deployable
- documented for future development
- ready for GitHub-based CI/CD
- ready for my first real production deployment

I am deploying this project for the first time, so do not assume I already understand the deployment process.

You must make the repository understandable to both:

1. a developer opening it for the first time
2. me, as the owner who will maintain and deploy it later

---

# CRITICAL EXECUTION RULE

Do NOT immediately move files around.

Do NOT immediately deploy.

Do NOT blindly rewrite the architecture.

Work in strict phases.

For every phase:

```text id="b4xq0q"
INSPECT
↓
ANALYZE
↓
PROPOSE
↓
IMPLEMENT
↓
TEST
↓
VERIFY
↓
REPORT
↓
STOP
```

Do not continue automatically after a failed phase.

Do not declare success merely because `npm run build` passes.

---

# PHASE 0 — READ THE PROJECT CONTRACT

Before changing anything, read:

```text id="x0a3f7"
AGENTS.md
README.md
package.json
package-lock.json
next.config.ts
wrangler.jsonc

worker/
worker/admin-ui/
migrations/
scripts/

app/
src/
legacy/
.github/
```

Treat `AGENTS.md` as authoritative for architecture and invariants.

Also inspect the current Git state:

```bash
git status
git branch --show-current
git remote -v
git log --oneline -20
```

Determine:

```text id="f90d77"
Current branch
Default branch
Git remote
Current deployment assumptions
Current Worker name
Current D1 resources
Current R2 resources
Current environment variables
Current secrets
Current build commands
Current test commands
Current deployment commands
```

Do not modify anything yet.

STOP.

---

# PHASE 1 — FINAL ARCHITECTURE AUDIT

Audit the current architecture against the actual repository.

The intended architecture is:

```text id="18mgl0"
                    PUBLIC USER
                        │
                        ▼
             sumitjadhav.vercel.app
                        │
                        ▼
                 Next.js / Vercel
                        │
                        ▼
                Public read API
                        │
                        ▼
             Cloudflare Worker
                  ┌─────┴─────┐
                  ▼           ▼
                 D1          R2
```

Admin:

```text id="49r2h8"
                    OWNER
                      │
                      ▼
      <worker>.workers.dev/admin
                      │
                      ▼
                 Admin SPA
                      │
                      ▼
              Cloudflare Worker
                 ┌────┴────┐
                 ▼         ▼
                D1        R2
```

Verify that the actual code matches this architecture.

Do not accept documentation that disagrees with the repository.

Produce:

```text id="2b9r8v"
Architecture:
Correct
Incorrect
Ambiguous
Needs cleanup
```

STOP.

---

# PHASE 2 — FINAL FILE / FOLDER ARCHITECTURE

Review every top-level directory and identify whether it has a clear purpose.

Current important areas include:

```text id="n3b8f5"
app/
src/
worker/
migrations/
scripts/
legacy/
public/
.github/
```

Determine:

- what is production code
- what is build tooling
- what is generated
- what is test code
- what is legacy/reference-only
- what should never ship
- what should be documented
- what can be moved
- what should remain where it is

Do NOT reorganize merely for aesthetics.

Only change architecture when it improves:

- ownership
- discoverability
- testability
- deployment safety
- maintainability
- separation of responsibilities

---

# PHASE 3 — TARGET FILE ARCHITECTURE

Propose the final repository structure.

Use the current code as the source of truth.

A target structure may resemble:

```text
project/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── opengraph-image.tsx
│   └── projects/
│       └── [slug]/
│           ├── page.tsx
│           └── opengraph-image.tsx
│
├── src/
│   ├── components/
│   ├── data/
│   ├── generated/
│   ├── og/
│   └── os/
│       ├── apps/
│       ├── shell/
│       ├── search/
│       ├── wm/
│       └── mobile/
│
├── worker/
│   ├── index.ts
│   ├── auth.ts
│   ├── admin.ts
│   ├── content.ts
│   ├── files.ts
│   ├── http.ts
│   ├── tables.ts
│   ├── admin-ui/
│   └── tests/
│
├── migrations/
├── scripts/
├── public/
├── legacy/
├── .github/
│   └── workflows/
│
├── docs/
├── AGENTS.md
├── README.md
├── SECURITY.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── package.json
├── package-lock.json
├── next.config.ts
└── wrangler.jsonc
```

This is only a reference.

Do not force the exact structure.

Use the actual repository and move only when there is a clear benefit.

For every proposed move explain:

```text id="4e18x7"
Current path
New path
Reason
Import changes
Risk
Test required
```

STOP.

---

# PHASE 4 — SEPARATION OF RESPONSIBILITIES

Audit the code for responsibility leakage.

Ensure approximately:

```text id="q4n4ib"
app/
→ routing + server page composition

src/os/
→ desktop runtime and UI

src/data/
→ fallback/seed content and shared content definitions

src/generated/
→ generated artifacts only

worker/
→ API, authentication, D1, R2, admin

worker/admin-ui/
→ admin application only

migrations/
→ database schema history

scripts/
→ development/build/deployment utilities

.github/
→ automation

docs/
→ human documentation
```

Look for files that are doing too many unrelated things.

Do not perform a giant refactor.

Only make targeted architectural improvements that reduce complexity without changing behavior.

STOP.

---

# PHASE 5 — GENERATED FILES AUDIT

Identify every generated file.

For each determine:

```text id="b2d0xs"
generated automatically?
tracked?
ignored?
required at build time?
required at runtime?
safe to delete and regenerate?
```

Pay particular attention to:

```text
src/generated/sources.ts
src/generated/icon-slugs.ts
worker/assets/
migration seed output
generated test files
```

Ensure generated output is not accidentally committed when it should be regenerated.

Ensure required generated files are reproducible from a clean checkout.

STOP.

---

# PHASE 6 — IMPORT / DEPENDENCY CLEANUP

After architecture changes:

```bash
npm test
npm run lint
npm run build
npm run worker:check
```

Search for:

- broken imports
- circular dependencies
- unused modules
- duplicated helpers
- accidental client imports of server-only code
- accidental public imports of admin-only code

Do not create new abstractions just to reduce a small number of lines.

STOP.

---

# PHASE 7 — PUBLIC / ADMIN ISOLATION

Verify that:

```text id="s5m1o4"
Public Next.js bundle
```

does NOT include unnecessary:

```text id="aufr6g"
Admin SPA
admin-only components
admin credentials
admin-only server code
```

Verify:

```text id="3t0whm"
Admin SPA
```

is served by the Worker and remains separate from the public Vercel application.

Inspect the final production build where practical.

STOP.

---

# PHASE 8 — ENVIRONMENT MODEL

Create a clear environment model.

Separate:

```text id="0c3g4n"
LOCAL
TEST
PRODUCTION
```

Document every variable.

Example:

```text id="q4f8y1"
NEXT_PUBLIC_API_URL
SITE_ORIGIN
```

And every secret:

```text id="z9s0qk"
ADMIN_PASSWORD_HASH
```

Document:

```text id="5ww7cc"
where it lives
who owns it
whether it is public
where it is configured
how it is changed
```

Never put real production secrets into:

```text id="8w5v9g"
Git
README
source code
client environment variables
screenshots
logs
generated source viewer
```

---

# PHASE 9 — `.env` / SECRET SAFETY

Audit:

```text id="rvc0j1"
.env
.env.local
.env.production
.dev.vars
.wrangler/
```

Ensure sensitive local files are ignored.

Check:

```bash
git status
git ls-files | grep -E '(^|/)(\.env|\.dev\.vars|.*secret.*)'
```

Adapt commands to the actual repository and shell.

If any secret has already been committed historically:

1. stop
2. report it
3. determine whether rotation is necessary
4. do not assume deleting the current file removes the secret from Git history

Never print secret values in the final report.

STOP.

---

# PHASE 10 — NODE / TOOLCHAIN REPRODUCIBILITY

Determine the supported Node.js version.

Use an explicit version mechanism where appropriate:

```text id="ssxm8s"
.nvmrc
.node-version
package.json engines
```

Do not add multiple conflicting version files.

Confirm the version works with:

- Next.js
- React
- Wrangler
- existing dependencies

Wrangler's current documentation recommends installing it locally in the project rather than globally.

Ensure `package-lock.json` is authoritative.

Use:

```bash
npm ci
```

for clean installs.

STOP.

---

# PHASE 11 — FINAL LOCAL BUILD FROM CLEAN STATE

Simulate a first-time developer setup.

From a clean working state:

```bash
npm ci
npm run build
npm test
npm run lint
npm run worker:check
```

Then verify:

```text id="y2t4td"
public site boots
fallback content works
Worker starts locally
local D1 works
local admin works
local R2 binding works if configured locally
```

If any step requires undocumented manual work, update the documentation.

STOP.

---

# PHASE 12 — LOCAL WORKER ENVIRONMENT

Ensure local development is safe.

The local setup should use:

```text id="x7fr8y"
local D1
local Worker
local development secret
local R2 binding/local equivalent
```

Never require the developer to point local commands at production just to get started.

Document:

```bash id="q5t7vx"
npm run worker:migrate:local
npm run worker:dev
NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 npm run dev
```

Adapt commands to the actual package scripts.

STOP.

---

# PHASE 13 — DATABASE MIGRATION SAFETY

Audit:

```text id="4c5n2r"
migrations/
scripts/seed-d1.mjs
```

Confirm:

```text id="2b1v9j"
0001 is immutable
0002 is immutable once applied
new changes get new migration numbers
seed generation is reproducible
local migrations are separate from production
```

Test migrations locally.

Never allow the first deployment process to apply an unknown migration blindly.

STOP.

---

# PHASE 14 — PRODUCTION CLOUDFLARE RESOURCE MODEL

Confirm the required Cloudflare resources:

```text id="k8f6f7"
Worker
D1 database
R2 bucket
```

Expected names:

```text id="e4k8mc"
sumitos-api
sumitos
sumitos-assets
```

Do not assume IDs.

Use actual values from the account/configuration.

Cloudflare currently supports deploying Workers through Wrangler and managing D1/R2 through Wrangler commands.

STOP.

---

# PHASE 15 — FIRST CLOUDflare DEPLOYMENT PLAN

Because this is my first deployment, do NOT automatically deploy immediately.

First generate the exact commands I need to execute.

The sequence should be conceptually:

```text id="d85n56"
Cloudflare login
↓
Verify account
↓
Create/verify D1
↓
Create/verify R2
↓
Verify wrangler.jsonc bindings
↓
Apply production migrations
↓
Set production secret
↓
Deploy Worker
↓
Verify Worker
↓
Verify /api/content
↓
Verify /admin
```

Cloudflare's current docs use Wrangler for first-time Worker deployment, and `wrangler deploy` deploys the Worker to `workers.dev` or another configured endpoint.

Do not invent commands that don't match the current Wrangler configuration.

STOP.

---

# PHASE 16 — CLOUDFLARE AUTHENTICATION

Verify whether Wrangler is authenticated.

If not, explain that I need to run:

```bash
npx wrangler login
```

and verify the correct Cloudflare account before creating resources. Cloudflare's current Wrangler documentation uses local Wrangler and `wrangler login` for this workflow.

Do not ask me to paste credentials into source code.

STOP.

---

# PHASE 17 — D1 PRODUCTION SETUP

Create or verify:

```text id="r99c1w"
sumitos
```

Then:

1. confirm database ID
2. update the Wrangler binding if necessary
3. verify migration files
4. run migrations against the remote database
5. verify tables
6. verify seed content

Use the repository's existing migration script if available.

If the project has:

```bash
npm run worker:migrate
```

inspect what it actually does before using it.

Never guess.

Cloudflare's D1 documentation distinguishes local and remote database operations; production migration/application steps must target the remote database explicitly.

STOP.

---

# PHASE 18 — R2 PRODUCTION SETUP

Create or verify:

```text id="dg2w6g"
sumitos-assets
```

Verify:

```text id="8lm87n"
binding name
bucket name
upload permissions
worker access
public file route behavior
```

Cloudflare's current R2 Workers flow uses an R2 bucket bound to the Worker, and Wrangler can create/manage the bucket.

Do not expose private R2 credentials.

STOP.

---

# PHASE 19 — PRODUCTION SECRET SETUP

Set:

```text id="u9l6eu"
ADMIN_PASSWORD_HASH
```

as a Cloudflare Worker secret.

Do not put the plaintext admin password in the repository.

The repository should only document:

```text id="j07qk2"
how to generate hash
how to set secret
how to rotate it
```

Never print the real value in logs or output.

STOP.

---

# PHASE 20 — WORKER PRODUCTION DEPLOYMENT

Inspect `wrangler.jsonc` one more time.

Verify:

```text id="wh8wq0"
Worker name
D1 binding
R2 binding
assets
routes
environment
variables
workers.dev behavior
```

Then deploy using the repository's canonical command.

Cloudflare's current documented deployment command is:

```bash
npx wrangler deploy
```

with the actual configuration supplied by the project's Wrangler configuration.

If a script such as:

```bash
npm run worker:deploy
```

already exists, use that after inspecting it.

STOP.

---

# PHASE 21 — WORKER PRODUCTION SMOKE TEST

After deployment, verify:

```text id="4e1v6f"
Worker URL responds
/api/content responds
/api/projects responds
/files route behaves correctly
/admin loads
/admin login works
```

Security:

```text id="d1b5m0"
anonymous admin mutation = 401
fake session = 401
expired session = 401
public API mutation = rejected
```

Do not expose the password while testing.

STOP.

---

# PHASE 22 — VERCEL DEPLOYMENT

The public Next.js site remains on Vercel.

Do not migrate it to Cloudflare.

For the first deployment:

1. connect the GitHub repository to Vercel
2. confirm framework detection
3. confirm build command
4. confirm install command
5. add required environment variable
6. deploy
7. inspect logs
8. test production site

The important variable is:

```text id="k2mmnz"
NEXT_PUBLIC_API_URL
```

It should point to the production Worker API.

Do not put:

```text id="qgkm7d"
ADMIN_PASSWORD_HASH
```

or any Worker secret in Vercel's public environment variables.

STOP.

---

# PHASE 23 — VERCEL ENVIRONMENT MODEL

Clearly distinguish:

```text id="c4njf2"
Development
Preview
Production
```

Determine whether `NEXT_PUBLIC_API_URL` should differ for:

```text id="ak8yux"
local
preview
production
```

Do not set production API values in local development unless intentionally needed.

Do not expose private secrets through `NEXT_PUBLIC_*`.

STOP.

---

# PHASE 24 — FIRST PRODUCTION WEBSITE TEST

Open:

```text id="0rjp7o"
https://sumitjadhav.vercel.app/
```

Verify:

```text id="uo4y4r"
boot
desktop
dock
menu bar
Finder
Launchpad
Spotlight
Shell
Ask Sumit
project windows
deep links
mobile
```

At:

```text id="4x1rxo"
1440×900
390×844
```

Also verify:

```text id="y6pk4z"
console clean
no hydration errors
no failed API requests that break rendering
no broken images
```

STOP.

---

# PHASE 25 — FIRST PRODUCTION CMS TEST

Create a temporary or clearly identified project through the admin.

Test:

```text id="l5lqdm"
Create
Save Draft
Preview
Publish
```

Then verify on the public site:

```text id="xsg90s"
project appears
Finder updates
Launchpad updates
Spotlight updates
project window opens
project route works
OG image works
```

Then cleanly remove the test content and verify deletion.

Do not leave test content in the public portfolio.

STOP.

---

# PHASE 26 — FIRST PRODUCTION FILE TEST

Use the admin to test:

```text id="8nu4lj"
certificate upload
resume replacement
project cover upload
```

Verify:

```text id="cz1v3m"
R2 object exists
D1 reference correct
public route works
asset deletion protection works
```

Clean up test files after verification.

STOP.

---

# PHASE 27 — PRODUCTION CACHE TEST

Verify the known cache behavior.

Publish a harmless content change.

Record:

```text id="t3z9b2"
publish time
first public visibility
```

Do not redesign caching during deployment unless there is a real bug.

Document the actual behavior observed.

STOP.

---

# PHASE 28 — CUSTOM DOMAIN STATUS

The current architecture does not yet have a custom domain.

Therefore use:

```text id="j6w4c8"
Public:
sumitjadhav.vercel.app

Worker:
<worker>.<account>.workers.dev
```

Cloudflare currently provides `workers.dev` automatically for Workers, while recommending Workers routes or Custom Domains for business-critical production.

Do not purchase or configure a custom domain during this task unless explicitly requested.

Instead document the future migration path:

```text id="9osn76"
sumitjadhav.dev
↓
Vercel

api.sumitjadhav.dev
↓
Cloudflare Worker

admin.sumitjadhav.dev
↓
Cloudflare Worker / Access
```

Cloudflare Custom Domains can attach a Worker directly to a subdomain once a Cloudflare zone is available.

STOP.

---

# PHASE 29 — DEPLOYMENT DOCUMENTATION

Update `README.md`.

A first-time developer should be able to follow:

```text id="h2z9pe"
1. Clone
2. Install Node
3. npm ci
4. Start Next.js
5. Start local Worker
6. Create local D1
7. Configure local secret
8. Run tests
9. Deploy Worker
10. Deploy Vercel
11. Connect environment variables
12. Verify production
```

Document exactly:

```text id="r8g1h3"
which terminal command
what it does
where to run it
what output to expect
```

Do not document secret values.

STOP.

---

# PHASE 30 — DEPLOYMENT RUNBOOK

Create:

```text id="u6w8qf"
docs/deployment.md
```

Sections:

```text
Prerequisites
Architecture
Local Development
Cloudflare Setup
D1 Setup
R2 Setup
Worker Secrets
Worker Deployment
Vercel Setup
Environment Variables
Production Verification
Rollback
Troubleshooting
Future Custom Domain
```

The deployment guide must distinguish:

```text id="u60n95"
LOCAL
REMOTE/PRODUCTION
```

very clearly.

---

# PHASE 31 — ROLLBACK DOCUMENTATION

Document:

## Worker rollback

Use the actual Wrangler deployment/version commands supported by the repository.

Cloudflare currently provides version/deployment tooling and rollback workflows through Wrangler.

## Vercel rollback

Document how to redeploy/revert to a known-good deployment from Vercel.

## D1 rollback

Do NOT pretend D1 migrations have a magical rollback.

Use:

```text id="tb11rv"
forward migration
```

when schema repair is necessary.

Document this explicitly.

STOP.

---

# PHASE 32 — DEPLOYMENT FAILURE TROUBLESHOOTING

Create a troubleshooting table.

Examples:

```text id="z67opm"
Problem
Worker deploy fails

Check:
Wrangler authentication
Account
wrangler.jsonc
bindings
Node version
```

Another:

```text id="0x2fsh"
Problem
Public site loads but content does not update

Check:
NEXT_PUBLIC_API_URL
SITE_ORIGIN
Worker URL
CORS
/api/content
cache
```

Another:

```text id="n4s1cy"
Problem
Admin login fails

Check:
ADMIN_PASSWORD_HASH
cookie
Worker URL
session table
D1 binding
```

Another:

```text id="1d5p5k"
Problem
Uploads fail

Check:
R2 bucket
R2 binding
MIME validation
size limits
Worker logs
```

Only document problems actually relevant to the project.

STOP.

---

# PHASE 33 — FINAL REPOSITORY CLEANUP

Run:

```bash
git status
git diff --check
git ls-files
```

Check for:

```text id="1ec88u"
temporary files
debug files
secret files
unnecessary generated files
unused scripts
unused dependencies
obsolete documentation
stale deployment instructions
```

Remove only confirmed unnecessary files.

Do not delete `legacy/` automatically.

It is explicitly documented as reference-only.

STOP.

---

# PHASE 34 — FINAL TEST MATRIX

Run:

```bash
npm ci
npm test
npm run lint
npm run build
npm run worker:check
```

Then test locally:

```text id="0yupic"
public site
Worker
admin
D1
R2
```

Then production:

```text id="qs0q3d"
public site
API
admin
project route
OG image
resume
certificate
CMS publish
CMS delete
```

STOP.

---

# PHASE 35 — FINAL SECURITY CHECK

Before declaring production-ready, verify:

```text id="4khqbd"
[ ] no secrets committed
[ ] no secrets in public build
[ ] no admin code in public bundle
[ ] anonymous admin mutations rejected
[ ] public API read-only
[ ] production D1 correctly bound
[ ] production R2 correctly bound
[ ] secure session cookies
[ ] production origin configured correctly
[ ] CORS restricted correctly
[ ] file uploads protected
[ ] migration strategy documented
[ ] rollback documented
```

STOP.

---

# PHASE 36 — GIT / GITHUB FINALIZATION

Check:

```bash
git status
git remote -v
git log --oneline -10
```

If no GitHub remote exists:

- explain what needs to be connected
- do not invent a remote URL
- do not push without explicit authorization

If the remote already exists:

- ensure branch is correct
- ensure no secrets exist
- ensure CI workflow is ready
- ensure README/deployment documentation matches reality

STOP.

---

# PHASE 37 — RELEASE CANDIDATE

Prepare a production release candidate.

Verify:

```text id="r6b8y4"
clean working tree
all tests pass
production build passes
Worker check passes
security checks pass
deployment documentation exists
rollback documentation exists
no secrets
```

Create a recommended version/tag but do not fabricate release history.

Example:

```text
v1.0.0
```

only if this is genuinely the first production release.

STOP.

---

# PHASE 38 — FINAL DEPLOYMENT REPORT

Produce a clear beginner-friendly deployment report.

## A. Final architecture

Show:

```text id="1oq9d3"
Browser
 ↓
Vercel
 ↓
Next.js
 ↓
Cloudflare Worker
 ├── D1
 └── R2

Owner
 ↓
Worker /admin
```

## B. Final repository structure

Show the actual final tree.

## C. Local development

Give exact commands.

## D. Cloudflare deployment

Give exact commands.

## E. Vercel deployment

Give exact steps.

## F. Environment variables

List names only.

## G. Secrets

List names only.

## H. D1/R2 resources

List actual configured names/IDs where safe.

## I. Production URLs

List:

```text
Public
Worker
Admin
```

Do not expose secrets.

## J. Tests

List exact commands and results.

## K. Rollback

Explain clearly.

## L. Remaining limitations

Be honest.

---

# FINAL DEFINITION OF DONE

This task is complete only when:

```text id="p2o8fp"
[ ] Repository architecture is understandable
[ ] File organization is clean
[ ] Responsibilities are separated
[ ] Generated files are handled correctly
[ ] Local development is reproducible
[ ] Local D1 is safe
[ ] Production D1 is configured
[ ] Production R2 is configured
[ ] Worker deploys successfully
[ ] Admin works on production Worker
[ ] Vercel production build works
[ ] Public site works
[ ] CMS works
[ ] Public content updates automatically
[ ] Project routes work
[ ] OG images work
[ ] Resume works
[ ] Certificates work
[ ] Secrets are safe
[ ] Security checks pass
[ ] README is updated
[ ] deployment.md exists
[ ] rollback is documented
[ ] first-time deployment instructions are complete
[ ] Git repository is clean
[ ] release candidate is reproducible
```

---

# MOST IMPORTANT RULE FOR MY FIRST DEPLOYMENT

Do not assume I know what a Cloudflare resource, Wrangler binding, D1 migration, R2 bucket, Vercel environment variable, secret, deployment, or production environment is.

Whenever a deployment step is required, explain:

```text id="j3q1b4"
WHAT
WHY
WHERE
COMMAND
EXPECTED RESULT
WHAT TO DO IF IT FAILS
```

Do not ask me to guess.

Do not ask me to paste secrets into chat.

Do not expose credentials in logs.

---

# FINAL EXECUTION SEQUENCE

Follow exactly:

```text id="xk5h1o"
Phase 0  → STOP
Phase 1  → STOP
Phase 2  → STOP
Phase 3  → STOP
Phase 4  → STOP
Phase 5  → STOP
Phase 6  → STOP
Phase 7  → STOP
Phase 8  → STOP
Phase 9  → STOP
Phase 10 → STOP
Phase 11 → STOP
Phase 12 → STOP
Phase 13 → STOP
Phase 14 → STOP
Phase 15 → STOP
Phase 16 → STOP
Phase 17 → STOP
Phase 18 → STOP
Phase 19 → STOP
Phase 20 → STOP
Phase 21 → STOP
Phase 22 → STOP
Phase 23 → STOP
Phase 24 → STOP
Phase 25 → STOP
Phase 26 → STOP
Phase 27 → STOP
Phase 28 → STOP
Phase 29 → STOP
Phase 30 → STOP
Phase 31 → STOP
Phase 32 → STOP
Phase 33 → STOP
Phase 34 → STOP
Phase 35 → STOP
Phase 36 → STOP
Phase 37 → STOP
Phase 38 → FINAL REPORT
```

Do not combine phases.

Do not skip verification.

Do not call the project production-ready without evidence.

The final result must be a repository that another developer can clone, understand, test, deploy, troubleshoot, and maintain without needing undocumented knowledge.
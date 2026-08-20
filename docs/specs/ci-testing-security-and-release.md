# SumitOS — Production CI/CD, Automated Testing, Security Gates & Release Engineering

You are working on the existing **SumitOS portfolio repository**.

This task is to turn the repository from a working project into a **production-grade, continuously tested, release-ready GitHub repository**.

This is NOT a feature redesign.

Do not change the SumitOS public visual design unless required to fix a verified regression.

Do not rewrite the Cloudflare architecture.

Do not replace Vercel, Cloudflare Worker, D1, R2, the current admin authentication, ContentProvider/FALLBACK architecture, or dynamic project system.

The goal is:

```text
Developer change
      ↓
Local checks
      ↓
Git commit
      ↓
GitHub
      ↓
Pull Request / push
      ↓
Automated CI
      ↓
Tests + build + type checks + security checks
      ↓
Release validation
      ↓
Production-ready commit/tag/release
```

The repository should make it difficult to accidentally ship broken or insecure code.

---

# EXECUTION RULE

This task MUST be implemented in checkpoints.

Do NOT perform the entire implementation in one pass.

For every phase:

```text
inspect
→ implement
→ run relevant checks
→ verify
→ report
→ STOP
```

Do not begin the next phase until the current phase has been verified.

---

# PHASE 0 — REPOSITORY AUDIT BEFORE CHANGES

Before editing anything, inspect:

```text
AGENTS.md
README.md
package.json
package-lock.json
next.config.ts
wrangler.jsonc

.github/
.github/workflows/
.github/dependabot.yml
.github/CODEOWNERS
.github/PULL_REQUEST_TEMPLATE.md
.github/ISSUE_TEMPLATE/

app/
src/
worker/
migrations/
scripts/
legacy/
```

Also inspect:

```text
git status
git log --oneline -20
git branch
git remote -v
```

Determine:

```text
Current branch
Default branch
Existing CI
Existing GitHub Actions
Existing release workflow
Existing security workflow
Existing tests
Existing lint/type checks
Existing deployment checks
Existing release files
Existing documentation
Existing repository protections
```

Do NOT modify anything in this phase.

Produce a gap analysis:

```text
Already exists:
Missing:
Duplicated:
Broken:
Outdated:
Recommended:
```

STOP.

---

# PHASE 1 — DEFINE THE QUALITY GATES

Establish the exact checks that must pass before a change can be considered mergeable.

Current repository commands include:

```bash
npm run build
npm test
npm run lint
npm run worker:check
```

Use the real current scripts found in `package.json`, not assumed command names.

Determine whether these additionally exist:

```text
typecheck
format
format:check
e2e
security
test:coverage
```

Do not add duplicate scripts if equivalent checks already exist.

Create one canonical CI command where practical, such as:

```text
npm run ci
```

but only if this improves maintainability.

The quality gate should verify at minimum:

```text
[ ] install dependencies
[ ] unit tests
[ ] lint
[ ] TypeScript/type validation
[ ] Worker type validation
[ ] production build
[ ] security-related tests
```

STOP.

---

# PHASE 2 — TEST STRATEGY

Create a formal automated test strategy based on the actual application.

The project has several independent risk areas:

```text
Next.js public frontend
ContentProvider/FALLBACK
dynamic project IDs
desktop behavior
Cloudflare Worker
D1 mapping
R2 file handling
admin authentication
admin authorization
CMS CRUD
publishing
cache behavior
OG generation
```

Divide testing into:

```text
Unit
Integration
API/security
Build
Browser/end-to-end
Regression
```

Do not make every test an end-to-end browser test.

Use the cheapest reliable test layer.

Example:

```text
Pure mapper
   → unit test

Validation
   → unit test

Auth/session
   → integration/API test

CMS CRUD
   → integration/API test

Public project workflow
   → targeted browser test

Complete desktop interaction
   → browser smoke suite
```

STOP.

---

# PHASE 3 — BUILD THE TEST MATRIX

Create a test matrix covering the actual application.

## Public portfolio tests

```text
[ ] homepage renders
[ ] fallback content renders
[ ] public API failure falls back correctly
[ ] projects render
[ ] projects open
[ ] project deep links work
[ ] generated CMS projects work
[ ] Finder project entries work
[ ] Launchpad project entries work
[ ] Spotlight finds CMS projects
[ ] Shell aliases work
[ ] Ask Sumit project lookup works
[ ] project deletion removes runtime references
[ ] unpublished projects remain private
```

## Desktop tests

```text
[ ] boot
[ ] dock
[ ] drag
[ ] resize
[ ] snap
[ ] Mission Control
[ ] Spaces
[ ] Launchpad
[ ] Spotlight
[ ] right-click menus
[ ] mobile shell
```

## CMS tests

```text
[ ] login
[ ] logout
[ ] expired session
[ ] fake session
[ ] create
[ ] edit
[ ] reorder
[ ] publish
[ ] unpublish
[ ] delete
[ ] duplicate
[ ] upload
[ ] replace file
[ ] delete unused file
[ ] reject referenced asset deletion
```

## Security tests

```text
[ ] anonymous admin mutation rejected
[ ] fake cookie rejected
[ ] expired session rejected
[ ] invalid origin rejected
[ ] malformed input rejected
[ ] dangerous URL rejected
[ ] dangerous file rejected
[ ] oversized upload rejected
[ ] public API does not expose private data
[ ] secrets do not enter client bundle
```

STOP.

---

# PHASE 4 — TEST EDGE CASES THAT NORMAL TESTS MISS

Add regression tests for:

```text
empty projects
one project
many projects
empty stack
empty links
empty certificates
missing cover
missing resume
missing asset
deleted project
unpublished project
duplicate slug
very long title
very long tagline
unicode text
emoji
malformed JSON content
missing optional fields
unexpected API response
Worker unavailable
API 500
API timeout
```

Also test:

```text
publish
→ immediately edit
→ immediately unpublish
→ immediately republish
```

for state consistency.

STOP.

---

# PHASE 5 — AUTHENTICATION SECURITY TEST SUITE

Create a dedicated automated security test suite for the current auth model.

The current system uses:

```text
PBKDF2 password hash
opaque random session ID
D1 sessions
HttpOnly
Secure
SameSite
session expiration
logout revocation
```

Test:

```text
correct password
wrong password
empty password
malformed body
fake cookie
random cookie
expired cookie
deleted session
logout
logout twice
session reuse
multiple login sessions
```

Test that the server never returns:

```text
password
password hash
session ID
session internals
```

STOP.

---

# PHASE 6 — AUTHORIZATION TEST SUITE

For EVERY protected endpoint test:

```text
without cookie
fake cookie
expired cookie
malformed cookie
```

Verify rejection.

Test at API level:

```text
POST
PATCH
PUT
DELETE
upload
delete asset
reorder
publish
unpublish
site update
OS content update
```

Do not rely on admin UI visibility.

The server must enforce authorization.

STOP.

---

# PHASE 7 — SECURITY INPUT TESTS

Create reusable security fixtures for:

```text
XSS
SQL injection-like strings
javascript:
data:
file:
localhost
private IP
path traversal
oversized input
invalid MIME
fake MIME
wrong magic bytes
```

Test these against every relevant input boundary.

Do not scatter the same test cases across dozens of files.

Create reusable security-test helpers.

STOP.

---

# PHASE 8 — GITHUB ACTIONS ARCHITECTURE

Inspect existing `.github/workflows` first.

If no suitable workflow exists, create a clean CI architecture.

Prefer separate workflows with clear responsibilities rather than one giant YAML file.

Suggested structure:

```text
.github/
  workflows/
    ci.yml
    security.yml
    dependency-review.yml
    release.yml
```

Do not duplicate checks unnecessarily.

---

# PHASE 9 — CI WORKFLOW

Create or improve:

```text
.github/workflows/ci.yml
```

Trigger on:

```text
pull_request
push to default branch
```

Use a supported Node version consistent with the project.

Use deterministic dependency installation.

Prefer:

```text
npm ci
```

when the lockfile is authoritative.

Run:

```text
npm test
npm run lint
npm run build
npm run worker:check
```

or their actual equivalents discovered in Phase 1.

The workflow must fail if any required quality gate fails.

Do not allow a green workflow when a required test silently doesn't run.

---

# PHASE 10 — TEST ARTIFACTS

Make CI preserve useful failure evidence.

For failed browser/e2e tests, where applicable, retain:

```text
screenshots
videos
HTML reports
test logs
```

For regular tests:

```text
coverage
test output
build logs
```

Do not upload secrets or `.env` files as artifacts.

Do not upload the entire workspace.

STOP.

---

# PHASE 11 — CODEQL

Add GitHub code scanning using CodeQL for:

```text
JavaScript/TypeScript
GitHub Actions workflows
```

GitHub CodeQL supports JavaScript/TypeScript and GitHub Actions workflow analysis, and built-in queries include classes such as client-side XSS, unsafe redirects, clear-text sensitive information, and other security issues.

Use an appropriate query suite.

Do not blindly select the most aggressive settings without checking CI cost and false-positive behavior.

The workflow should produce GitHub code-scanning results.

STOP.

---

# PHASE 12 — DEPENDENCY REVIEW

Add GitHub Dependency Review for pull requests.

The current GitHub Dependency Review action can compare dependency changes in pull requests and fail a PR based on vulnerability severity.

Configure it so that:

```text
new known-high/critical dependency vulnerabilities
```

cause the PR check to fail.

Do not block every moderate/low finding unless the repository actually needs that policy.

Do not allow dependency-review to replace normal dependency auditing.

STOP.

---

# PHASE 13 — SECRET SCANNING / REPOSITORY SECURITY

Determine which GitHub secret-scanning features are available for this repository.

Do NOT store credentials inside workflows.

Check:

```text
ADMIN_PASSWORD_HASH
Cloudflare tokens
Vercel tokens
API keys
private keys
database credentials
session secrets
.dev.vars
.env files
```

Ensure workflow logs cannot print secrets.

Use GitHub's repository security features where available.

Also add a local repository secret scan if there isn't already one.

The test must scan:

```text
current files
git-tracked files
generated files
workflow files
```

Exclude only safe false-positive sources deliberately.

STOP.

---

# PHASE 14 — GITHUB ACTIONS SECURITY

Audit the workflows themselves.

Check:

```text
permissions:
third-party actions
pinned action versions
untrusted PR code
fork behavior
secrets access
workflow triggers
script injection
branch restrictions
```

Use minimal GitHub token permissions.

Do not give:

```text
contents: write
```

unless the specific job truly needs it.

Be careful with shell interpolation of:

```text
PR titles
commit messages
branch names
issue titles
user-controlled values
```

Never execute untrusted text as shell code.

STOP.

---

# PHASE 15 — RELEASE FILES

Create or improve production repository documentation.

At minimum investigate whether these are needed:

```text
CHANGELOG.md
SECURITY.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
LICENSE
RELEASE.md
```

Do not create files blindly.

Determine which are appropriate for this repository.

For this portfolio repository, strongly consider:

```text
README.md
CHANGELOG.md
SECURITY.md
CONTRIBUTING.md
LICENSE
```

`RELEASE.md` can document the release procedure if that is useful.

STOP.

---

# PHASE 16 — PRODUCTION-QUALITY README

Audit README.md.

It should clearly explain:

```text
What SumitOS is
Architecture
Tech stack
Local development
Testing
Cloudflare setup
Environment variables
Admin deployment
Database migrations
R2
Vercel deployment
GitHub Actions
Security
Release process
Rollback
```

Do not expose secrets.

Use placeholders.

Make sure commands match the actual repository scripts.

STOP.

---

# PHASE 17 — SECURITY.md

Create a responsible security policy.

Include:

```text
supported versions
how to report a vulnerability
what information to include
what not to include
expected response process
```

Do not put private contact information in the file unless intentionally provided.

Do not claim a formal bug bounty program exists unless it actually does.

STOP.

---

# PHASE 18 — CONTRIBUTING.md

Create a lightweight contribution guide.

Include:

```text
branching
local setup
tests
lint
build
Worker checks
PR expectations
security-sensitive changes
commit expectations
```

Do not write a huge enterprise process.

This is a personal portfolio repository.

Keep it practical.

STOP.

---

# PHASE 19 — CHANGELOG

Create:

```text
CHANGELOG.md
```

Use a consistent release format.

Document:

```text
Added
Changed
Fixed
Security
Breaking Changes
```

Do not invent historical changes.

Populate only from actual project history/current state.

STOP.

---

# PHASE 20 — VERSIONING STRATEGY

Choose one release strategy:

### Option A — SemVer releases

Example:

```text
v1.0.0
v1.1.0
v1.1.1
```

Recommended if this repository will have explicit releases.

### Option B — milestone releases

Example:

```text
2026.08.17
2026.09
```

Choose one.

Do not mix strategies.

For a portfolio application, SemVer is reasonable if you actually intend to tag meaningful releases.

Do not increment versions for every tiny content update.

STOP.

---

# PHASE 21 — RELEASE MANIFEST

Create a machine-readable release manifest if helpful.

For example:

```text
release.json
```

Containing only non-secret information such as:

```text
version
commit
build time
schema version
application version
```

Do not include:

```text
passwords
tokens
database URLs
private configuration
```

If adding this creates more complexity than value, do not add it.

Document the decision.

STOP.

---

# PHASE 22 — PRODUCTION RELEASE CHECKLIST

Create a release checklist file such as:

```text
docs/release-checklist.md
```

It should include:

```text
[ ] working tree clean
[ ] branch up to date
[ ] tests pass
[ ] build passes
[ ] worker check passes
[ ] security checks pass
[ ] dependency checks pass
[ ] CodeQL clean/triaged
[ ] no secrets detected
[ ] migrations reviewed
[ ] production env verified
[ ] Vercel build verified
[ ] Worker deployment verified
[ ] D1 migration verified
[ ] R2 availability verified
[ ] public smoke test
[ ] admin smoke test
[ ] rollback path verified
[ ] changelog updated
[ ] version/tag created
```

STOP.

---

# PHASE 23 — DATABASE / MIGRATION SAFETY

Review D1 migration strategy.

Verify:

```text
migration files are immutable once applied
new schema changes use new migration numbers
seed generation does not overwrite production data unexpectedly
local migrations cannot accidentally target production
```

Create automated checks for migration ordering.

If feasible, CI should:

```text
create temporary/local D1
apply migrations
run schema/content tests
```

Never let CI automatically modify your production database.

STOP.

---

# PHASE 24 — TEST THE RELEASE BUILD LOCALLY

Create a release verification process:

```text
clean checkout
npm ci
npm run build
npm test
npm run lint
npm run worker:check
```

Then verify that the result is runnable from a clean environment.

Do not rely on artifacts from the developer's machine.

STOP.

---

# PHASE 25 — PRODUCTION SMOKE TESTS

Create a small production smoke-test script that is safe to run against the deployed application.

Public checks:

```text
homepage 200
known project route 200
OG route/image works
public API GET works
resume path works
```

Admin checks must NOT automate password login using a committed credential.

Instead support a manually supplied CI secret or keep admin login verification local/manual.

Never commit a production password.

STOP.

---

# PHASE 26 — RELEASE WORKFLOW

Create:

```text
.github/workflows/release.yml
```

Only if the current project actually needs automated release creation.

Possible flow:

```text
tag pushed
  ↓
validate commit
  ↓
run full CI
  ↓
generate release notes/changelog
  ↓
create GitHub Release
```

Do not automatically deploy production from arbitrary branches.

Do not make a release workflow overwrite production secrets.

Do not publish a release if required security checks fail.

STOP.

---

# PHASE 27 — RELEASE NOTES GENERATION

Determine whether release notes should be:

```text
automatic
or
manually curated
```

Preferred:

```text
automatic draft
+
manual final review
```

Do not let automated text invent functionality that wasn't shipped.

Release notes should come from:

```text
git history
PR titles
CHANGELOG
```

and then be reviewed.

STOP.

---

# PHASE 28 — BRANCH AND PR PROTECTION

Determine what repository settings should be recommended.

Recommend:

```text
main branch protected
CI required before merge
linear history if appropriate
force-push restrictions
required pull request review if applicable
```

Do not pretend Claude Code can necessarily configure all GitHub repository settings from the repository itself.

Document the GitHub UI settings I need to configure manually.

STOP.

---

# PHASE 29 — RELEASE / ROLLBACK STRATEGY

Document:

```text
application rollback
Worker rollback
database rollback limitations
```

Important:

Worker deployments are versioned, but D1 schema changes are not automatically reversible.

Document the correct strategy:

```text
bad Worker deployment
→ rollback Worker version

bad schema migration
→ forward migration/fix
```

Do not invent destructive database rollback commands.

STOP.

---

# PHASE 30 — CONTENT VS CODE RELEASES

This project has two different kinds of changes:

### Code release

```text
React code
Worker code
admin UI
schema
dependencies
```

Requires:

```text
tests
CI
release process
```

### CMS content update

```text
project
certificate
resume
experience
skills
profile
OS content
```

Should NOT require a GitHub release.

Document this distinction clearly.

STOP.

---

# PHASE 31 — PERFORMANCE REGRESSION GATE

Add at least lightweight checks for:

```text
bundle size
public JS growth
build time
API payload size
```

Do not establish unrealistic hard limits without measuring the current baseline.

First measure:

```text
current baseline
```

Then define reasonable thresholds.

If exceeded, warn or fail according to severity.

STOP.

---

# PHASE 32 — ACCESSIBILITY REGRESSION CHECK

Add automated accessibility checks only where they fit the current stack.

At minimum inspect:

```text
keyboard navigation
focus visibility
buttons with labels
forms
admin dialogs
images
links
```

Do not introduce a massive accessibility framework for a single desktop portfolio.

Use lightweight automated checks where appropriate plus manual verification.

STOP.

---

# PHASE 33 — RELEASE ARTIFACTS

Determine which artifacts should be committed and which should never be committed.

Should be committed:

```text
.github/workflows/
.github/CODEOWNERS if used
.github/PULL_REQUEST_TEMPLATE.md if used
CHANGELOG.md
SECURITY.md
CONTRIBUTING.md
release docs
test utilities
scripts
configuration
```

Should NOT be committed:

```text
.env
.dev.vars
Cloudflare secret values
production credentials
private session keys
generated production data
```

STOP.

---

# PHASE 34 — FINAL REPOSITORY HYGIENE AUDIT

Run:

```text
git status
git diff
git ls-files
```

Check for:

```text
secrets
large binaries
generated files that shouldn't be tracked
temporary files
debug logs
local configs
```

Check `.gitignore`.

Ensure the repository does not accidentally include:

```text
.wrangler
.dev.vars
.env*.local
worker local state
node_modules
test artifacts
Playwright recordings
screenshots
coverage if not intended
```

STOP.

---

# PHASE 35 — PRODUCTION RELEASE CANDIDATE

Create a release candidate process.

Example:

```text
feature branch
    ↓
PR
    ↓
CI
    ↓
security checks
    ↓
merge to main
    ↓
release candidate tag
    ↓
full validation
    ↓
GitHub Release
```

Do not create the actual production release yet unless explicitly instructed.

STOP.

---

# PHASE 36 — FINAL FULL TEST RUN

Run every relevant command from a clean state:

```bash
npm ci
npm test
npm run lint
npm run build
npm run worker:check
```

Run all security tests.

Run all browser/smoke tests available.

Run migration tests.

Run repository security scans.

Record exact outputs.

Do not merely say:

```text
passed
```

Show the important counts and results.

STOP.

---

# PHASE 37 — FINAL PRODUCTION AUDIT

Before completion, verify:

```text
[ ] tests pass
[ ] build passes
[ ] lint passes
[ ] worker checks pass
[ ] security tests pass
[ ] dependency review configured
[ ] CodeQL configured
[ ] secrets protected
[ ] workflows least-privileged
[ ] release docs exist
[ ] changelog exists
[ ] security policy exists
[ ] contribution guide exists if appropriate
[ ] release procedure documented
[ ] rollback procedure documented
[ ] migration strategy documented
[ ] repository clean
[ ] no accidental secrets
[ ] no untracked critical files
```

STOP.

---

# PHASE 38 — CREATE THE PRODUCTION RELEASE FILES

Prepare a release-ready set of files.

At minimum determine whether the final repository should contain:

```text
.github/
  workflows/
    ci.yml
    security.yml
    dependency-review.yml
    release.yml

CHANGELOG.md
SECURITY.md
CONTRIBUTING.md
LICENSE
docs/
  release-checklist.md
  release-process.md
```

Only create files that are actually appropriate.

Do not duplicate information unnecessarily between:

```text
README.md
CONTRIBUTING.md
RELEASE.md
docs/release-process.md
```

Choose clear ownership for each document.

STOP.

---

# PHASE 39 — COMMIT PLAN

Do not create one giant meaningless commit.

Recommend a clean commit sequence.

For example:

```text
1. test: expand regression and security coverage
2. ci: add GitHub Actions quality gates
3. security: add CodeQL and dependency review
4. docs: add production release and security guidance
5. release: prepare versioned release metadata
```

Use the actual content to determine the correct scope.

Avoid commits like:

```text
update stuff
fix things
final changes
```

STOP.

---

# PHASE 40 — COMMIT VERIFICATION

Before committing:

```text
git status
git diff --check
npm test
npm run lint
npm run build
npm run worker:check
```

Then inspect the final diff.

Ensure:

```text
no secrets
no temporary files
no debug code
no accidental generated data
no unrelated refactoring
```

STOP.

---

# PHASE 41 — COMMIT

Only after the previous phase passes:

Create intentional commits according to the commit plan.

Do not modify unrelated code.

After committing:

```bash
git status
git log --oneline -10
```

Verify the working tree state.

STOP.

---

# PHASE 42 — FINAL RELEASE REPORT

Produce a professional release report.

## 1. Repository audit

What existed before.

## 2. Test coverage

List:

```text
unit
integration
API
security
browser
build
migration
```

## 3. GitHub Actions

List workflows and triggers.

## 4. Security

List:

```text
CodeQL
Dependency Review
secret scanning
auth tests
authorization tests
input validation
R2 tests
```

## 5. Documentation

List:

```text
README
SECURITY
CONTRIBUTING
CHANGELOG
release docs
```

## 6. Release strategy

Explain:

```text
versioning
tagging
release creation
production deployment
rollback
```

## 7. Commits

List exact commit hashes and messages.

## 8. Remaining issues

Separate:

```text
Critical
High
Medium
Low
Informational
Intentional limitations
```

## 9. Production readiness verdict

Choose exactly one:

```text
READY
READY WITH DOCUMENTED WARNINGS
NOT READY
```

Do not say READY if required checks are failing.

---

# IMPORTANT QUALITY RULES

## Do not create fake confidence

A green CI workflow does not prove the application is secure.

CodeQL does not replace manual security testing.

Dependency Review does not replace dependency maintenance.

Unit tests do not replace browser tests.

Browser tests do not replace API authorization tests.

Treat them as layers.

---

# GITHUB SECURITY INTEGRATION

Use GitHub-native security capabilities where available.

CodeQL supports JavaScript/TypeScript and GitHub Actions workflow analysis.

Dependency Review can inspect dependency changes in pull requests and enforce vulnerability thresholds.

Use the repository's available GitHub security features, but first inspect which features are actually enabled/available instead of assuming every Code Security feature is available.

---

# FINAL PRINCIPLE

The goal is not:

```text
"add GitHub Actions"
```

The goal is:

```text
A change should be difficult to merge
if it breaks the application,
violates the security model,
fails tests,
introduces a dangerous dependency,
or leaves the repository in an unreleasable state.
```

At the same time, do not over-engineer this into enterprise CI/CD.

This is a personal portfolio.

Use the smallest production-grade system that gives strong confidence.

---

# FINAL EXECUTION ORDER

Follow this exact sequence:

```text
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
Phase 38 → STOP
Phase 39 → STOP
Phase 40 → STOP
Phase 41 → STOP
Phase 42 → FINAL REPORT
```

Do not skip checkpoints.
Do not claim completion without evidence.
Do not commit secrets.
Do not create a production release unless every required quality gate is green.
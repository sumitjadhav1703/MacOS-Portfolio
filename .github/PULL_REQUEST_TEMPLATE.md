## What this changes

<!-- One or two sentences. What is different afterwards, and why. -->

## Checks

- [ ] `npm run ci` passes locally
- [ ] `npm run ai:test` — if `ai/` changed
- [ ] `npm run e2e` — if the desktop changed
- [ ] `npm run e2e:admin` — if the Worker or the admin changed
- [ ] Driven in a browser at 1440×900 and 390×844, console clean — if anything visual changed

## Anything security-sensitive?

<!-- Auth, sessions, uploads, validation, CORS, the public bundle, a new dependency.
     If none of these, say "no" and delete the rest. -->

- [ ] No new way to reach a mutation without a session
- [ ] No new value rendered into an `href` or `src` without going through `validate`
- [ ] No secret in the diff, and `npm run scan:secrets` is clean

## Migrations

- [ ] None — or: a new numbered file, with `migrations/.checksums` regenerated in this commit

<!-- Applied migrations are immutable. If an old one is wrong, correct it with a new one. -->

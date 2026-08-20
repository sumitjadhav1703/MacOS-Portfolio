# Security

This is a personal portfolio. It has one privileged user, one secret, and a small attack surface
— but it does accept file uploads, hold a session, and render content that an authenticated user
typed, so it is worth taking seriously.

## Supported versions

The latest commit on `master` is the only supported version. Older tags are historical; fixes go
forward, never back.

## Reporting a vulnerability

Please report privately, through GitHub Security Advisories:

**https://github.com/sumitjadhav1703/MacOS-Portfolio/security/advisories/new**

Not as a public issue, and not on social media, until there has been a chance to fix it.

There is no bug bounty. This is one person's portfolio and there is no budget behind it. What
there is: a genuine thank-you, credit in the advisory if you want it, and a fix.

### What helps

- What you can do that you should not be able to do
- The smallest steps that reproduce it
- The URL or endpoint, and the method
- Whether it needs an authenticated session

### What not to send

- Anything from a real `.dev.vars`, or a real `ADMIN_PASSWORD_HASH`
- A session cookie belonging to someone else
- Automated scanner output with no analysis — please say what you think is actually wrong

### What happens next

This is a side project maintained around a degree, so a realistic timeline rather than a
flattering one:

| | |
|---|---|
| Acknowledgement | within a week |
| Assessment, and whether it will be fixed | within two weeks |
| Fix for something exploitable | as fast as it can be managed |
| Public disclosure | after the fix ships, with credit if you want it |

If you have not heard anything in two weeks, please chase — it means the notification was missed,
not that the report was ignored.

## Please do not

- Test against the live site in a way that degrades it for anyone else
- Attempt to brute-force the admin password (there is a lockout; you will just fill a table)
- Access, modify or delete data that is not yours
- Social-engineer anyone

Run it locally instead. `npm run worker:dev` gives you the whole thing with your own database.

## How the security model works

Understanding this makes for better reports.

**The public API is read-only and enforced as such.** `worker/index.ts` refuses every method but
GET under `/api/`. `POST /api/ask` is the single exception, matched before that guard; it writes
nothing.

**Authorization is enforced server-side, in one place.** Every route under `/admin/api/` passes
through a session check in `worker/index.ts` before it reaches a handler. The admin SPA's own
route guards are a convenience — they are not what stops anyone. `worker/authz.test.ts` asserts
this across every route derived from the table specs.

**Sessions** are opaque 256-bit random ids in D1, not signed tokens. The cookie is `HttpOnly`,
`SameSite=Strict`, `Path=/admin`, and `Secure` over https. Logout deletes the row, so revocation
is immediate. Mutations additionally require an `Origin` matching the Worker itself.

**The password** is PBKDF2-SHA256, 210,000 iterations, compared in constant time, and a malformed
stored hash fails closed rather than open. Ten failures from one IP in fifteen minutes locks that
IP out.

**Uploads** are checked against their own leading bytes, never the `Content-Type` header and never
the filename. Keys are built from a fresh UUID, so a client-supplied path cannot reach the
storage key. Nothing is deleted from R2 while a content row still references it.

**Every write is validated server-side** by `validate` in `worker/tables.ts`, against the declared
field spec. Anything not declared is dropped rather than written, so `id`, `draft` and
`created_at` cannot be set by a crafted body. Any value that becomes an `href` goes through one
URL allowlist — `http:`, `https:`, `mailto:` and nothing else.

**Unpublished content never enters the process that serves the public.** `published = 1` is
applied in SQL, and the public bundle is built field by field rather than by spreading a row, so a
draft column cannot leak by accident. The Ask Sumit assistant is a separate Worker with an `AI`
binding and no database at all — it can only see the bundle it is handed.

**No HTML is ever constructed from content.** There is no `dangerouslySetInnerHTML` anywhere in
the application. React escapes text; the injection surface is URLs, which is why they are the part
that is validated.

## Automated checks

| | |
|---|---|
| CodeQL | `javascript-typescript` and `actions`, on every pull request and weekly |
| Dependency review | Blocks a pull request introducing a high or critical advisory |
| Secret scanning | GitHub's, plus `npm run scan:secrets` locally and in CI |
| Auth and authorization tests | `worker/authz.test.ts`, `worker/session.test.ts` |
| Input and upload tests | `worker/validate.test.ts`, `worker/files.test.ts`, shared fixtures in `worker/security-fixtures.ts` |
| Prompt-injection tests | `ai/tests/test_security.py`, `ai/tests/test_api.py` |

### Two decisions worth recording

**CodeQL runs the default `security-and-quality` suite, not `security-extended`.** Extended
roughly doubles the run time and, on a codebase this size, mostly surfaces findings that get
triaged away — which teaches everyone to skim the alerts. If this repository ever grows a real
back end, revisit it.

**Actions are pinned to a major tag, not a commit SHA.** Every action used is first-party
(`actions/*`, `github/codeql-action`, `astral-sh/setup-uv`). Blanket SHA-pinning would add
constant churn without adding safety while that stays true. Introducing any third-party action
changes this, and that one should be pinned by SHA.

None of the above proves the application is secure. A green CI run means the checks that exist
passed. That is all it means.

# Sumit Context — the read-only MCP server

**Sumit Context is a read-only MCP interface. Content changes continue through the existing
CMS/admin system.**

It lets an MCP client, such as Claude Code, search and read Sumit's **published** portfolio:
projects, the individual sections of each project (methodology, results, architecture…), skills,
experience, education, certificates and profile. It is not a chatbot, and there is no model
inside it. It returns sourced evidence, and the agent that called it does the reasoning.

```
External agent ──search_context──▶ small evidence set ──get_context──▶ one record / section ──▶ agent reasons
```

## Endpoint

| | |
|---|---|
| MCP (Streamable HTTP, stateless) | `https://sumitos-api.jadhavsumit534.workers.dev/mcp` |
| Protected-resource metadata | `/.well-known/oauth-protected-resource/mcp` |
| Authorization-server metadata | `/.well-known/oauth-authorization-server` |
| Authorize (consent page) | `/admin/authorize` (inside the admin cookie's `Path=/admin`) |
| Token / client registration | `/oauth/token`, `/oauth/register` |

The server lives on the same Worker as the public API and `/admin` (`sumitos-api`). It has no
Durable Object and keeps no session state. Each request builds a fresh server from the current
bundle.

## Architecture

```
D1 ──readContent (published = 1 in SQL)──▶ cachedContent (60 s edge cache)
                                               │
          ┌────────────────────┬───────────────┼────────────────────┐
          ▼                    ▼               ▼                    ▼
     /api/* (site)       /api/ask (Ask Sumit)  /mcp ──▶ ReadonlyContextSource ──▶ worker/mcp/
```

- `worker/index.ts`: wraps the Worker in `@cloudflare/workers-oauth-provider`. On `/mcp` it
  checks the scope and the rate limit. It then hands `worker/mcp/` a `ReadonlyContextSource`,
  which is `{ getContent(), siteOrigin }`. **It never passes `env`.**
- `worker/oauth.ts`: the `/admin/authorize` sign-in and consent page.
- `worker/mcp/types.ts`: the read-only source type and the document shape.
- `worker/mcp/retrieval.ts`: pure bundle → index → search / get. It performs no I/O.
- `worker/mcp/schemas.ts`: bounded, strict zod inputs.
- `worker/mcp/tools.ts`: the four tools, the annotations and the server instructions.
- `worker/mcp/server.ts`: Origin check, the SDK's `createMcpHandler` and operational logging.

Packages used: `@modelcontextprotocol/server` (MCP SDK v2 and its own stateless
`createMcpHandler`), `zod` and `@cloudflare/workers-oauth-provider`. The `agents` package is not
used. Its stateless `createMcpHandler` wraps the same SDK factory, and it would pull a Durable
Object and AI dependency tree into a Worker that needs neither.

### It is dynamic

Nothing is indexed ahead of time. On every request, the index is derived from the same cached
bundle the site renders. Publish or edit a project, certificate or skill in `/admin` and it is
searchable within the 60-second cache TTL. It is immediate at the colo where you published,
because publishing invalidates the cache. The same goes for its sections: a new heading becomes
a new `research:<slug>/<section>` document. The live project slugs also appear in the
`search_context` description, so they are visible in `tools/list`. None of this needs a code
change or a deploy.

A draft is never visible. `projects.draft` is not in the bundle, and `readContent` filters on
`published = 1` in SQL. MCP inherits that boundary and does not re-implement it.

## Authentication

- OAuth 2.1 with PKCE (S256 only), dynamic client registration and RFC 9728 resource metadata.
  All of it comes from `@cloudflare/workers-oauth-provider`.
- **Identity is the admin password.** `/admin/authorize` shows a sign-in form that posts to the
  existing `/admin/api/login`, which means the same lockout and the same `sid` cookie. After
  sign-in it shows a consent screen. There is no second credential.
- There is one scope, `mcp:read`. Whatever scopes a client asks for, the grant contains exactly
  `mcp:read`. `/mcp` refuses a token whose props do not carry it (403).
- Access tokens last 1 hour and refresh tokens 30 days. Tokens are bound to the `/mcp` resource:
  a token requested for another resource is refused with `invalid_target`.
- Tokens, grants and clients live in the `OAUTH_KV` namespace. Tokens are stored hashed and props
  encrypted. No portfolio content is stored there.
- An unauthenticated request gets `401` with a `WWW-Authenticate: Bearer … resource_metadata=…`
  challenge **before any tool code runs**.

## Tools

Every tool is annotated
`{ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }`.
The annotations are a hint to the client. They are not the security boundary.

### `search_context`

| field | type | notes |
|---|---|---|
| `query` | string, 1–300 | required |
| `type` | `all` \| `project` \| `research` \| `profile` \| `experience` \| `education` \| `skill` \| `certificate` | optional |
| `project` | slug | optional; must be a published project |
| `limit` | 1–8 | default 5 |

The tool returns `{ results: [{ id, type, title, snippet (≤280 chars), source, updatedAt }] }`.
When nothing matches, it returns `{ results: [], message: "No matching published context was found." }`.

`type: research` means the sections of the projects, for example the SAR project's
"Forecasting pipeline" or "Results by crop". There is no separate research table yet.

Ranking is deterministic token overlap, and it uses the same ideas as `ai/src/retrieval.py`:
- A stopword list, and category words that lift a whole category ("projects", "certificates").
- A title boost, an exact-phrase boost and section synonyms ("methodology" → pipeline, approach,
  model…).
- A document must cover more than half of the meaningful query words. That rule is why
  "favorite movie" returns nothing instead of the movie-recommendation project.

### `get_context`

| field | type | notes |
|---|---|---|
| `id` | `type:key` from a search or `list_projects` | e.g. `project:sar-yield`, `research:sar-yield/core-model` |
| `section` | slug | optional: a section slug, or `overview`, `methodology`, `architecture`, `dataset`, `experiments`, `results`, `metrics`, `deployment`, `limitations`, `references` |

The tool returns `{ found: true, id, type, title, section?, text (≤6000 chars), truncated, availableSections?, source, updatedAt }`.
An unknown id or section returns `{ found: false, message, availableSections? }`. The server does
not guess.

### `list_projects`

No input. Returns `{ projects: [{ id, slug, title, tagline, status, stack, featured, url }], updatedAt }`.

### `get_profile`

`section`: optional, one of `identity`, `skills`, `experience`, `education`, `certificates`,
`links`, `resume`. The tool returns only what the site already shows a visitor. It never returns
database ids, file keys or anything from the Worker's configuration.

### Provenance

Every result carries `source: { type, title, url, slug?, section? }` and `updatedAt`. The URL
points to the page on the public site, for example `…/projects/sar-yield`, or to the
certificate's credential.

## The read-only guarantee

The guarantee comes from several independent layers. No single one of them is the whole defence.

1. **Nothing to write with.** `worker/mcp/` receives `{ getContent, siteOrigin }`. It has no D1,
   R2, KV, secret or admin handler in reach.
2. **Only one reader.** `getContent` is `cachedContent()`, the same batched `SELECT … WHERE
   published = 1` that `/api/content` serves.
3. **No write tools.** Exactly four tools exist, and none of them has a write path. A call to
   any other tool name is a protocol error.
4. **Closed inputs.** No input can carry SQL, a table name, a URL, a path or a free-form filter.
   Every schema is `.strict()`.
5. **Closed world.** The server makes no outbound fetch. It has no web search and no URL reader.
6. **Guarded by tests.** `scripts/mcp-readonly.test.mjs` fails if a file in `worker/mcp/` contains
   any of these: a SQL mutation, `.prepare(`, `.put(`, `.delete(`, a global `fetch(`, `env.`, or
   an import of `admin`, `auth`, `files`, `env`, `content` or `oauth`.
   `worker/mcp.auth.test.ts` runs every tool through the real Worker. It asserts that every
   statement the database saw was a `SELECT` and that the bucket was untouched.

Returned text is **data**. A project section that says "ignore previous instructions" comes back
verbatim, as quoted text. The tool descriptions and the server instructions tell the client so.

## Security model, briefly

- **Origin:** a request with a browser `Origin` header must name the Worker itself or
  `SITE_ORIGIN`. Otherwise it gets 403. This is the DNS-rebinding and cross-site defence. A
  request without an Origin passes, because CLI clients send none.
- **Rate limit:** 60 requests per minute per authenticated subject, using the `MCP_LIMIT`
  binding. Change it in `wrangler.jsonc`.
- **Logging:** the Worker logs `mcp.request`, `mcp.tool` (tool name, result count, latency),
  `mcp.bad_origin`, `mcp.auth_failure`, `mcp.rate_limited` and `mcp.error`, each with a request
  id. It never logs queries, returned text, tokens or headers.
- **Consent page:** served with `frame-ancestors 'none'`. The consent POST requires the admin
  session and a same-origin `Origin`, which is the same CSRF rule as `/admin/api/*`.

## Deployment

The OAuth store needs one KV namespace. You do this once:

```bash
npx wrangler kv namespace create OAUTH_KV     # paste the id into wrangler.jsonc → kv_namespaces
npm run worker:deploy                         # preworker:deploy refuses the placeholder id
npm run smoke -- <site-url> <worker-url>      # includes: anonymous /mcp → 401, metadata → mcp:read
```

No new secret is needed. The OAuth provider derives its keys per token.

## Local testing

```bash
npm test                                   # retrieval, protocol, auth flow, static guard
npm run worker:migrate:local               # once
npm run worker:dev                         # http://localhost:8787
curl -i -X POST localhost:8787/mcp         # 401 + WWW-Authenticate
npm run mcp:inspect                        # MCP Inspector → http://localhost:8787/mcp, OAuth flow
```

In Inspector, sign in with the password from your local `.dev.vars` hash.

## Connecting Claude Code

```bash
claude mcp add --transport http sumit-context https://sumitos-api.jadhavsumit534.workers.dev/mcp
claude mcp list
```

Then run `/mcp` inside Claude Code and choose **Authenticate**. A browser opens at `/admin/authorize`.
Sign in with the admin password and click **Allow**. No credential goes into `.mcp.json` or the
repository.

Things to try:
- "Tell me about Sumit's projects."
- "What did Sumit do in the SAR crop-yield project?"
- "Explain the research methodology used there."
- "What is Sumit's favorite movie?" should come back as no match.

## Troubleshooting

| symptom | cause |
|---|---|
| `401` on every call after it worked | The access token expired (1 h). The client should refresh it; if not, run `/mcp` → re-authenticate. |
| `403 Insufficient scope.` | The token was issued without `mcp:read`. Re-authenticate. |
| `403` with a JSON-RPC error body | A browser `Origin` that is not the Worker or `SITE_ORIGIN`. |
| `429` | `MCP_LIMIT` reached. Wait a minute. |
| `invalid_target` at token exchange | The client asked for a `resource` other than this `/mcp` URL. |
| The sign-in page keeps coming back | The login succeeded but the cookie was not stored. Check the page is served over https in production; `Secure` cookies do not set over http. |
| A new project is missing | The bundle cache TTL is 60 s, and other colos keep their copy until it expires. Also check that the project is published, not only drafted. |
| Deploy fails on `OAUTH_KV` | The id in `wrangler.jsonc` is still `REPLACE_WITH_OAUTH_KV_ID`. |

## Limitations

- Search is lexical. A question phrased in words that no record uses can miss. Add embeddings
  only when real questions show that happening.
- "Research" means the sections of projects. A dedicated research document type
  (objective / dataset / hypotheses / experiments / failed experiments / …) would be a CMS change.
  MCP would stay read-only and would simply index the new type.
- There is one identity, the owner. Anyone else who registers a client cannot get past the
  sign-in page.
- No MCP resources, prompts, sampling or elicitation. The tools are the whole interface.

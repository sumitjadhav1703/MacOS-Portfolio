# Portfolio architecture

One canonical store, several read-only views of it.

```
/admin (Worker, session-guarded)  ──writes──▶  D1 (rows) + R2 (files)
                                                   │
                                  readContent(): published = 1, in SQL
                                                   │
                                  cachedContent(): one bundle, 60 s TTL, invalidated on publish
            ┌──────────────┬──────────────┬────────┴─────────┬────────────────────┐
       /api/content   Ask Sumit       Sumit Context (/mcp)   getContent() on Vercel
       (read-only)    (Python Worker,  (OAuth, read-only,     ├─ desktop (first paint)
                       no DB binding)   ReadonlyContextSource)├─ /projects/<slug> + OG image
                                                              └─ /recruiter
```

## Pieces

| Piece | Where | Notes |
|---|---|---|
| Desktop | `app/page.tsx`, `src/os/` | Next.js 16 on Vercel. Falls back to the compiled-in `FALLBACK` when the API is unreachable |
| Project pages | `app/projects/[slug]` | Prerendered from `FALLBACK`, rendered on demand for new slugs |
| Recruiter view | `app/recruiter/page.tsx` | Server component, no desktop JavaScript |
| Project Interview | `src/os/apps/Interview.tsx` | `next/dynamic`; not in the first bundle, and on mobile only loaded when started |
| Public API + admin | `worker/` | Cloudflare Worker, D1, R2. Only `/admin/api/*` mutates, behind the session |
| Ask Sumit | `ai/` | Python Worker reached by service binding; handed the bundle, never a database |
| Sumit Context | `worker/mcp/` | Read-only MCP server; see `docs/mcp.md` |

## Why it is shaped like this

- **One source of truth.** Every view is a slice of the same `cachedContent()` bundle, so a
  publish in `/admin` reaches the desktop, the recruiter view, the assistant and MCP within the
  cache window with no deploy — and a draft reaches none of them, because `published = 1` is in
  the SQL rather than in each consumer.
- **Read paths cannot write.** The assistant has no database binding; the MCP tools are handed a
  function that returns the bundle and nothing else (`scripts/mcp-readonly.test.mjs`).
- **Evidence is content.** Decisions, incidents, timelines and limitations are section kinds, not
  a second schema — `docs/engineering-evidence.md`.
- **First paint stays small.** New windows are loaded with `next/dynamic`; `check-bundle` fails
  the gate at +10 % over `perf-budget.json`.

## Security boundaries

Summarised from `SECURITY.md`: the public API is GET-only (plus the write-nothing `POST
/api/ask`); admin mutations need a session and a same-origin `Origin`; every stored URL passes one
allowlist, including the ones nested in evidence sections; MCP needs an OAuth token with scope
`mcp:read`, the only scope there is.

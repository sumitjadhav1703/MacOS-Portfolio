# `ai/` — the assistant behind Ask Sumit

A Cloudflare Python Worker. It receives a question and a published portfolio bundle, decides
which few records answer it, asks a model to write two or three sentences from those records
only, and returns the answer with its sources.

It is not publicly routed. `sumitos-api` reaches it over the `ASK_AI` service binding, having
already checked the origin and spent the visitor's rate-limit budget.

## The one design decision worth knowing

**This Worker has no D1 binding.** The portfolio arrives in the request body, from the same
cached bundle every public endpoint is a slice of. That is not a shortcut — it is the privacy
guarantee. `readContent` filters `published = 1` in SQL, so an unpublished project is not
hidden from the assistant by a rule someone has to remember to write; it is simply never in the
process that answers. There is no query here to get wrong.

The same property gives CMS refresh for free: publish in `/admin`, and within the 60-second
cache TTL the assistant is answering from the new content. No knowledge file, no re-embedding,
no redeploy.

## Layout

```
src/entry.py              the Worker boundary — decode, delegate, encode
src/api.py                validate → retrieve → prompt → generate → guard
src/retrieval.py          bundle → Docs → the few that answer this question
src/prompting.py          the system rules and the quoted-data context block
src/safety.py             what is allowed in, what is allowed back out
src/config.py             model id and limits, from the environment
src/models.py             Doc, Message, Request, Source, Answer
src/providers/            base.py is the interface; workers_ai.py is the only implementation
```

Everything except `entry.py` and `providers/workers_ai.py` is pure Python with no runtime
imports, which is why the tests run in a plain interpreter in under a tenth of a second.

## Retrieval, and when to replace it

Token overlap with a category prior. No embeddings, no vector index — the portfolio is a few
dozen records, and a scan that is recomputed per request cannot go stale the way an index can.

`retrieve` reads a category two ways. "What projects has Sumit built?" names a category and
nothing else, so the whole category comes back. "Which projects use PyTorch?" names a category
*and* a discriminator, so the discriminator decides and the category only reorders.

Retrieving nothing is a real answer: the question is about something the portfolio does not
cover, and the model is never called. That is what makes "what is Sumit's favourite movie?"
deterministic rather than a matter of the model's judgement.

Reach for Vectorize when `tests/test_retrieval.py` starts needing questions a person would
actually ask to be written unnaturally to pass. Not before.

## Model

Workers AI, through the `AI` binding. Free tier, no API key to leak, same colo as the request.
The model id is `AI_MODEL` in `wrangler.jsonc` if the default in `config.py` should change.

Swapping providers means writing a sibling of `providers/workers_ai.py` with the same
`generate`, and touching nothing else.

## Working on it

```bash
uv sync --all-groups
uv run pytest              # or `npm run ai:test` from the repo root
uv run pywrangler dev      # needs uv >= 0.12.3
uv run pywrangler deploy
```

Deploy this Worker **before** `sumitos-api`: a service binding to a Worker that does not exist
yet fails to deploy.

Dependencies are empty and should stay that way. Anything added has to exist in Pyodide, and a
text assistant does not need pandas.

### What has and has not been run against the real runtime

Verified under `pywrangler dev` (36 modules, ~121 KiB bundle): the Worker boots, `request.json()`
returns a native dict, `Response.json` encodes correctly, and every path that does not need a
model — 405, malformed body, empty message, oversized message, forged `system` turn in history,
and a question the portfolio does not cover — returns the right status and body.

That probe is also what found the traceback leak. An uncaught exception in a Python Worker is
returned to the caller *as its traceback*, source paths included, so `entry.py` wraps the handler
and `WorkersAI` reads `env.AI` at the point of use rather than in its constructor.

**Still unverified: the `AI.run` call itself.** `providers/workers_ai.py` converts its payload
with `to_js(..., dict_converter=Object.fromEntries)` because Pyodide maps a bare dict to a JS
`Map`, which the binding reads as no arguments at all. The tests prove the conversion is
requested; only a live binding proves Cloudflare accepts the result — and Workers AI has no
local emulation, so it needs `wrangler login` first. Run one grounded ask before trusting a
deploy: it should return an answer, not a 502.

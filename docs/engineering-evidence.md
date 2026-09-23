# Engineering evidence

How a project shows *how* it was built — the decisions, what broke, how it changed, what it does
not prove — and the rule that keeps all of it honest: **no source, no claim.**

## The model

Every evidence kind is a **section body** inside the existing `projects.sections` JSON column
(`src/data/projects.ts`). There is no new column, table or migration. That is deliberate: a
section already goes through the draft → Publish flow, the admin Preview, `/api/content`, the
`/projects/<slug>` page, Ask Sumit and Sumit Context, so the evidence reaches all of them with no
second store to keep in step. A project that documents none of these kinds simply has none.

| Kind | Shape | Rendered as |
|---|---|---|
| `decision` | `{ question, options[], chosen, why, better, worse, trigger?, evidence?[] }` | Card: options as chips with the chosen one marked, why, trade-off, "revisit when", evidence links |
| `incident` | `{ title, expected, observed, cause, fix, verified?, learned?, evidence?[] }` | Collapsed log line (title + root cause); expands to the full record |
| `timeline` | `[stage, what happened, evidenceUrl?][]` | Vertical timeline, one evidence link per stage |
| `limits` | `[limitation, why it matters, next step?][]` | One card per limitation |
| `metrics` | `[label, value, hint?, proofUrl?][]` | Existing metric tiles; a 4th cell adds a "Proof ↗" link |

Any section can carry `role: 'fact' | 'interpretation' | 'limitation'`, shown as a small label —
what the data supports, what the author concluded from it, and what is not proven.

`better`, `worse`, `trigger` and the limitation's next step are optional **on purpose**: most
sources state a result without a trade-off or a plan, and the empty field is the honest one.

## Rules

- Every claim comes from the project's own repository — a doc, a log, a commit — or this
  repository's history, and links to it. When a source does not say it, the field stays empty.
- Stages in a timeline are named after what the source calls them (`S8 — back-test`), never
  invented version numbers.
- Incidents are debugging records, not success stories: expected, observed, root cause, fix.

## Security

Every URL in an evidence link, metric proof or timeline stage becomes an `href`. `validate` in
`worker/tables.ts` walks the sections (`sectionUrls`) and runs each one through the same
`urlAllowed` allowlist as every other link — `http:`, `https:`, `mailto:` only — on create, on
draft save and again on publish. Covered in `worker/validate.test.ts`.

## Where it shows up

- **Project window and `/projects/<slug>`** — `SectionBody` in `src/components/primitives.tsx`.
- **Recruiter view** (`/recruiter`) — server-rendered from the same bundle; projects are ranked
  by how much documented evidence they carry, and every incident is listed with its project.
- **Project Interview** (Launchpad, Spotlight, the SJ menu, and the mobile page) —
  `interviewQuestions` in `src/data/interview.ts` asks only what a section can answer (a decision
  → "why X rather than Y?", an incident → "what went wrong?", …) and "Show answer" reveals that
  section as stored. There is no model in it, so it cannot say more than the project does. A
  project with no material gets no questions.
- **Ask Sumit** — `ai/src/retrieval.py` flattens the kinds into labelled prose (URLs left out).
- **Sumit Context** — `worker/mcp/retrieval.ts` renders them as text with evidence URLs, and
  `get_context(section: "incidents" | "decisions" | "evolution" | "limitations")` matches by kind.

## Adding evidence

In `/admin` → a project → Project content → **Add section**, pick *Engineering decision*,
*Incident — what broke*, *Evolution timeline* or *Limitations and next steps*. The edit is a
draft until **Publish changes**; Preview shows the real window first.

## Limitations

- Evidence is authored, not derived: nothing checks that a linked file still says what the card
  says. A link that rots needs a human to notice.
- The compiled-in fallback (`src/data/projects.ts`) carries no evidence sections until it is
  re-synced from `/api/content` after publishing.

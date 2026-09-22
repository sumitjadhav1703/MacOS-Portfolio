// A regression guard over worker/mcp/ source. It lives in scripts/ because it reads files with
// node:fs, which the Worker's tsconfig (workers-types only) deliberately cannot see.
//
// It is not the security boundary itself. That is the
// `ReadonlyContextSource` type these files are handed instead of `env`. This makes a future edit
// that reaches past it fail loudly in CI rather than pass review.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = new URL('../worker/mcp/', import.meta.url).pathname
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map((f) => ({ name: f, text: readFileSync(join(dir, f), 'utf8') }))

// Comments may describe what the code refuses to do; only code counts.
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('worker/mcp/ stays read-only', () => {
  it('has source files to check', () => {
    expect(files.map((f) => f.name)).toEqual(expect.arrayContaining(['retrieval.ts', 'server.ts', 'tools.ts']))
  })

  it.each([
    ['a SQL mutation', /\b(INSERT|UPDATE|DELETE|REPLACE|UPSERT|CREATE|DROP|ALTER)\s+(INTO|TABLE|FROM|INDEX|OR|\w+\s+SET)\b/i],
    ['a D1 call', /\.(prepare|batch|exec)\s*\(/],
    ['an R2 or KV write', /\.(put|delete)\s*\(/],
    ['a network fetch', /(?<![.\w])fetch\s*\(/],
    ['the Worker env', /\benv\s*[.[]/],
    ['an admin, auth, files, env or content import', /from\s+['"]\.\.\/(admin|auth|files|env|content|oauth)['"]/],
  ])('contains no %s', (_, pattern) => {
    for (const { name, text } of files) expect(code(text), name).not.toMatch(pattern)
  })
})

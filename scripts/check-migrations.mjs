// Migration safety, checked rather than remembered.
//
// D1 migrations are forward-only: wrangler records which have been applied and never re-runs one,
// so editing an applied file changes what a fresh database gets and leaves every existing
// database on the old shape, silently and permanently. There is no down-migration to fall back
// on and inventing one would be worse than not having it.
//
// Two rules, both enforced here rather than in a comment nobody reads at the wrong moment:
//   1. numbering is sequential, with no gaps and no duplicates
//   2. a migration that has been applied is immutable
//
// The checksums live in migrations/.checksums. Adding a migration adds a line; changing one that
// is already listed fails, and the fix is a new migration, never an edit.

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'migrations'
const LOCK = join(DIR, '.checksums')
const write = process.argv.includes('--write')

const files = readdirSync(DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort()

const problems = []

// ── 1. numbering ─────────────────────────────────────────────────────────────────────────────
const numbers = []
for (const name of files) {
  const match = name.match(/^(\d{4})_[a-z0-9_]+\.sql$/)
  if (!match) {
    problems.push(`${name}: name it 0004_something_descriptive.sql`)
    continue
  }
  numbers.push({ n: Number(match[1]), name })
}

numbers.sort((a, b) => a.n - b.n)
numbers.forEach((entry, i) => {
  const expected = i + 1
  if (entry.n !== expected) {
    problems.push(
      `${entry.name}: expected number ${String(expected).padStart(4, '0')} — ` +
        'migrations must be sequential with no gaps',
    )
  }
})

const seen = new Set()
for (const { n, name } of numbers) {
  if (seen.has(n)) problems.push(`${name}: two migrations share the number ${n}`)
  seen.add(n)
}

// ── 2. immutability ──────────────────────────────────────────────────────────────────────────
const sha = (name) => createHash('sha256').update(readFileSync(join(DIR, name))).digest('hex')
const current = Object.fromEntries(files.map((name) => [name, sha(name)]))

// Read first and handle its absence, rather than asking whether it exists and then reading: the
// gap between the two questions is a race, and the answer to the second covers both.
let lock = null
try {
  lock = readFileSync(LOCK, 'utf8')
} catch {
  // no checksum file yet
}

if (lock === null) {
  if (!write) {
    problems.push(`${LOCK} does not exist — create it with: node scripts/check-migrations.mjs --write`)
  }
} else {
  const recorded = Object.fromEntries(
    lock
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
      .map((line) => line.trim().split(/\s+/))
      .map(([hash, name]) => [name, hash]),
  )

  for (const [name, hash] of Object.entries(recorded)) {
    if (!(name in current)) {
      problems.push(`${name}: recorded but missing — an applied migration cannot be deleted`)
    } else if (current[name] !== hash) {
      problems.push(
        `${name}: contents changed since it was recorded. A migration that has been applied is ` +
          'immutable; write a new one that corrects it instead.',
      )
    }
  }

  if (!write) {
    for (const name of files) {
      if (!(name in recorded)) {
        problems.push(
          `${name}: not recorded — run \`node scripts/check-migrations.mjs --write\` and commit ` +
            'migrations/.checksums alongside it',
        )
      }
    }
  }
}

if (write) {
  const body =
    '# sha256 of every migration, so an applied one cannot be edited unnoticed.\n' +
    '# Regenerate with: node scripts/check-migrations.mjs --write\n' +
    files.map((name) => `${current[name]}  ${name}`).join('\n') +
    '\n'
  writeFileSync(LOCK, body)
  console.log(`check-migrations: recorded ${files.length} migrations in ${LOCK}`)
  if (problems.length) {
    // Numbering problems are not fixed by recording checksums.
    console.error('\nStill to fix:\n' + problems.map((p) => `  ${p}`).join('\n'))
    process.exit(1)
  }
  process.exit(0)
}

if (problems.length) {
  console.error(`\n${problems.length} migration problem${problems.length === 1 ? '' : 's'}:\n`)
  for (const problem of problems) console.error(`  ${problem}`)
  console.error('')
  process.exit(1)
}

console.log(`check-migrations: ${files.length} migrations, sequential and unchanged.`)

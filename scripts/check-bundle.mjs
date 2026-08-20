// A size gate for the JavaScript the public site ships.
//
// Spec §31 is explicit that a limit invented before measuring is not a limit, so this measures
// first: with no budget file it records what the build currently produces and exits 0. From then
// on it compares, warns at +5% and fails at +10%.
//
// What is measured is the gzipped total of .next/static/chunks — the code a visitor downloads.
// Build output that never reaches a browser is not this script's business.

import { gzipSync } from 'node:zlib'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHUNKS = '.next/static/chunks'
const BUDGET = 'perf-budget.json'
const WARN = 1.05
const FAIL = 1.1

if (!existsSync(CHUNKS)) {
  console.error(`check-bundle: ${CHUNKS} not found — run \`npm run build\` first.`)
  process.exit(1)
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path))
    else if (entry.name.endsWith('.js')) out.push(path)
  }
  return out
}

const files = walk(CHUNKS)
let gzipped = 0
let raw = 0
for (const file of files) {
  const bytes = readFileSync(file)
  raw += statSync(file).size
  gzipped += gzipSync(bytes).length
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`
const measured = { gzipBytes: gzipped, rawBytes: raw, files: files.length }

if (!existsSync(BUDGET)) {
  writeFileSync(
    BUDGET,
    `${JSON.stringify(
      {
        note:
          'Baseline for scripts/check-bundle.mjs: the gzipped total of .next/static/chunks. ' +
          'Warns above +5%, fails above +10%. Update deliberately, in the same commit as the ' +
          'change that justifies it.',
        ...measured,
        recordedAt: new Date().toISOString().slice(0, 10),
      },
      null,
      2,
    )}\n`,
  )
  console.log(`check-bundle: recorded a baseline of ${kb(gzipped)} gzipped across ${files.length} chunks.`)
  process.exit(0)
}

const budget = JSON.parse(readFileSync(BUDGET, 'utf8'))
const ratio = gzipped / budget.gzipBytes
const delta = ((ratio - 1) * 100).toFixed(1)
const summary =
  `check-bundle: ${kb(gzipped)} gzipped across ${files.length} chunks ` +
  `(baseline ${kb(budget.gzipBytes)}, ${ratio >= 1 ? '+' : ''}${delta}%)`

if (ratio > FAIL) {
  console.error(`${summary} — over the 10% ceiling.`)
  console.error('If the growth is intended, update perf-budget.json in the same commit and say why.')
  process.exit(1)
}

console.log(summary + (ratio > WARN ? ' — worth a look, over 5%.' : '.'))

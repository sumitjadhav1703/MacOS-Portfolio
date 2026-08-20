// Refuses to let a credential become a commit.
//
// Scans everything git tracks, plus the generated files that are gitignored but end up in a
// build, plus the workflow YAML. Files that are gitignored are deliberately NOT read — .dev.vars
// legitimately holds a local secret, so reading it would fail every run and teach you to ignore
// this script. Instead the last check asserts those paths are not tracked, which is the thing
// that actually matters.
//
// Exits 1 on any finding. Wired into `npm run ci`, so it runs locally and in CI alike.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'

const MAX_FILE_BYTES = 2 * 1024 * 1024

/** Binary and vendored formats: reading them produces noise, never a readable credential. */
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.otf',
  '.mp4', '.zip', '.lock',
])

/**
 * Each rule names what it is looking for and, where it has a known false positive, the exact
 * paths that are allowed to match and why. An allowance is a deliberate decision, not a
 * blanket ignore — the reason is part of the rule so it can be re-argued later.
 */
const RULES = [
  {
    name: 'private key block',
    re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
    allow: [],
  },
  {
    name: 'PBKDF2 password hash',
    // The full four-part shape with a real salt and digest, not the bare `pbkdf2$` prefix that
    // worker/auth.ts and its tests name while describing the format.
    re: /pbkdf2\$\d{4,}\$[A-Za-z0-9+/=]{20,}\$[A-Za-z0-9+/=]{40,}/,
    allow: [],
  },
  {
    name: 'admin password hash assignment',
    re: /ADMIN_PASSWORD_HASH\s*[=:]\s*["']?[^\s"'{}<$]{16,}/,
    allow: [],
  },
  {
    name: 'Cloudflare API token',
    re: /CLOUDFLARE_API_TOKEN\s*[=:]\s*["']?[A-Za-z0-9_-]{30,}/,
    allow: [],
  },
  {
    name: 'Vercel token',
    re: /VERCEL_TOKEN\s*[=:]\s*["']?[A-Za-z0-9]{20,}/,
    allow: [],
  },
  {
    name: 'GitHub token',
    re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/,
    allow: [],
  },
  {
    name: 'AWS access key id',
    re: /\bAKIA[0-9A-Z]{16}\b/,
    allow: [],
  },
  {
    name: 'Slack or Stripe live key',
    re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b|\bsk_live_[A-Za-z0-9]{20,}\b/,
    allow: [],
  },
  {
    name: 'generic secret assignment',
    // Deliberately narrow: a quoted, long, non-placeholder value on a secret-shaped key.
    // `REPLACE_WITH_…`, `<your-…>`, `${…}` and `changeme` are how this repo writes placeholders.
    re: /\b(?:SECRET|PASSWORD|PASSWD|API_KEY|APIKEY|ACCESS_TOKEN|PRIVATE_KEY)\s*[=:]\s*["'][^"'\s]{12,}["']/i,
    allow: [
      // The generator prints the format it produces; it holds no value of its own.
      'scripts/hash-password.mjs',
    ],
  },
]

const PLACEHOLDER = /REPLACE_WITH|<[a-z-]+>|\$\{|changeme|example\.com|your-|xxx+|\.\.\./i

/** Paths that must never be tracked, whatever they contain. */
const NEVER_TRACKED = [/^\.dev\.vars$/, /^\.env($|\.)/, /(^|\/)\.env\.[^/]*local$/, /^\.wrangler\//]

function tracked() {
  const out = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 32 << 20 })
  return out.split('\0').filter(Boolean)
}

// Generated but shipped, so worth reading even though git ignores them. Whether they exist is
// not asked here — the read below answers it, and asking twice is a race.
const EXTRAS = ['src/generated/sources.ts', 'src/generated/icon-slugs.ts']

const findings = []
const files = [...tracked(), ...EXTRAS]

for (const file of files) {
  if (SKIP_EXTENSIONS.has(extname(file).toLowerCase())) continue

  let bytes
  try {
    bytes = readFileSync(file)
  } catch {
    continue // listed by git but not in the working tree, or generated and not built yet
  }
  if (bytes.length > MAX_FILE_BYTES) {
    const mb = (bytes.length / 1024 / 1024).toFixed(1)
    findings.push({ file, line: 0, rule: 'large tracked file', text: `${mb} MB` })
    continue
  }

  const text = bytes.toString('utf8')
  if (text.includes('\0')) continue

  const lines = text.split('\n')
  for (const rule of RULES) {
    if (rule.allow.includes(file)) continue
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(rule.re)
      if (!match) continue
      if (PLACEHOLDER.test(match[0])) continue
      findings.push({ file, line: i + 1, rule: rule.name, text: match[0].slice(0, 60) })
    }
  }
}

for (const file of files) {
  if (NEVER_TRACKED.some((re) => re.test(file))) {
    findings.push({ file, line: 0, rule: 'file that must never be tracked', text: file })
  }
}

if (findings.length) {
  console.error(`\n${findings.length} possible secret${findings.length === 1 ? '' : 's'}:\n`)
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  ${f.rule}`)
    console.error(`    ${f.text}`)
  }
  console.error('\nIf one of these is a deliberate placeholder or fixture, add it to that rule\'s')
  console.error('`allow` list in scripts/scan-secrets.mjs with a reason. Do not widen the pattern.\n')
  process.exit(1)
}

console.log(`scan-secrets: ${files.length} files, nothing found.`)

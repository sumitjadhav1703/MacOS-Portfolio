// Refuses to deploy a Worker whose configuration is still the template.
//
// `wrangler deploy --dry-run` exits 0 on this file: it reports `env.DB (sumitos) D1 Database`
// without ever asking whether the id is real, so a placeholder passes every check that can run
// before a deploy and fails at the one that cannot. SITE_ORIGIN is worse than that — a wrong
// value deploys cleanly and then blocks the live site from its own API, because it is the CORS
// allowlist. Neither of those should be discovered in production.
//
// Wired into `preworker:deploy`, not into `npm run ci`: a fresh clone has not filled these in
// yet, and failing the test suite over it would say nothing useful.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'wrangler.jsonc'), 'utf8')

// jsonc: line comments only, which is all this file uses. Strings are left alone.
const config = JSON.parse(
  source.replace(/^\s*\/\/.*$/gm, '').replace(/([^:"])\/\/.*$/gm, '$1'),
)

const problems = []

const db = config.d1_databases?.[0]
if (!db?.database_id || /^REPLACE_WITH|^$/.test(db.database_id)) {
  problems.push(
    `d1_databases[0].database_id is ${JSON.stringify(db?.database_id)}.\n` +
      '    Run `npx wrangler d1 create sumitos` and paste the id it prints.',
  )
}

const site = config.vars?.SITE_ORIGIN
if (!site) {
  problems.push('vars.SITE_ORIGIN is not set. It is the CORS allowlist; the site cannot read the API without it.')
} else if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(:\d+)?$/i.test(site)) {
  problems.push(
    `vars.SITE_ORIGIN is ${JSON.stringify(site)}, which is not a public https origin.\n` +
      '    It is the only origin CORS lets through, so a wrong value leaves the live site\n' +
      '    silently serving its bundled content forever.',
  )
}

if (problems.length) {
  console.error(`\ncheck-deploy: ${problems.length} thing${problems.length === 1 ? '' : 's'} to fix first:\n`)
  for (const p of problems) console.error(`  - ${p}\n`)
  process.exit(1)
}

console.log(`check-deploy: database_id set, SITE_ORIGIN ${site}.`)

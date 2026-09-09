// Fails when a dependency gains an install script nobody approved.
//
// `allowScripts` in package.json read like a lockdown and was not one: nothing consumed it, there
// is no .npmrc, and `npm ci` runs every install script in the tree regardless. Rather than delete
// the intent, this makes it true in the direction that is actually cheap — npm still runs the
// scripts, but a package that starts running code at install time cannot arrive unnoticed.
//
// Setting `ignore-scripts=true` instead would be the stronger control and a different decision:
// esbuild, workerd and fsevents all fetch their native binaries that way, so it would need a
// rebuild step wired into every clone and every CI job.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
const allowed = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).allowScripts ?? {}

const found = Object.entries(lock.packages ?? {})
  .filter(([path, pkg]) => path && pkg.hasInstallScript)
  .map(([path, pkg]) => `${path.split('node_modules/').pop()}@${pkg.version}`)

const unexpected = found.filter((id) => allowed[id] !== true)

if (unexpected.length) {
  console.error(`\ncheck-install-scripts: ${unexpected.length} package(s) run code at install time:\n`)
  for (const id of unexpected) console.error(`  ${id}`)
  console.error('\nIf each of these is expected, add it to "allowScripts" in package.json with')
  console.error('the exact version. Look at what it runs first.\n')
  process.exit(1)
}

console.log(`check-install-scripts: ${found.length} install script(s), all allowed.`)

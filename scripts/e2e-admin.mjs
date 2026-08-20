// Runs the admin browser suite against a real Worker with a real local D1.
//
// The admin cannot be tested the way the desktop is: it needs a database, a bucket, a session and
// a password. This script builds all four, runs the suite, and tears them down.
//
// The password is generated here, at run time, and never written anywhere but the runner's own
// .dev.vars — which is gitignored and restored afterwards. Spec §25 forbids automating an admin
// login with a committed credential, and this is how the flow gets covered without one.

import { spawn, spawnSync } from 'node:child_process'
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const PORT = Number(process.env.E2E_ADMIN_PORT ?? 8788)
const BASE = `http://localhost:${PORT}`
const DEV_VARS = '.dev.vars'
// Enough to exercise the real verification path. The production 210,000 would add a second to
// every login in the suite and prove nothing extra — auth.test.ts already covers the cost factor.
const ITERATIONS = 10_000

const password = randomBytes(24).toString('base64url')
const salt = randomBytes(16)
const derived = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256')
const hash = `pbkdf2$${ITERATIONS}$${salt.toString('base64')}$${derived.toString('base64')}`

const saved = existsSync(DEV_VARS) ? readFileSync(DEV_VARS, 'utf8') : null
let worker = null

function stop() {
  if (worker && !worker.killed) worker.kill('SIGTERM')
  if (saved === null) rmSync(DEV_VARS, { force: true })
  else writeFileSync(DEV_VARS, saved)
}

process.on('exit', stop)
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(1))

function run(command, args, label) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    console.error(`\n${label} failed with status ${result.status}`)
    process.exit(result.status ?? 1)
  }
}

async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).status < 500) return
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  throw new Error(`${url} did not answer within ${timeoutMs}ms`)
}

// 1. The admin SPA has to exist before wrangler can serve it.
run('npm', ['run', 'admin:build'], 'admin:build')

// 2. A local D1 with the schema and the seed. `--local` keeps this on disk under .wrangler; there
//    is no path from here to the remote database.
run('npx', ['wrangler', 'd1', 'migrations', 'apply', 'sumitos', '--local'], 'd1 migrations apply')

// 3. Clear the login-attempt counter.
//
//    Not a convenience. `clientIp` reads CF-Connecting-IP, which nothing sets locally, so every
//    request in every run shares the bucket '0.0.0.0'. The suite's own wrong-password test adds
//    one failure per run and the rows outlive the run, so the tenth run inside a fifteen-minute
//    window trips the real lockout and the suite starts failing from wherever it happens to be —
//    which looks exactly like flakiness. The lockout itself is covered properly, without a
//    database, in worker/session.test.ts.
run(
  'npx',
  ['wrangler', 'd1', 'execute', 'sumitos', '--local', '--command', 'DELETE FROM login_attempts'],
  'clearing login_attempts',
)

// 4. Drop anything a previous run left behind.
//
//    The suite cleans up after itself, but a run that fails part-way never reaches its cleanup
//    step, and the local D1 persists between runs. Leftover rows are the classic source of a
//    suite that passes once and then fails forever after.
run(
  'npx',
  [
    'wrangler', 'd1', 'execute', 'sumitos', '--local',
    '--command', "DELETE FROM projects WHERE slug LIKE 'e2e-%'",
  ],
  'clearing leftover e2e rows',
)

// 5. The secret, for this run only.
//
//    Single-quoted, not double: .dev.vars is parsed as dotenv, and the hash is four `$`-separated
//    fields. In double quotes `$10000` expands to nothing, the secret arrives mangled, and the
//    Worker rejects the correct password with no hint as to why.
writeFileSync(DEV_VARS, `ADMIN_PASSWORD_HASH='${hash}'\n`)

// 6. Start the Worker. Its output is captured rather than echoed — it is noisy, and a failing
//    test's trace is the useful artifact. The tail is printed only if something goes wrong.
worker = spawn('npx', ['wrangler', 'dev', '--local', '--port', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'],
})
let log = ''
worker.stdout.on('data', (chunk) => (log += chunk))
worker.stderr.on('data', (chunk) => (log += chunk))

const tail = (lines) => log.split('\n').slice(-lines).join('\n')

try {
  await waitFor(`${BASE}/api/content`, 60_000)
} catch (error) {
  console.error(String(error))
  console.error(tail(30))
  process.exit(1)
}

// 7. Run the suite against it.
const test = spawnSync('npx', ['playwright', 'test', '--project=admin'], {
  stdio: 'inherit',
  env: { ...process.env, E2E_BASE_URL: BASE, E2E_ADMIN_PASSWORD: password },
})

if (test.status !== 0) console.error(tail(40))
stop()
process.exit(test.status ?? 1)

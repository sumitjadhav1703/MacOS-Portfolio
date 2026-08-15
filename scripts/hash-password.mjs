// Turns an admin password into the string the Worker stores as its ADMIN_PASSWORD_HASH secret.
// The plaintext is read from stdin so it never lands in shell history or a process listing.
//
//   node scripts/hash-password.mjs
//   npx wrangler secret put ADMIN_PASSWORD_HASH        # paste the printed line

import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'

const ITERATIONS = 210_000

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
const password = await new Promise((resolve) => rl.question('Admin password: ', resolve))
rl.close()

if (password.length < 12) {
  console.error('\nRefusing: use at least 12 characters. This is the only credential guarding the CMS.')
  process.exit(1)
}

const salt = randomBytes(16)
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256')
console.log(`\npbkdf2$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`)

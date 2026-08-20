// A smoke test that is safe to point at production.
//
// Everything here is a GET, except one anonymous POST that is expected to be refused. There is no
// login: spec §25 forbids automating an admin sign-in with a committed credential, and there is
// no good reason to hold a production password just to prove a page renders. Admin verification
// stays manual and is listed in docs/release-checklist.md.
//
//   node scripts/smoke.mjs https://sumitjadhav.vercel.app
//   node scripts/smoke.mjs https://sumitjadhav.vercel.app https://api.example.workers.dev
//
// The second argument is the Worker, if you want the API and admin-guard checks too. Without it
// only the site is checked, which is the right thing after a Vercel-only deploy.

const [site, api] = process.argv.slice(2)

if (!site) {
  console.error('Usage: node scripts/smoke.mjs <site-url> [worker-url]')
  process.exit(2)
}

const trim = (url) => url.replace(/\/$/, '')
const SITE = trim(site)
const API = api ? trim(api) : null

const results = []

async function check(name, run) {
  try {
    const detail = await run()
    results.push({ name, ok: true, detail })
  } catch (error) {
    results.push({ name, ok: false, detail: String(error.message ?? error) })
  }
}

const must = (condition, message) => {
  if (!condition) throw new Error(message)
}

async function get(url, init) {
  const response = await fetch(url, { redirect: 'follow', ...init })
  return response
}

// ── the site ─────────────────────────────────────────────────────────────────────────────────

await check('homepage', async () => {
  const response = await get(SITE)
  must(response.status === 200, `expected 200, got ${response.status}`)
  const html = await response.text()
  must(html.includes('<html'), 'response was not HTML')
  return `200, ${(html.length / 1024).toFixed(0)} kB`
})

await check('a known project route', async () => {
  const response = await get(`${SITE}/projects/pm25`)
  must(response.status === 200, `expected 200, got ${response.status}`)
  return '200'
})

await check('the project OG image', async () => {
  const response = await get(`${SITE}/projects/pm25/opengraph-image`)
  must(response.status === 200, `expected 200, got ${response.status}`)
  const type = response.headers.get('content-type') ?? ''
  must(type.startsWith('image/'), `expected an image, got ${type}`)
  return type
})

await check('the site OG image', async () => {
  const response = await get(`${SITE}/opengraph-image`)
  must(response.status === 200, `expected 200, got ${response.status}`)
  return response.headers.get('content-type') ?? '200'
})

await check('a brand glyph', async () => {
  const response = await get(`${SITE}/icons/github.svg`)
  must(response.status === 200, `expected 200, got ${response.status}`)
  return response.headers.get('content-type') ?? '200'
})

await check('the packaged resume', async () => {
  const response = await get(`${SITE}/Sumit_Jadhav_Resume.pdf`, { method: 'HEAD' })
  must(response.status === 200, `expected 200, got ${response.status}`)
  return '200'
})

// ── the Worker ───────────────────────────────────────────────────────────────────────────────

if (API) {
  await check('the content bundle', async () => {
    const response = await get(`${API}/api/content`)
    must(response.status === 200, `expected 200, got ${response.status}`)
    const body = await response.json()
    for (const key of ['site', 'projects', 'skills', 'os']) {
      must(key in body, `the bundle has no "${key}"`)
    }
    must(Array.isArray(body.projects), 'projects is not a list')
    return `200, ${body.projects.length} published project(s)`
  })

  await check('the resume endpoint', async () => {
    const response = await get(`${API}/api/resume`)
    must(response.status === 200, `expected 200, got ${response.status}`)
    const body = await response.json()
    must(typeof body.url === 'string' && body.url, 'no resume URL')
    return body.url
  })

  await check('the public API is read-only', async () => {
    const response = await fetch(`${API}/api/projects`, { method: 'POST' })
    must(response.status === 405, `expected 405, got ${response.status}`)
    return '405'
  })

  await check('an anonymous admin mutation is refused', async () => {
    // The check AGENTS.md asks a human to make with curl after every Worker change.
    for (const [method, path] of [
      ['POST', '/admin/api/projects'],
      ['PATCH', '/admin/api/projects/project-pm25'],
      ['DELETE', '/admin/api/projects/project-pm25'],
      ['PUT', '/admin/api/site'],
    ]) {
      const response = await fetch(`${API}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      must(response.status === 401, `${method} ${path} returned ${response.status}, expected 401`)
    }
    return 'all four 401'
  })

  await check('no draft reaches the public bundle', async () => {
    const body = await (await get(`${API}/api/content`)).text()
    must(!body.includes('"draft"'), 'the word "draft" appears in the public bundle')
    return 'clean'
  })
}

// ── report ───────────────────────────────────────────────────────────────────────────────────

const failed = results.filter((r) => !r.ok)
const width = Math.max(...results.map((r) => r.name.length))

console.log(`\nsmoke: ${SITE}${API ? ` and ${API}` : ' (site only — pass a Worker URL for the API checks)'}\n`)
for (const { name, ok, detail } of results) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(width)}  ${detail}`)
}
console.log(`\n${results.length - failed.length}/${results.length} passed\n`)

process.exit(failed.length ? 1 : 0)

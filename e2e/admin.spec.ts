// The CMS, driven the way its one user drives it. Started by scripts/e2e-admin.mjs, which builds
// the SPA, migrates a local D1, generates a password for this run alone, and points the suite at
// `wrangler dev`.
//
// AGENTS.md says the admin has no DOM tests by design and the browser is the only place several
// of these paths can fail. That stays true of unit tests — this is the browser, automated.

import { expect, test, type Page } from '@playwright/test'

const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''

test.beforeAll(() => {
  expect(PASSWORD, 'run this through `npm run e2e:admin`, which generates the password').not.toBe('')
})

// One tab at a time: these share a database, and the point of the sequence is that each step sees
// what the previous one wrote.
test.describe.configure({ mode: 'serial' })

const unique = `e2e-${Date.now().toString(36)}`
// Tagged with the run's own slug. Asserting on a fixed string like "Edited as a draft" would
// match a row a previous run published and left behind, and pass or fail for the wrong reason.
const DRAFT_TAGLINE = `Edited as a draft ${unique}`

async function signIn(page: Page) {
  await page.goto('/admin')

  const password = page.locator('input[type="password"]')
  const signedIn = page.getByRole('link', { name: /^projects$/i }).first()

  // Wait for the shell to decide which of the two it is showing. `page.goto` resolves on load,
  // but this is a client-rendered SPA that first asks the server whether the cookie is still
  // good — so asking "is the password field visible?" straight after goto answers "no" because
  // nothing has rendered yet, not because there is a session. Getting that wrong means the
  // helper returns without signing in and every request after it is a 401.
  await expect(password.or(signedIn).first()).toBeVisible({ timeout: 20_000 })

  if (!(await password.isVisible())) return

  const submit = page.getByRole('button', { name: /sign in/i })

  // Typing is deliberately not the next thing either. When the session check resolves, the login
  // form re-renders with empty state, so a value filled in before it lands is silently discarded,
  // the submit button goes back to `disabled={!password}`, and the click that follows does
  // nothing at all — no error, no request, just a form sitting there. Waiting for the button to
  // react to the typed value is what makes this deterministic.
  await expect(submit).toBeDisabled()
  await password.fill(PASSWORD)
  await expect(submit).toBeEnabled()
  await submit.click()

  await expect(password).toBeHidden({ timeout: 15_000 })
  await expect(signedIn).toBeVisible({ timeout: 15_000 })
}

test('refuses the wrong password and says so', async ({ page }) => {
  await page.goto('/admin')
  await page.locator('input[type="password"]').fill('definitely not the password')
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page.getByText(/incorrect password/i)).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('signs in with the right one', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('link', { name: /projects/i }).first()).toBeVisible()
})

test('creates a project, edits it as a draft, then publishes it', async ({ page }) => {
  await signIn(page)

  // Create. The API is the contract the UI drives, so the assertions that matter are made there.
  const created = await page.request.post('/admin/api/projects', {
    data: { slug: unique, title: 'E2E Project', published: 0 },
    headers: { Origin: new URL(page.url()).origin },
  })
  expect(created.status()).toBe(201)
  const { id } = (await created.json()) as { id: string }

  // Unpublished, so the public bundle must not carry it.
  const before = await (await page.request.get('/api/content')).json()
  expect(JSON.stringify(before)).not.toContain(unique)

  // Edit: the change becomes a draft and the public bundle still does not move.
  const drafted = await page.request.put(`/admin/api/projects/${id}/draft`, {
    data: { slug: unique, title: 'E2E Project', tagline: DRAFT_TAGLINE },
    headers: { Origin: new URL(page.url()).origin },
  })
  expect(drafted.ok()).toBe(true)
  expect(JSON.stringify(await (await page.request.get('/api/content')).json())).not.toContain(DRAFT_TAGLINE)

  // Publish: now it is public, and the draft has been promoted.
  const published = await page.request.post(`/admin/api/projects/${id}/publish`, {
    headers: { Origin: new URL(page.url()).origin },
  })
  expect(published.ok()).toBe(true)

  await expect
    .poll(async () => JSON.stringify(await (await page.request.get('/api/content')).json()), { timeout: 90_000 })
    .toContain(DRAFT_TAGLINE)
})

test('shows the published project in the admin list', async ({ page }) => {
  await signIn(page)

  // Through the navigation rather than by setting the hash. `signIn` has already loaded /admin,
  // and assigning a new fragment to an loaded page is not a navigation — the router only hears
  // about it if something dispatches hashchange. Clicking the link is both more realistic and
  // deterministic.
  await page.getByRole('link', { name: /^projects$/i }).first().click()

  await expect(page.getByText('E2E Project').first()).toBeVisible({ timeout: 15_000 })
})

test('duplicates a project, and the copy is born unpublished', async ({ page }) => {
  await signIn(page)
  const origin = new URL(page.url()).origin

  const list = await (await page.request.get('/admin/api/projects')).json()
  const source = (list.items as { id: string; slug: string }[]).find((p) => p.slug === unique)!

  const copy = await page.request.post(`/admin/api/projects/${source.id}/duplicate`, { headers: { Origin: origin } })
  expect(copy.ok()).toBe(true)
  const made = (await copy.json()) as { id: string; slug?: string }

  const after = await (await page.request.get('/admin/api/projects')).json()
  const row = (after.items as { id: string; published: number }[]).find((p) => p.id === made.id)!
  expect(row.published).toBe(0)

  await page.request.delete(`/admin/api/projects/${made.id}`, { headers: { Origin: origin } })
})

test('unpublishes, and the project leaves the public bundle', async ({ page }) => {
  await signIn(page)
  const origin = new URL(page.url()).origin

  const list = await (await page.request.get('/admin/api/projects')).json()
  const row = (list.items as { id: string; slug: string }[]).find((p) => p.slug === unique)!

  const patched = await page.request.patch(`/admin/api/projects/${row.id}`, {
    data: { published: 0 },
    headers: { Origin: origin },
  })
  expect(patched.ok()).toBe(true)

  await expect
    .poll(async () => JSON.stringify(await (await page.request.get('/api/content')).json()), { timeout: 90_000 })
    .not.toContain(unique)
})

test('uploads a file, refuses to delete it while it is in use, then deletes it', async ({ page }) => {
  await signIn(page)
  const origin = new URL(page.url()).origin

  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ])
  const uploaded = await page.request.post('/admin/api/files', {
    headers: { Origin: origin },
    multipart: {
      kind: 'projects',
      file: { name: 'cover.png', mimeType: 'image/png', buffer: png },
    },
  })
  expect(uploaded.status()).toBe(201)
  const { key } = (await uploaded.json()) as { key: string }
  expect(key).toMatch(/^portfolio\/projects\/[0-9a-f-]{36}\.png$/)

  // Attach it, then try to delete it: the API must refuse and name what is using it.
  const list = await (await page.request.get('/admin/api/projects')).json()
  const row = (list.items as { id: string; slug: string }[]).find((p) => p.slug === unique)!
  await page.request.patch(`/admin/api/projects/${row.id}`, { data: { cover_key: key }, headers: { Origin: origin } })

  const refused = await page.request.delete(`/admin/api/files/${key}`, { headers: { Origin: origin } })
  expect(refused.status()).toBe(409)
  expect((await refused.json()).usedBy.length).toBeGreaterThan(0)

  // Detach, then it deletes.
  await page.request.patch(`/admin/api/projects/${row.id}`, { data: { cover_key: '' }, headers: { Origin: origin } })
  const deleted = await page.request.delete(`/admin/api/files/${key}`, { headers: { Origin: origin } })
  expect(deleted.ok()).toBe(true)
})

test('refuses a file whose bytes are not what it claims', async ({ page }) => {
  await signIn(page)
  const response = await page.request.post('/admin/api/files', {
    headers: { Origin: new URL(page.url()).origin },
    multipart: {
      kind: 'projects',
      file: { name: 'evil.png', mimeType: 'image/png', buffer: Buffer.from('#!/bin/sh\nrm -rf /') },
    },
  })
  expect(response.status()).toBe(415)
})

test('refuses a link that would execute, even by direct request', async ({ page }) => {
  await signIn(page)
  const origin = new URL(page.url()).origin
  const list = await (await page.request.get('/admin/api/projects')).json()
  const row = (list.items as { id: string; slug: string }[]).find((p) => p.slug === unique)!

  const response = await page.request.patch(`/admin/api/projects/${row.id}`, {
    data: { links: [{ label: 'Demo', url: 'javascript:alert(1)' }] },
    headers: { Origin: origin },
  })
  // 422, not 400: the body parsed fine and the route exists — one field failed validation, and
  // `update` returns the field errors alongside it so the editor can point at the offending row.
  expect(response.status()).toBe(422)
  expect(JSON.stringify(await response.json())).toContain('links')
})

test('cleans up, then logs out and the session stops working', async ({ page }) => {
  await signIn(page)
  const origin = new URL(page.url()).origin

  const list = await (await page.request.get('/admin/api/projects')).json()
  const row = (list.items as { id: string; slug: string }[]).find((p) => p.slug === unique)
  if (row) await page.request.delete(`/admin/api/projects/${row.id}`, { headers: { Origin: origin } })

  const out = await page.request.post('/admin/api/logout', { headers: { Origin: origin } })
  expect(out.ok()).toBe(true)

  const after = await page.request.get('/admin/api/stats')
  expect(after.status()).toBe(401)
})

test('an anonymous request cannot mutate anything', async ({ request }) => {
  // The same assertion AGENTS.md asks a human to make with curl after a Worker change.
  for (const [method, path] of [
    ['post', '/admin/api/projects'],
    ['patch', '/admin/api/projects/project-x'],
    ['delete', '/admin/api/projects/project-x'],
    ['put', '/admin/api/site'],
  ] as const) {
    const response = await request[method](path, { data: {} })
    expect(response.status(), `${method} ${path}`).toBe(401)
  }
})

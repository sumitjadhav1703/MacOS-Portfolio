// The public desktop, checked in a real browser. Everything here is something the unit tests
// cannot see: whether it boots, whether a window opens and moves, whether a deep link lands on
// the right project, and whether the console stays clean while it happens.

import { expect, test } from '@playwright/test'
import { boot, expectCleanConsole, openFromDock, watchConsole, windowFor } from './helpers'

test('boots to a desktop with a menu bar and a dock', async ({ page }) => {
  const problems = watchConsole(page)
  await boot(page)

  await expect(page.locator('#menubar')).toBeVisible()
  await expect(page.locator('#dock')).toBeVisible()
  await expect(page.locator('#wm')).toBeAttached()

  expectCleanConsole(problems)
})

test('opens an app from the dock and closes it again', async ({ page }) => {
  const problems = watchConsole(page)
  await boot(page)

  await openFromDock(page, 'terminal')
  const win = windowFor(page, 'terminal')
  await expect(win).toBeVisible()

  await win.getByRole('button', { name: /^Close/ }).click()
  await expect(win).toBeHidden()

  expectCleanConsole(problems)
})

test('gives the menu bar to whichever app has focus', async ({ page }) => {
  await boot(page)
  const before = await page.locator('#menubar').innerText()

  await openFromDock(page, 'terminal')
  const during = await page.locator('#menubar').innerText()

  // The bar is a table keyed on the focused AppId, so opening an app must change what it renders.
  expect(during).not.toBe(before)
})

test('drags a window and it stays where it was put', async ({ page }) => {
  await boot(page)
  await openFromDock(page, 'terminal')

  const win = windowFor(page, 'terminal')
  const start = await win.boundingBox()
  expect(start).not.toBeNull()

  const box = await page.locator('[data-titlebar="terminal"]').boundingBox()

  await page.mouse.move(box!.x + box!.width / 2, box!.y + 8)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 120, box!.y + 8 + 90, { steps: 12 })
  await page.mouse.up()

  const moved = await win.boundingBox()
  expect(Math.abs(moved!.x - start!.x) + Math.abs(moved!.y - start!.y)).toBeGreaterThan(40)
})

test('finds a project through Spotlight and opens it', async ({ page }) => {
  const problems = watchConsole(page)
  await boot(page)

  await page.keyboard.press('Meta+k')
  await expect(page.locator('#spotlight-input')).toBeFocused()

  await page.locator('#spotlight-input').fill('pm')
  await expect(page.locator('#spotlight-results')).toBeVisible()
  await page.keyboard.press('Enter')

  await expect(page.locator('#spotlight')).toBeHidden()
  await expect(page.locator('[id^="win-project-"]')).toBeVisible()

  expectCleanConsole(problems)
})

test('opens Launchpad and shows every app as a tile', async ({ page }) => {
  await boot(page)
  await page.locator('#dock [data-item="launchpad"]').click()
  await expect(page.locator('#launchpad')).toBeVisible()
  expect(await page.locator('#launchpad [data-lp]').count()).toBeGreaterThan(5)

  await page.keyboard.press('Escape')
  await expect(page.locator('#launchpad')).toBeHidden()
})

test('opens a context menu on the desk', async ({ page }) => {
  await boot(page)
  await page.locator('#wm').click({ button: 'right', position: { x: 200, y: 300 } })
  await expect(page.locator('[data-contextmenu]')).toBeVisible()
})

test.describe('project deep links', () => {
  // These six slugs are prerendered from FALLBACK, so this runs without the Worker — which is the
  // property that lets the build never need a database.
  for (const slug of ['pm25', 'lazarus', 'ai-video']) {
    test(`/projects/${slug} opens that project's window`, async ({ page }) => {
      const problems = watchConsole(page)
      await boot(page, `/projects/${slug}`)

      await expect(windowFor(page, `project-${slug}`)).toBeVisible()
      expectCleanConsole(problems)
    })
  }

  test('a slug that does not exist does not break the desktop', async ({ page }) => {
    const response = await page.goto('/projects/no-such-project')
    // Either a 404 route or the desktop with nothing opened; a blank page or a crash is not ok.
    if (response && response.status() === 200) {
      await expect(page.locator('#menubar')).toBeVisible()
    } else {
      expect(response?.status()).toBe(404)
    }
  })
})

test('serves an OG image for a project', async ({ request }) => {
  const response = await request.get('/projects/pm25/opengraph-image')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/')
})

test('runs standalone when the API is unreachable — FALLBACK is what renders', async ({ page }) => {
  // With no NEXT_PUBLIC_API_URL the desktop never calls the Worker at all. Refusing every request
  // to one proves the content on screen came from src/data, not from a lucky cache.
  await page.route('**/api/**', (route) => route.abort())

  const problems = watchConsole(page)
  await boot(page)
  await expect(page.locator('#dock')).toBeVisible()
  expectCleanConsole(problems)
})

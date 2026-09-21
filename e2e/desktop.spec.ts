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
  for (const slug of ['pm25', 'sar-yield', 'ai-video']) {
    test(`/projects/${slug} opens that project's window`, async ({ page }) => {
      const problems = watchConsole(page)
      await boot(page, `/projects/${slug}`)

      await expect(windowFor(page, `project-${slug}`)).toBeVisible()
      expectCleanConsole(problems)
    })
  }

  test('puts the project links with the title, not below the write-up', async ({ page }) => {
    // They used to sit after every section, so reaching the demo meant scrolling past the whole
    // case study. Nothing here depends on window height: the assertion is the order in the flow
    // and that the buttons are inside the body's first screenful.
    await boot(page, '/projects/pm25')
    const body = windowFor(page, 'project-pm25').locator('[data-appbody="1"]')
    await expect(body.locator('a[data-btn]').first()).toBeVisible()

    const geometry = await body.evaluate((el) => {
      const link = el.querySelector('a[data-btn]')!.getBoundingClientRect()
      const heading = el.querySelector('h2')!.getBoundingClientRect()
      const firstSection = [...el.querySelectorAll('div')].find(
        (d) => getComputedStyle(d).textTransform === 'uppercase',
      )!.getBoundingClientRect()
      const box = el.getBoundingClientRect()
      return {
        afterTitle: link.top > heading.top,
        beforeSections: link.top < firstSection.top,
        inView: link.top >= box.top && link.bottom <= box.bottom,
        scrolled: el.scrollTop,
      }
    })

    expect(geometry).toEqual({ afterTitle: true, beforeSections: true, inView: true, scrolled: 0 })
  })

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

/**
 * The desk is a fixed workspace, not a page that grows.
 *
 * Two fixed columns filled top-to-bottom used to push the lower folders past the bottom of the
 * desk, and the fix before this one was to let that box scroll — which hides folders behind an
 * edge and is exactly what a desktop does not do. Rows now come from the measured height and
 * the columns are what grow, so this asserts the property that matters at four times the real
 * project count: every icon whole, on the desk, overlapping nothing.
 *
 * Extra tiles are cloned into the grid rather than published through the CMS. The layout is pure
 * CSS, so a cloned child is placed by the same rules a real one would be — and it lets the check
 * run against the shipped build with no fixture server.
 */
test.describe('the desk holds every project without scrolling', () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 1024, height: 640 },
  ]) {
    test(`reflows into columns at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      const problems = watchConsole(page)
      await page.setViewportSize(viewport)
      await boot(page)
      await expect(page.locator('#desktop-grid')).toBeVisible()

      for (const count of [0, 18]) {
        if (count) {
          await page.evaluate((n) => {
            const grid = document.getElementById('desktop-grid')!
            const source = grid.querySelector('[data-dsk]')!
            for (let i = 0; i < n; i++) {
              const clone = source.cloneNode(true) as HTMLElement
              clone.style.animation = 'none'
              clone.querySelector('[data-dsklabel]')!.textContent =
                i % 3 === 0 ? 'A Deliberately Long Project Title That Wraps' : `Mock Project ${i + 1}`
              grid.appendChild(clone)
            }
          }, count)
        }

        const geometry = await page.evaluate(() => {
          const grid = document.getElementById('desktop-grid')!
          const tiles = [...grid.querySelectorAll('[data-dsk]')].map((el) => el.getBoundingClientRect())
          const dock = document.getElementById('dock')!.getBoundingClientRect()
          const menubar = document.getElementById('menubar')!.getBoundingClientRect()

          let overlaps = 0
          for (let i = 0; i < tiles.length; i++) {
            for (let j = i + 1; j < tiles.length; j++) {
              const a = tiles[i]!
              const b = tiles[j]!
              if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps++
            }
          }

          return {
            tiles: tiles.length,
            rowsUsed: new Set(tiles.map((t) => Math.round(t.top))).size,
            trackRows: getComputedStyle(grid).gridTemplateRows.split(' ').length,
            offDesk: tiles.filter(
              (t) =>
                t.bottom > window.innerHeight ||
                t.left < 0 ||
                t.right > window.innerWidth ||
                t.top < menubar.bottom ||
                (t.bottom > dock.top && t.right > dock.left && t.left < dock.right),
            ).length,
            overlaps,
            scrolls: grid.scrollHeight > grid.clientHeight + 1,
            pageScrolls:
              document.documentElement.scrollHeight > document.documentElement.clientHeight,
          }
        })

        expect(geometry.offDesk, 'icons clipped by the viewport, menu bar or dock').toBe(0)
        expect(geometry.overlaps, 'icons overlapping each other').toBe(0)
        expect(geometry.scrolls, 'the desk grid scrolls instead of reflowing').toBe(false)
        expect(geometry.pageScrolls, 'the page itself scrolls').toBe(false)
        // Columns absorb the growth: the rows in use never exceed the tracks the height allows.
        expect(geometry.rowsUsed).toBeLessThanOrEqual(geometry.trackRows)
      }

      expectCleanConsole(problems)
    })
  }
})

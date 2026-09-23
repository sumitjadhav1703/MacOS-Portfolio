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

test('a menu-bar extra closes on the second click', async ({ page }) => {
  const problems = watchConsole(page)
  await boot(page)

  const status = page.locator('#menubar [aria-label^="Status"]')
  const popover = page.locator('#status-pop')

  await status.click()
  await expect(popover).toBeVisible()
  await status.click()
  await expect(popover).toBeHidden()

  // A different extra switches rather than stacking.
  await status.click()
  await page.locator('#menubar [aria-label^="Network"]').click()
  await expect(popover).toBeHidden()
  await expect(page.locator('#net-pop')).toBeVisible()

  expectCleanConsole(problems)
})

test('a click on the desk clears the selected icon', async ({ page }) => {
  const problems = watchConsole(page)
  await boot(page)

  const plate = page.locator('#desktop-grid [data-dsklabel][data-selected]')
  await page.locator('#desktop-grid [data-dsk]').first().click({ force: true })
  await expect(plate).toHaveCount(1)

  // The selection used to be component state inside DesktopGrid, which this click could not
  // reach — so the blue plate stayed on the icon for the life of the page.
  await page.locator('#wallpaper').click({ position: { x: 40, y: 300 } })
  await expect(plate).toHaveCount(0)

  expectCleanConsole(problems)
})

test('a Finder sidebar row fills the pane instead of opening a window', async ({ page }) => {
  const problems = watchConsole(page)
  await boot(page)
  await openFromDock(page, 'finder')

  const finder = windowFor(page, 'finder')
  await finder.locator('[data-side][aria-label="Skills"]').click()

  await expect(finder.locator('[data-appbody="1"]')).toBeVisible()
  await expect(finder.getByRole('heading', { name: 'Skills' })).toBeVisible()
  await expect(windowFor(page, 'skills')).toHaveCount(0)
  await expect(finder.locator('[data-tlgroup]').first()).toBeVisible()

  // Back to Projects, and the folder grid returns.
  await finder.locator('[data-side][aria-label="Projects"]').click()
  await expect(finder.locator('[data-folder]').first()).toBeVisible()

  expectCleanConsole(problems)
})

test('a minimised project window is reachable from the dock', async ({ page }) => {
  const problems = watchConsole(page)
  await boot(page)

  await page.locator('#desktop-grid [data-dsk]').first().dblclick()
  const id = await page.evaluate(
    () => document.querySelector('#wm [id^="win-project-"]')!.id.replace('win-', ''),
  )
  const window = page.locator(`#win-${id}`)
  await expect(window).toBeVisible()

  // Only eight apps have a dock icon and a project is never one of them, so minimising used
  // to leave nothing on screen to click: the window was unreachable, not merely hidden.
  await page.locator(`#win-${id} [aria-label^="Minimise"]`).click()
  const tile = page.locator(`#dock [data-min="${id}"]`)
  await expect(tile).toBeVisible()

  await tile.click()
  await expect(window).toBeVisible()
  await expect(tile).toHaveCount(0)

  expectCleanConsole(problems)
})

test('every menu-bar control answers the pointer', async ({ page }) => {
  const problems = watchConsole(page)
  await boot(page)

  // The app menus carried an inline `background: transparent`, which outranks a stylesheet
  // rule — so the hover plate in os.css had never once painted.
  // The apple menu is the one that is always in the bar; the app menus depend on what has
  // focus, and a bare boot has nothing focused.
  for (const selector of [
    '[data-menu="apple"]',
    '#menubar [aria-label^="Status"]',
    '#menubar [aria-label="Control Center"]',
    '#menubar [aria-label="Search"]',
    '#menubar [aria-label="Notification Center"]',
  ]) {
    const control = page.locator(selector)
    const rest = await control.evaluate((el) => getComputedStyle(el).backgroundColor)
    await control.hover()
    // The plate fades in over .14s, and a computed style read on the first frame still
    // returns the old value — measuring immediately says "no change" for a change that
    // is happening.
    await page.waitForTimeout(260)
    const hovered = await control.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(hovered, selector).not.toBe(rest)
    await page.mouse.move(700, 500)
  }

  expectCleanConsole(problems)
})

test('opens Project Interview through Spotlight, lazily, with answers from the project', async ({ page }) => {
  const problems = watchConsole(page)
  await boot(page)

  await page.keyboard.press('Meta+k')
  await page.locator('#spotlight-input').fill('Project Interview')
  await page.keyboard.press('Enter')

  const win = page.locator('#win-interview')
  await expect(win).toBeVisible()
  await win.getByRole('button', { name: 'Show answer' }).first().click()
  await expect(win.getByRole('button', { name: 'Hide answer' }).first()).toBeVisible()

  expectCleanConsole(problems)
})

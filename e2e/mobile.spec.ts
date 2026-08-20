// The stacked layout below 768px. Runs in the `mobile` project, at 390×844 — the size AGENTS.md
// names as the second viewport a human is asked to check.

import { expect, test } from '@playwright/test'
import { expectCleanConsole, watchConsole } from './helpers'

test('renders the stacked shell rather than the desktop', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/')

  await expect(page.locator('[data-mtile]').first()).toBeVisible()
  // The window manager is a desktop-only concept; the mobile shell replaces it outright.
  await expect(page.locator('#dock')).toBeHidden()

  expectCleanConsole(problems)
})

test('does not scroll sideways at 390px', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-mtile]').first()).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})

test('opens a project from a tile', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/')

  await page.locator('[data-mtile]').first().click()
  await expect(page.locator('[data-mrow], [data-mtile]').first()).toBeVisible()

  expectCleanConsole(problems)
})

test('a project deep link works on a phone too', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/projects/pm25')
  await expect(page.locator('body')).toBeVisible()
  expectCleanConsole(problems)
})

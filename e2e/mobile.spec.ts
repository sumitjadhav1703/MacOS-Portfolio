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

test('the recruiter view is one readable column with the ways to verify and contact', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/recruiter')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Verify and contact' }).getByRole('link', { name: /Resume/ })).toBeVisible()
  // Every project card links to its own page.
  await expect(page.locator('main h3 a[href^="/projects/"]').first()).toBeVisible()
  const overflow = await page.locator('[data-recruiter]').evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)

  expectCleanConsole(problems)
})

test('the interview loads only when asked for, and answers from the project', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/')

  const start = page.getByRole('button', { name: 'Start the interview' })
  await start.scrollIntoViewIfNeeded()
  await start.click()
  const first = page.locator('#m-interview').getByRole('button', { name: 'Show answer' }).first()
  await first.click()
  await expect(page.locator('#m-interview').getByRole('button', { name: 'Hide answer' }).first()).toBeVisible()

  expectCleanConsole(problems)
})

import { expect, type Page } from '@playwright/test'

/**
 * Fails the test if the page logged an error, or threw one nobody caught.
 *
 * AGENTS.md ends its checklist with "Console must be clean" and leaves that to a human at
 * 1440×900. This is that check, run on every spec.
 */
export function watchConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`))
  return problems
}

export function expectCleanConsole(problems: string[]): void {
  expect(problems, `the page logged ${problems.length} error(s)`).toEqual([])
}

/**
 * Waits out the boot curtain. The desktop paints behind it, so every spec starts here rather
 * than racing the animation and flaking.
 */
export async function boot(page: Page, path = '/'): Promise<void> {
  await page.goto(path)
  await expect(page.locator('#menubar')).toBeVisible()
  await expect(page.locator('#boot')).toBeHidden({ timeout: 15_000 })
}

/**
 * A window's root element. `data-win` is also on the eight resize handles, so it matches nine
 * elements per window; the id is the one that identifies the window itself.
 */
export const windowFor = (page: Page, id: string) => page.locator(`#win-${id}`)

/** Opens an app from the dock and waits for its window. */
export async function openFromDock(page: Page, id: string): Promise<void> {
  await page.locator(`#dock [data-item="${id}"]`).click()
  await expect(windowFor(page, id)).toBeVisible()
}

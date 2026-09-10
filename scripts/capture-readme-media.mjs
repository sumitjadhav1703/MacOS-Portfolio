// The stills and the demo GIF in the README, taken from a running site.
//
//   node scripts/capture-readme-media.mjs                       # the live site
//   node scripts/capture-readme-media.mjs http://localhost:3000  # a local one
//
// Committed rather than done by hand so the shots can be retaken after a UI change instead of
// slowly going stale. Writes .github/assets/{desktop.jpg,mobile.jpg,demo.gif}.
//
// Needs ffmpeg for the GIF: Playwright records webm, and a straight webm->gif conversion bands
// badly on a dark UI, so it runs the usual two passes — palettegen over the whole clip, then
// paletteuse with dithering.

import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, '.github', 'assets')
const scratch = join(root, '.playwright', 'readme-media')

const SITE = (process.argv[2] ?? 'https://mac-os-portfolio-self-nine.vercel.app').replace(/\/$/, '')
const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }

const kb = (file) => `${(statSync(file).size / 1024).toFixed(0)} kB`

/**
 * Waits until there is something worth photographing. The curtain goes first; what paints behind
 * it depends on the width — below 768px the desktop is replaced outright by the stacked shell,
 * which has no menu bar at all.
 */
async function booted(page, { mobile = false, path = '/' } = {}) {
  await page.goto(`${SITE}${path}`, { waitUntil: 'networkidle' })
  await page.locator('#boot').waitFor({ state: 'hidden', timeout: 30_000 })
  const ready = mobile ? page.locator('[data-mtile]').first() : page.locator('#menubar')
  await ready.waitFor({ state: 'visible', timeout: 30_000 })
}

const pause = (page, ms) => page.waitForTimeout(ms)

/**
 * Clears what a first visit puts on screen and a photograph should not keep: the keyboard hint
 * above the dock, and the toasts the Notification Center raises for every window that opens.
 * The toasts expire on their own, so this mostly waits.
 */
async function dismissHint(page) {
  const hint = page.getByRole('button', { name: 'Got it' })
  if (await hint.isVisible().catch(() => false)) await hint.click()
}

/** Waits for the Notification Center toasts to expire, which they do on their own. */
const toastsGone = (page) => pause(page, 6000)

/**
 * Opens the first project on the desk that has a cover image, falling back to the first one at
 * all. A project window with no cover is a large empty rectangle, which photographs as a bug.
 */
async function openBestProject(page) {
  // `data-win` sits on the eight resize handles too; the id is what identifies a window.
  const icons = page.locator('[data-dsk]')
  const count = Math.min(await icons.count(), 6)
  for (let i = 0; i < count; i++) {
    await icons.nth(i).dblclick()
    const win = page.locator('#wm [id^="win-"]').last()
    await win.waitFor({ state: 'visible' })
    await pause(page, 700)
    if ((await win.locator('img').count()) > 0) return
    if (i < count - 1) await win.getByRole('button', { name: /^Close/ }).click()
  }
}

// JPEG, not PNG. These are photographs of a UI built on layered gradients, where PNG spends
// megabytes encoding a smooth sky losslessly and nobody can see the difference in a README.
const SHOT = { type: 'jpeg', quality: 82 }

async function stills(browser) {
  const desktop = await browser.newPage({ viewport: DESKTOP, deviceScaleFactor: 2 })
  await booted(desktop)
  await dismissHint(desktop)
  // Opened the way a visitor opens it, and chosen from what the CMS currently holds — a
  // hardcoded slug photographs the "Not available" card the day that project is unpublished.
  await openBestProject(desktop)
  await toastsGone(desktop)
  await desktop.screenshot({ path: join(out, 'desktop.jpg'), ...SHOT })
  await desktop.close()

  const phone = await browser.newPage({ viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await booted(phone, { mobile: true })
  await pause(phone, 1200)
  await phone.screenshot({ path: join(out, 'mobile.jpg'), ...SHOT })
  await phone.close()
}

/** One scripted run through the parts of the desktop that only make sense moving. */
async function demo(browser) {
  rmSync(scratch, { recursive: true, force: true })
  const context = await browser.newContext({
    viewport: DESKTOP,
    recordVideo: { dir: scratch, size: DESKTOP },
  })
  const page = await context.newPage()

  await booted(page)
  await dismissHint(page)
  await pause(page, 500)

  await page.locator('#dock [data-item="launchpad"]').click()
  await page.locator('#launchpad').waitFor({ state: 'visible' })
  await pause(page, 900)
  await page.keyboard.press('Escape')
  await pause(page, 400)

  await page.locator('[data-dsk]').first().dblclick()
  await page.locator('#wm [id^="win-"]').last().waitFor({ state: 'visible' })
  await pause(page, 900)

  // Drag it, so the window manager is visibly a window manager.
  const bar = await page.locator('[data-titlebar]').first().boundingBox()
  if (bar) {
    await page.mouse.move(bar.x + bar.width / 2, bar.y + 8)
    await page.mouse.down()
    await page.mouse.move(bar.x + bar.width / 2 + 140, bar.y + 78, { steps: 20 })
    await page.mouse.up()
  }
  await pause(page, 700)

  await page.keyboard.press('Meta+k')
  await page.locator('#spotlight-input').waitFor({ state: 'visible' })
  await page.locator('#spotlight-input').type('pm', { delay: 160 })
  await pause(page, 1000)
  await page.keyboard.press('Escape')
  await pause(page, 500)

  await context.close() // flushes the video file
  const webm = readdirSync(scratch).find((f) => f.endsWith('.webm'))
  if (!webm) throw new Error('playwright wrote no video')
  return join(scratch, webm)
}

function gif(webm) {
  const palette = join(scratch, 'palette.png')
  const filters = 'fps=10,scale=760:-1:flags=lanczos'
  execFileSync('ffmpeg', ['-y', '-i', webm, '-vf', `${filters},palettegen=stats_mode=diff`, palette])
  execFileSync('ffmpeg', [
    '-y', '-i', webm, '-i', palette,
    '-lavfi', `${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
    join(scratch, 'demo.gif'),
  ])
  renameSync(join(scratch, 'demo.gif'), join(out, 'demo.gif'))
}

mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
try {
  await stills(browser)
  gif(await demo(browser))
} finally {
  await browser.close()
}
rmSync(scratch, { recursive: true, force: true })

for (const file of ['desktop.jpg', 'mobile.jpg', 'demo.gif']) {
  console.log(`capture: .github/assets/${file}  ${kb(join(out, file))}`)
}

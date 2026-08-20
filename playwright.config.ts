import { defineConfig, devices } from '@playwright/test'

// Chromium only, deliberately. This suite exists to catch the regressions no unit test can see —
// the desktop failing to boot, a window that will not open, a deep link that lands on nothing —
// not to prove cross-browser parity for a portfolio. A second engine would double the CI minutes
// and find almost nothing, and Safari's own behaviour is already noted in AGENTS.md as something
// a human checks.

const CI = !!process.env.CI

export default defineConfig({
  testDir: 'e2e',
  // The desktop suite and the admin suite need different servers, so each file starts from a
  // clean page rather than sharing state.
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    // Evidence only when something failed. A trace per passing test is megabytes of artifact
    // nobody reads, and spec §10 asks for failure evidence, not for the whole workspace.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: CI ? 'retain-on-failure' : 'off',
  },

  // The admin suite is not part of the default run. It needs a built SPA, a migrated local D1 and
  // a password, all of which scripts/e2e-admin.mjs creates — so it appears as a project only when
  // that script has set the environment up. `npx playwright test` on its own then means the
  // public suites, and cannot fail for want of a Worker nobody started.
  projects: [
    ...(process.env.E2E_ADMIN_PASSWORD
      ? [
          {
            name: 'admin',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
            testMatch: /admin\.spec\.ts/,
          },
        ]
      : []),
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testIgnore: /(mobile|admin)\.spec\.ts/,
    },
    {
      // A phone-sized chromium rather than `devices['iPhone 14 Pro']`, which is WebKit. The
      // breakpoint is what this suite tests, and 390×844 is the size AGENTS.md names; pulling in
      // a second engine to get it would cost a browser download for no extra coverage.
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: false,
        hasTouch: true,
      },
      testMatch: /mobile\.spec\.ts/,
    },
  ],

  // Only started for the public suites. The admin suite runs against wrangler and sets its own
  // E2E_BASE_URL, which this skips because reuseExistingServer sees the port already answering.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm start',
        url: 'http://localhost:3000',
        reuseExistingServer: !CI,
        timeout: 180_000,
      },
})

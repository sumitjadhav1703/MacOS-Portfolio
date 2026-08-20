import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Vitest's default include covers `*.spec.ts` too, which now means the Playwright suites in
    // e2e/ — those import @playwright/test and cannot run here. Naming the unit directories is
    // clearer than excluding one folder, and it keeps `npm test` meaning "the tests that need no
    // browser and no Worker".
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'worker/**/*.test.ts', 'scripts/**/*.test.mjs'],
    exclude: ['**/node_modules/**', 'e2e/**', 'legacy/**', '.next/**'],
  },
})

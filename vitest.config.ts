import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The OAuth provider imports `cloudflare:workers`, a module only workerd has. Inline it so the
  // alias reaches its import, and point the alias at a stub.
  resolve: {
    alias: { 'cloudflare:workers': new URL('./worker/cloudflare-workers.stub.ts', import.meta.url).pathname },
  },
  test: {
    server: { deps: { inline: ['@cloudflare/workers-oauth-provider'] } },
    // Vitest's default include covers `*.spec.ts` too, which now means the Playwright suites in
    // e2e/ — those import @playwright/test and cannot run here. Naming the unit directories is
    // clearer than excluding one folder, and it keeps `npm test` meaning "the tests that need no
    // browser and no Worker".
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'worker/**/*.test.ts', 'scripts/**/*.test.mjs'],
    exclude: ['**/node_modules/**', 'e2e/**', 'legacy/**', '.next/**'],
  },
})

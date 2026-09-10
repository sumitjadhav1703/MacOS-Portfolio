import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

// The public origin the admin's Preview links point at. Read from wrangler.jsonc, which already
// holds it as the Worker's CORS allowlist, so there is one value to change rather than three that
// drift. Line comments only, which is all that file uses; strings are left alone.
const wrangler = JSON.parse(
  readFileSync(resolve(here, '../../wrangler.jsonc'), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/([^:"])\/\/.*$/gm, '$1'),
) as { vars?: { SITE_ORIGIN?: string } }

// Builds the admin into worker/assets, which wrangler.jsonc serves as the Worker's static
// assets. Entirely separate from the Next build, so nothing here reaches the public bundle.
export default defineConfig({
  root: here,
  plugins: [react()],
  define: {
    __SITE_ORIGIN__: JSON.stringify(wrangler.vars?.SITE_ORIGIN ?? ''),
  },
  build: {
    outDir: resolve(here, '../assets'),
    emptyOutDir: true,
    // The whole admin is one screen behind a login; splitting it would only add round trips.
    chunkSizeWarningLimit: 1200,
  },
})

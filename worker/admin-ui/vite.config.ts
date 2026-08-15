import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

// Builds the admin into worker/assets, which wrangler.jsonc serves as the Worker's static
// assets. Entirely separate from the Next build, so nothing here reaches the public bundle.
export default defineConfig({
  root: here,
  plugins: [react()],
  build: {
    outDir: resolve(here, '../assets'),
    emptyOutDir: true,
    // The whole admin is one screen behind a login; splitting it would only add round trips.
    chunkSizeWarningLimit: 1200,
  },
})

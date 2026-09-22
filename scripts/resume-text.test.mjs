// The admin's PDF → text step, run against the real packaged resume. In scripts/ because it
// reads a file with node:fs, which neither the Worker's nor the admin's tsconfig can see.

import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { MAX_RESUME_TEXT, pdfText } from '../worker/admin-ui/pdfText.ts'
import { resumeSections } from '../worker/mcp/retrieval.ts'

const pdf = readFileSync(new URL('../public/Sumit_Jadhav_Resume.pdf', import.meta.url))

it('reads the packaged resume into text Sumit Context can split into sections', async () => {
  const text = await pdfText(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength))
  expect(text.length).toBeGreaterThan(500)
  expect(text.length).toBeLessThanOrEqual(MAX_RESUME_TEXT)
  const slugs = resumeSections(text).map((s) => s.slug)
  expect(slugs[0]).toBe('contact')
  expect(slugs).toEqual(expect.arrayContaining(['education', 'projects']))
})

it('rejects a file that is not a PDF', async () => {
  await expect(pdfText(new TextEncoder().encode('not a pdf').buffer)).rejects.toThrow()
})

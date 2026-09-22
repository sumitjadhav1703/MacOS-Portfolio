// A PDF's text, read in the admin's browser.
//
// Done here rather than in the Worker on purpose: a free-plan Worker request gets 10 ms of CPU and
// parsing a resume takes 20–100 ms. The browser has no such ceiling, and the owner is sitting in
// front of it at the one moment the file changes.

/** Longer than any resume; the server rejects more (worker/tables.ts). */
export const MAX_RESUME_TEXT = 20_000

export async function pdfText(bytes: ArrayBuffer): Promise<string> {
  // Its own chunk: pdf.js is large and only this screen needs it.
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const { text } = await extractText(pdf, { mergePages: true })
  return text.trim().slice(0, MAX_RESUME_TEXT)
}

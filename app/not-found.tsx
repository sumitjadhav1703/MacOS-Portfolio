'use client'

import { useEffect, useState } from 'react'
import { s } from '../src/os/css'

// Every unknown path lands here, and so does /projects/<slug> for a slug that does not exist
// (that page calls notFound()). It names the path that missed and offers the two real entry
// points, on the same shell /recruiter uses, without booting the desktop. The page is prerendered
// once for every path, so the path is read after mount — rendered on the server it would be the
// prerender's own path and fail hydration.

const BUTTON = 'display:inline-block;padding:9px 16px;border-radius:10px;font-weight:600;font-size:13.5px;text-decoration:none'

export default function NotFound() {
  const [path, setPath] = useState('')
  useEffect(() => setPath(window.location.pathname), [])
  return (
    <div
      data-root=""
      style={s(
        "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:var(--s-desk);color:var(--s-text);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,system-ui,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased",
      )}
    >
      <main style={s('max-width:460px;width:100%;text-align:center;padding:36px 28px;border-radius:18px;background:var(--s-win);border:1px solid var(--s-line)')}>
        <div style={s('font-size:64px;font-weight:800;letter-spacing:-.04em;line-height:1;color:var(--s-accent)')}>404</div>
        <h1 style={s('margin:14px 0 6px;font-size:20px;letter-spacing:-.01em')}>Wrong turn</h1>
        <p style={s('margin:0;color:var(--s-dim);font-size:14px;line-height:1.55;overflow-wrap:anywhere')}>
          {path ? <code style={s('padding:1px 6px;border-radius:6px;background:var(--s-fill-2);color:var(--s-text)')}>{path}</code> : 'This'}{' '}
          isn’t a page on this site.
        </p>
        <div style={s('display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px')}>
          <a href="/" style={s(`${BUTTON};background:var(--s-accent);color:#fff`)}>
            ← Go to the desktop
          </a>
          <a href="/recruiter" style={s(`${BUTTON};background:var(--s-fill-2);border:1px solid var(--s-line);color:var(--s-text)`)}>
            Recruiter view
          </a>
        </div>
      </main>
    </div>
  )
}

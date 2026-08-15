import { useState } from 'react'
import { useContent } from '../content'
import { s } from '../css'

const STEP = 'width:24px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:14px;cursor:default'
const TOOL = 'padding:6px 12px;border-radius:8px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12px;text-decoration:none;color:var(--s-text);cursor:default'

export function Resume() {
  const resumeUrl = useContent().site.resumeUrl
  // null = fit width; a number is a percentage zoom, both passed to the PDF viewer.
  const [zoom, setZoom] = useState<number | null>(null)
  const fragment = zoom === null ? 'view=FitH' : `zoom=${zoom}`

  return (
    <div style={s('height:100%;display:flex;flex-direction:column')}>
      <div
        style={s(
          'flex:none;display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--s-line);background:var(--s-chrome)',
        )}
      >
        <div style={s('font-size:12.5px;font-weight:600')}>Sumit_Jadhav_Resume.pdf</div>
        <div style={s('flex:1')} />
        <div
          style={s(
            'display:flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:var(--s-fill);border:1px solid var(--s-line)',
          )}
        >
          <span
            data-side="1"
            tabIndex={0}
            data-focusable="1"
            role="button"
            aria-label="Zoom out"
            style={s(STEP)}
            onClick={() => setZoom((z) => Math.max(50, (z ?? 100) - 25))}
          >
            −
          </span>
          <span
            id="res-zoom"
            style={s(
              'min-width:44px;text-align:center;font-size:11.5px;font-variant-numeric:tabular-nums;color:var(--s-dim)',
            )}
          >
            {zoom === null ? 'Fit' : `${zoom}%`}
          </span>
          <span
            data-side="1"
            tabIndex={0}
            data-focusable="1"
            role="button"
            aria-label="Zoom in"
            style={s(STEP)}
            onClick={() => setZoom((z) => Math.min(200, (z ?? 100) + 25))}
          >
            +
          </span>
        </div>
        <span
          data-side="1"
          tabIndex={0}
          data-focusable="1"
          role="button"
          style={s(
            'padding:6px 11px;border-radius:8px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12px;cursor:default',
          )}
          onClick={() => setZoom(null)}
        >
          Fit width
        </span>
        <span style={s('width:1px;height:20px;background:var(--s-line);margin:0 2px')} />
        <a href={resumeUrl} target="_blank" rel="noopener noreferrer" data-side="1" style={s(TOOL)}>
          Open in new tab
        </a>
        <a href={resumeUrl} download="Sumit_Jadhav_Resume.pdf" data-side="1" style={s(TOOL)}>
          Download
        </a>
      </div>

      <div style={s('flex:1;position:relative;background:var(--s-paper-desk)')}>
        <object
          key={fragment}
          data={`${resumeUrl}#${fragment}`}
          type="application/pdf"
          style={s('position:absolute;inset:0;width:100%;height:100%;border:0')}
        >
          <ResumeFallback />
        </object>
      </div>
    </div>
  )
}

/** Shown when the browser refuses to display PDFs inline. */
function ResumeFallback() {
  return (
    <div style={s('position:absolute;inset:0;overflow:auto;padding:26px;display:flex;justify-content:center')}>
      <div
        style={s(
          'width:100%;max-width:660px;height:max-content;background:var(--s-paper);color:var(--s-paper-ink);padding:44px 46px;box-shadow:0 20px 50px rgba(0,0,0,.4);font-size:12.5px;line-height:1.65',
        )}
      >
        <div style={s('font-size:24px;font-weight:700;letter-spacing:-.01em')}>Sumit Jadhav</div>
        <div style={s('color:#4a4f57;margin-top:4px')}>
          AI &amp; Data Science · Chhatrapati Sambhajinagar, Maharashtra · jadhavsumit534@gmail.com
        </div>
        <div style={s('height:1px;background:#d8dbe0;margin:18px 0')} />
        <div style={s('font-weight:700;margin-bottom:6px')}>Education</div>
        <div>
          B.Tech, AI &amp; Data Science — MGM's Jawaharlal Nehru Engineering College, MGM University
          (third year, lateral entry)
        </div>
        <div>Diploma in Computer Engineering</div>
        <div style={s('font-weight:700;margin:16px 0 6px')}>Focus</div>
        <div>Generative AI, RAG systems, applied deep learning.</div>
        <div style={s('font-weight:700;margin:16px 0 6px')}>Selected projects</div>
        <div>
          Lazarus Sentinel · AI Video Assistant · PM2.5 Forecasting · SAR Crop Mapping · Multi-Agent
          Research System · NYC Airbnb Room Type Classification
        </div>
        <div style={s('font-weight:700;margin:16px 0 6px')}>Links</div>
        <div>
          github.com/sumitjadhav1703 · kaggle.com/sumit1703 · huggingface.co/sumit1703 ·
          linkedin.com/in/sumit-jadhav-1703s
        </div>
        <div style={s('margin-top:20px;color:#6a7078;font-size:11.5px')}>
          Your browser could not display the PDF inline. Use Download above for the full document.
        </div>
      </div>
    </div>
  )
}

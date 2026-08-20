// The resume, on its own screen.
//
// The order matters and is the whole point of the screen: the file is stored in R2 and confirmed
// first, and only then does the profile row start pointing at it. Nothing removes the previous
// PDF — it stays in Assets, so a replacement that turns out to be the wrong file is one click of
// Attach away from being undone (spec §23).

import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { ASSETS, useAdmin } from './store'
import { relative } from './filters'
import { Banner, Button, CARD, StatusBadge, useAction } from './ui'
import { s } from '../../src/os/css'

/** Mirrors RESUME_FILE in src/data/sections.ts — what the site serves until one is uploaded. */
const PACKAGED = 'the PDF packaged with the site'

export function Resume() {
  const { assets, ensure, refresh } = useAdmin()
  const [key, setKey] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'uploading' | 'saving' | 'done'>('idle')
  const [notice, setNotice] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const { error, run } = useAction()

  useEffect(() => ensure(ASSETS), [ensure])

  useEffect(() => {
    run(async () => {
      const site = await api.singleton('site')
      setKey(typeof site?.resume_key === 'string' && site.resume_key ? site.resume_key : null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const asset = (assets ?? []).find((a) => a.key === key)
  const href = key ? `/files/${key}` : ''

  const replace = async (file: File | undefined) => {
    if (!file) return
    setNotice(null)
    setStep('uploading')
    let uploaded: { key: string } | null = null
    const stored = await run(async () => void (uploaded = await api.upload(file, 'resume')))
    if (input.current) input.current.value = ''
    if (!stored || !uploaded) {
      setStep('idle')
      return
    }
    // Only now that R2 has answered does the database learn about it.
    setStep('saving')
    const next = (uploaded as { key: string }).key
    if (!(await run(() => api.saveSingleton('site', { resume_key: next })))) {
      setStep('idle')
      setNotice('The file uploaded, but the profile was not updated. Try Replace again.')
      return
    }
    setKey(next)
    setStep('done')
    setNotice('Resume replaced. The previous file is still in Assets, in case you want it back.')
    await refresh(ASSETS)
  }

  const busy = step === 'uploading' || step === 'saving'

  return (
    <div>
      <h1 style={s('margin:0 0 16px;font-size:16px')}>Resume</h1>
      {error ? <Banner tone="error">{error.message}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      <div style={s(CARD)}>
        <div style={s('display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap')}>
          <div style={s('flex:1;min-width:200px')}>
            <div style={s('display:flex;gap:8px;align-items:center;flex-wrap:wrap')}>
              <span style={s('font-size:13px')}>
                {asset?.filename ?? (key ? key.split('/').pop() : 'No resume uploaded')}
              </span>
              {key ? <StatusBadge tone="live">Live</StatusBadge> : <StatusBadge tone="quiet">Packaged copy</StatusBadge>}
            </div>
            <div style={s('font-size:11px;color:var(--s-faint);margin-top:5px')}>
              {key
                ? `${asset ? `${Math.max(1, Math.round(asset.size / 1024))} KB · ` : ''}uploaded ${relative(asset?.created_at)}`
                : `Visitors are being served ${PACKAGED}. Uploading one replaces it everywhere the resume is offered.`}
            </div>
            <div role="status" aria-live="polite" style={s('font-size:11px;color:var(--s-faint);margin-top:5px')}>
              {step === 'uploading'
                ? 'Uploading to storage…'
                : step === 'saving'
                  ? 'Stored. Pointing the profile at it…'
                  : ''}
            </div>
          </div>

          <div style={s('display:flex;gap:8px;flex-wrap:wrap')}>
            {key ? (
              <>
                <a href={href} target="_blank" rel="noreferrer" style={s('font-size:12px;align-self:center')}>
                  Preview
                </a>
                <a href={href} download style={s('font-size:12px;align-self:center')}>
                  Download
                </a>
              </>
            ) : null}
            <Button tone="accent" onClick={() => input.current?.click()} disabled={busy}>
              {busy ? 'Working…' : key ? 'Replace' : 'Upload'}
            </Button>
            <input
              ref={input}
              type="file"
              accept="application/pdf"
              aria-label="Choose a PDF to upload"
              style={s('display:none')}
              onChange={(e) => replace(e.target.files?.[0])}
            />
          </div>
        </div>
      </div>

      <p style={s('font-size:11px;color:var(--s-faint);margin-top:12px')}>
        PDF only — the file's own leading bytes are checked, so renaming something to .pdf will not
        get it in. The old file is never deleted here; remove it from Assets when you are sure.
      </p>
    </div>
  )
}

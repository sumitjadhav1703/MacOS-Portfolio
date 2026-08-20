// Every file the CMS has stored, and what is still using it.
//
// The "used by" list comes from the same reverse index the Worker consults before allowing a
// delete, so what this screen shows and what the server will permit are one answer, not two
// (spec §30, §34).

import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import type { Asset } from './api'
import { ASSETS, useAdmin } from './store'
import { relative } from './filters'
import { Banner, Button, CARD, Confirm, Select, StatusBadge, Thumb, useAction } from './ui'
import { s } from '../../src/os/css'

type Filter = 'all' | 'images' | 'pdfs' | 'used' | 'unused'

const isImage = (asset: Asset) => asset.content_type.startsWith('image/')
const size = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

function keep(asset: Asset, filter: Filter): boolean {
  switch (filter) {
    case 'images':
      return isImage(asset)
    case 'pdfs':
      return asset.content_type === 'application/pdf'
    case 'used':
      return !!asset.usedBy?.length
    case 'unused':
      return !asset.usedBy?.length
    default:
      return true
  }
}

export function Assets() {
  const { assets, ensure, refresh } = useAdmin()
  const [confirming, setConfirming] = useState<Asset | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [kind, setKind] = useState('misc')
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const { error, run } = useAction()

  useEffect(() => ensure(ASSETS), [ensure])

  const items = assets ?? []
  const shown = useMemo(() => items.filter((asset) => keep(asset, filter)), [items, filter])

  const remove = async (asset: Asset) => {
    setConfirming(null)
    if (await run(() => api.deleteAsset(asset.key))) setNotice(`Deleted ${asset.filename}.`)
    await refresh(ASSETS)
  }

  const upload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setNotice(null)
    const ok = await run(() => api.upload(file, kind))
    setUploading(false)
    if (input.current) input.current.value = ''
    if (!ok) return
    setNotice(`Uploaded ${file.name}. Attach it from the editor that needs it.`)
    await refresh(ASSETS)
  }

  return (
    <div>
      <div style={s('display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap')}>
        <h1 style={s('margin:0;font-size:16px')}>Assets</h1>
        <div style={s('display:flex;gap:8px;align-items:center;flex-wrap:wrap')}>
          <Select
            value={kind}
            aria-label="Upload category"
            style={s('width:auto')}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="misc">Misc</option>
            <option value="projects">Project cover</option>
            <option value="certificates">Certificate</option>
            <option value="profile">Profile</option>
          </Select>
          <Button tone="accent" onClick={() => input.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload a file'}
          </Button>
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            aria-label="Choose a file to upload"
            style={s('display:none')}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>
      </div>

      {error ? <Banner tone="error">{error.message}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      <div style={s('display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap')}>
        <Select
          value={filter}
          aria-label="Filter files"
          style={s('width:auto')}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          <option value="all">All files</option>
          <option value="images">Images</option>
          <option value="pdfs">PDFs</option>
          <option value="used">In use</option>
          <option value="unused">Not used</option>
        </Select>
        <span style={s('font-size:11px;color:var(--s-faint);align-self:center')}>
          PDF, PNG, JPEG and WebP, up to 8 MB. The file type is read from the file itself.
        </span>
      </div>

      <div style={s(CARD + ';padding:0;overflow:hidden')}>
        {items.length === 0 ? (
          <div style={s('padding:24px;color:var(--s-faint);font-size:13px')}>No files uploaded.</div>
        ) : null}
        {items.length > 0 && shown.length === 0 ? (
          <div style={s('padding:24px;color:var(--s-faint);font-size:13px')}>Nothing matches that filter.</div>
        ) : null}
        {shown.map((asset, i) => (
          <div
            key={asset.key}
            style={s(
              'display:flex;align-items:flex-start;gap:12px;padding:12px 16px;flex-wrap:wrap;' +
                (i ? 'border-top:1px solid var(--s-line)' : ''),
            )}
          >
            <Thumb src={isImage(asset) ? `/files/${asset.key}` : undefined} alt="" />
            <div style={s('flex:1;min-width:180px')}>
              <a href={`/files/${asset.key}`} target="_blank" rel="noreferrer" style={s('font-size:13px')}>
                {asset.filename}
              </a>
              <div style={s('font-size:11px;color:var(--s-faint);margin-top:3px')}>
                {asset.kind} · {asset.content_type} · {size(asset.size)} · added{' '}
                {relative(asset.created_at)}
              </div>
              <div style={s('margin-top:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap')}>
                {asset.usedBy?.length ? (
                  <>
                    <StatusBadge tone="live">In use</StatusBadge>
                    <span style={s('font-size:11px;color:var(--s-faint)')}>
                      used by {asset.usedBy.join(', ')}
                    </span>
                  </>
                ) : (
                  <StatusBadge tone="quiet">Not used</StatusBadge>
                )}
              </div>
            </div>
            <Button
              tone="danger"
              onClick={() => setConfirming(asset)}
              disabled={!!asset.usedBy?.length}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>

      {confirming ? (
        <Confirm
          title={`Delete ${confirming.filename}?`}
          message="Nothing points at this file. Deleting removes it from storage for good."
          onCancel={() => setConfirming(null)}
          onConfirm={() => remove(confirming)}
        />
      ) : null}
    </div>
  )
}

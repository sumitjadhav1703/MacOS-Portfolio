'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { s } from '../css'
import { DEFAULT_WALLPAPER, useDispatch, useOs } from '../store'
import { brightnessFilter, useTheme } from '../useTheme'

/**
 * Desk surface: the pack's gradient, with an optional image on top.
 *
 * The original filled this slot with the `<image-slot>` web component, which persisted the
 * dropped file through the Claude Design runtime's sidecar file. Outside that runtime the
 * equivalent is a data URL in localStorage — same drop-to-fill interaction, same
 * persistence across reloads, no runtime dependency.
 */
export function Wallpaper() {
  const { wallpaper, prefs } = useOs()
  const dispatch = useDispatch()
  const { theme, pack } = useTheme()
  const [picking, setPicking] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const readFile = useCallback(
    (file: File | undefined) => {
      if (!file || !file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => {
        dispatch({ type: 'wallpaper', url: String(reader.result) })
        dispatch({ type: 'notify', title: 'Desktop', msg: 'Wallpaper updated' })
        setPicking(false)
      }
      reader.readAsDataURL(file)
    },
    [dispatch],
  )

  // The picker is opened from Settings / the desk menu via this custom event, which keeps
  // the wallpaper's file handling in one place instead of threading it through the store.
  useEffect(() => {
    const onPick = () => setPicking(true)
    window.addEventListener('os:pickwall', onPick)
    return () => window.removeEventListener('os:pickwall', onPick)
  }, [])

  return (
    <>
      <div
        id="wallpaper"
        style={{
          ...s(
            'position:absolute;inset:0;background-color:var(--s-desk);transition:background-image .5s ease,background-color .5s ease',
          ),
          backgroundImage: pack.wall[theme],
          filter: brightnessFilter(prefs),
        }}
        onDragOver={(e) => {
          if (!picking) return
          e.preventDefault()
        }}
        onDrop={(e) => {
          if (!picking) return
          e.preventDefault()
          readFile(e.dataTransfer.files[0])
        }}
        onClick={() => picking && fileInput.current?.click()}
      >
        <div
          id="wall-slot-wrap"
          style={{
            ...s('position:absolute;inset:0;transition:opacity .35s ease'),
            opacity: wallpaper ? 1 : 0,
            pointerEvents: 'none',
          }}
        >
          {wallpaper ? (
            <img
              src={wallpaper}
              alt=""
              style={s('width:100%;height:100%;object-fit:cover;display:block')}
            />
          ) : null}
        </div>
      </div>

      <div
        id="wall-pick-bar"
        style={{
          ...s(
            'position:absolute;left:50%;top:44px;transform:translateX(-50%);z-index:400;padding:8px 14px;border-radius:10px;background:rgba(24,26,30,.94);backdrop-filter:blur(18px);border:1px solid var(--s-fill-2);box-shadow:0 16px 38px rgba(0,0,0,.5);font-size:12.5px;align-items:center;gap:12px;color:#f2f3f5',
          ),
          display: picking ? 'flex' : 'none',
        }}
      >
        Drop an image on the desktop, or click to browse
        <span
          data-btn="1"
          style={s(
            'padding:3px 10px;border-radius:6px;background:var(--s-fill-2);cursor:default;font-weight:600',
          )}
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'wallpaper', url: DEFAULT_WALLPAPER })
          }}
        >
          Reset
        </span>
        <span
          data-btn="1"
          style={s(
            'padding:3px 10px;border-radius:6px;background:#3a6df0;cursor:default;font-weight:600;color:#fff',
          )}
          onClick={(e) => {
            e.stopPropagation()
            setPicking(false)
          }}
        >
          Done
        </span>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => readFile(e.target.files?.[0])}
      />

      <div
        id="desk-vignette"
        style={{
          ...s(
            'position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.5) 0%,rgba(0,0,0,0) 15%,rgba(0,0,0,0) 74%,rgba(0,0,0,.45) 100%);pointer-events:none;transition:opacity .5s ease',
          ),
          opacity: theme === 'light' ? 0.35 : 1,
        }}
      />
    </>
  )
}

/** Ask the desktop to enter wallpaper-picking mode. */
export const pickWallpaper = () => window.dispatchEvent(new Event('os:pickwall'))

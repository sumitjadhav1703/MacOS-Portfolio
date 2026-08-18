'use client'

import { Fragment, useState } from 'react'
import { s } from '../css'
import { useDispatch } from '../store'
import { useAppCommand } from '../cmd'

import { SOURCES } from '../../generated/sources'

const FILES = SOURCES

const HL = { kw: '#c191f0', str: '#8fd0a0', num: '#e0a879', com: '#6e7681' }

const TOKEN =
  /(\/\/[^\n]*)|('(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|if|else|for|new|null|true|false|this|of|in|type|import|export|from|interface|as|case|switch|default|await|async)\b|\b(\d+(?:\.\d+)?)\b/g

/** Same token classes as the original highlighter, emitting elements instead of HTML. */
function highlight(src: string) {
  const out: React.ReactNode[] = []
  let last = 0
  let key = 0
  for (const m of src.matchAll(TOKEN)) {
    const [text, comment, string, keyword] = m
    const at = m.index
    if (at > last) out.push(<Fragment key={key++}>{src.slice(last, at)}</Fragment>)
    const color = comment ? HL.com : string ? HL.str : keyword ? HL.kw : HL.num
    out.push(
      <span key={key++} style={{ color }}>
        {text}
      </span>,
    )
    last = at + text.length
  }
  if (last < src.length) out.push(<Fragment key={key++}>{src.slice(last)}</Fragment>)
  return out
}

export function CodeViewer() {
  const dispatch = useDispatch()
  const [file, setFile] = useState(FILES[0][0])
  const src = FILES.find(([name]) => name === file)?.[1] ?? ''
  const lines = src.split('\n')

  const copy = () => {
    navigator.clipboard?.writeText(src)
    dispatch({ type: 'notify', title: 'Code', msg: `${file} copied to clipboard` })
  }

  const step = (by: number) => {
    const at = FILES.findIndex(([name]) => name === file)
    setFile(FILES[(at + by + FILES.length) % FILES.length][0])
  }

  useAppCommand('code', (cmd) => {
    if (cmd === 'copy') copy()
    if (cmd === 'next') step(1)
    if (cmd === 'prev') step(-1)
  })

  return (
    <div
      style={s(
        'display:flex;height:100%;background:var(--s-term-bg);--s-text:#e6eaf0;--s-dim:rgba(215,222,232,.62);--s-faint:rgba(215,222,232,.42);--s-side:rgba(255,255,255,.04);--s-fill-2:rgba(255,255,255,.09);--s-fill-3:rgba(255,255,255,.15);--s-line:rgba(255,255,255,.1);--s-chrome:rgba(255,255,255,.05);color:#d5dae2',
      )}
    >
      <div
        style={s(
          'width:206px;flex:none;border-right:1px solid var(--s-line);background:var(--s-side);padding:10px 8px;overflow:auto',
        )}
      >
        <div
          style={s(
            'font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--s-faint);padding:6px 9px 8px',
          )}
        >
          This desktop
        </div>
        {FILES.map(([name]) => (
          <div
            key={name}
            data-side="1"
            tabIndex={0}
            data-focusable="1"
            role="button"
            onClick={() => setFile(name)}
            style={{
              ...s(
                'display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:7px;font-size:12px;cursor:default;font-family:ui-monospace,Menlo,monospace',
              ),
              background: name === file ? 'var(--s-fill-2)' : 'transparent',
            }}
          >
            {name}
          </div>
        ))}
        <div style={s('color:var(--s-faint);font-size:11.5px;padding:14px 9px 0;line-height:1.5')}>
          Real sources from the code running this page.
        </div>
      </div>

      <div style={s('flex:1;display:flex;flex-direction:column;min-width:0')}>
        <div
          style={s(
            'flex:none;display:flex;align-items:center;gap:8px;padding:0 10px;height:36px;border-bottom:1px solid var(--s-line);background:var(--s-chrome)',
          )}
        >
          <div
            style={s(
              'padding:5px 11px;border-radius:7px;background:var(--s-fill-2);font-size:12px;font-family:ui-monospace,Menlo,monospace',
            )}
          >
            {file}
          </div>
          <div style={s('flex:1')} />
          <span style={s('font-size:11.5px;color:var(--s-faint)')}>{lines.length} lines</span>
          <span
            data-side="1"
            tabIndex={0}
            data-focusable="1"
            role="button"
            onClick={copy}
            style={s(
              'padding:5px 12px;border-radius:7px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12px;cursor:default',
            )}
          >
            Copy
          </span>
        </div>

        <div
          style={s(
            'flex:1;overflow:auto;display:flex;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.65',
          )}
        >
          <pre
            style={s(
              'margin:0;padding:16px 10px 24px 16px;color:rgba(160,167,178,.5);text-align:right;user-select:none;flex:none',
            )}
          >
            {lines.map((_, i) => i + 1).join('\n')}
          </pre>
          <pre style={s('margin:0;padding:16px 20px 24px 6px;color:#d5dae2;white-space:pre;flex:1')}>
            {highlight(src)}
          </pre>
        </div>
      </div>
    </div>
  )
}

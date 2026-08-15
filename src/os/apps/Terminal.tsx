import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NEOFETCH_ART, NEOFETCH_ROWS, PROJ_ALIAS, TERM } from '../../data/os'
import { s } from '../css'
import { TITLES, isAppId } from '../registry'
import { useOpenApp } from '../store'

type Line = { kind: 'cmd' | 'out'; content: ReactNode }

const OPENABLE = ['skills', 'education', 'experience', 'resume', 'contact', 'settings'] as const

function Neofetch() {
  return (
    <div style={s('display:flex;gap:18px;align-items:flex-start')}>
      <pre style={s('margin:0;color:var(--s-dim);line-height:1.25')}>{NEOFETCH_ART}</pre>
      <div>
        <div>
          <span style={s('color:var(--s-ok)')}>sumit</span>@
          <span style={s('color:var(--s-ok)')}>portfolio</span>
        </div>
        {NEOFETCH_ROWS.map(([label, value]) => (
          <div key={label}>
            {label}: {value}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Terminal() {
  const openApp = useOpenApp()
  const [lines, setLines] = useState<Line[]>([
    {
      kind: 'out',
      content: (
        <span style={s('color:var(--s-dim)')}>
          Sumit's Portfolio OS — type <span style={s('color:var(--s-ok)')}>help</span> for commands.
        </span>
      ),
    },
  ])
  const [value, setValue] = useState('')
  const outRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const out = outRef.current
    if (out) out.scrollTop = out.scrollHeight
  }, [lines])

  function run(raw: string) {
    const cmd = raw.trim()
    const low = cmd.toLowerCase()

    if (low === 'clear') {
      setLines([])
      return
    }

    const echo: Line = {
      kind: 'cmd',
      content: (
        <span style={s('color:var(--s-faint)')}>
          sumit@portfolio ~ % <span style={s('color:var(--s-ok)')}>{cmd}</span>
        </span>
      ),
    }

    let result: ReactNode = null
    if (!cmd) {
      // A bare Enter just echoes the prompt, as in the original.
    } else if (low === 'neofetch') {
      result = <Neofetch />
    } else if (TERM[low]) {
      result = TERM[low]
    } else if (low.startsWith('project ')) {
      const key = PROJ_ALIAS[low.slice(8).trim()]
      if (key) {
        openApp(key)
        result = `Opening ${TITLES[key]}…`
      } else {
        result = 'Unknown project. Try: projects'
      }
    } else if (low.startsWith('open ')) {
      const key = low.slice(5).trim()
      if (isAppId(key)) {
        openApp(key)
        result = `Opening ${TITLES[key]}…`
      } else {
        result = 'No such app.'
      }
    } else if ((OPENABLE as readonly string[]).includes(low)) {
      const key = low as (typeof OPENABLE)[number]
      openApp(key)
      result = `Opening ${TITLES[key]}…`
    } else {
      result = `command not found: ${low} — type help`
    }

    setLines((prev) => [
      ...prev,
      echo,
      ...(result ? [{ kind: 'out' as const, content: result }] : []),
    ])
  }

  return (
    <div
      style={s(
        'height:100%;display:flex;flex-direction:column;background:var(--s-term-bg);--s-ok:#8fd0a0;--s-text:#e6eaf0;--s-dim:rgba(215,222,232,.62);--s-faint:rgba(215,222,232,.42);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;color:#8fd0a0;padding:16px 18px',
      )}
      onClick={() => inputRef.current?.focus()}
    >
      <div id="term-out" ref={outRef} style={s('flex:1;overflow:auto;line-height:1.65')}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={
              line.kind === 'out'
                ? s('color:var(--s-text);margin-bottom:8px')
                : s('color:var(--s-faint)')
            }
          >
            {line.content}
          </div>
        ))}
        <div style={s('height:8px')} />
      </div>
      <div style={s('display:flex;align-items:center;gap:8px;padding-top:8px')}>
        <span style={s('color:var(--s-faint)')}>sumit@portfolio ~ %</span>
        <input
          id="term-in"
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          aria-label="Shell command"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            run(value)
            setValue('')
          }}
          style={s(
            'flex:1;background:transparent;border:none;outline:none;color:var(--s-ok);font-family:inherit;font-size:12.5px',
          )}
        />
      </div>
    </div>
  )
}

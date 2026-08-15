import { useEffect, useRef, useState, type ReactNode } from 'react'
import { projectAliases } from '../../data/content'
import { useContent } from '../content'
import { s } from '../css'
import { isAppId, titleOf } from '../registry'
import { useOpenApp } from '../store'
import type { AppId } from '../types'

type Line = { kind: 'cmd' | 'out'; content: ReactNode }

const OPENABLE = ['skills', 'education', 'experience', 'resume', 'contact', 'settings'] as const

function Neofetch() {
  const { os, projects } = useContent()
  // A row labelled "Projects" reports the live count rather than a number typed into the CMS.
  const rows = os.neofetchRows.map(
    ([label, value]) => [label, label === 'Projects' ? String(projects.length) : value] as const,
  )
  return (
    <div style={s('display:flex;gap:18px;align-items:flex-start')}>
      <pre style={s('margin:0;color:var(--s-dim);line-height:1.25')}>{os.neofetchArt}</pre>
      <div>
        <div>
          <span style={s('color:var(--s-ok)')}>sumit</span>@
          <span style={s('color:var(--s-ok)')}>portfolio</span>
        </div>
        {rows.map(([label, value]) => (
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
  const content = useContent()
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
    } else if (content.os.term[low]) {
      result = content.os.term[low]
    } else if (low.startsWith('project ')) {
      const key = projectAliases(content)[low.slice(8).trim()] as AppId | undefined
      if (key) {
        openApp(key)
        result = `Opening ${titleOf(key)}…`
      } else {
        result = 'Unknown project. Try: projects'
      }
    } else if (low.startsWith('open ')) {
      const key = low.slice(5).trim()
      if (isAppId(key)) {
        openApp(key)
        result = `Opening ${titleOf(key)}…`
      } else {
        result = 'No such app.'
      }
    } else if ((OPENABLE as readonly string[]).includes(low)) {
      const key = low as (typeof OPENABLE)[number]
      openApp(key)
      result = `Opening ${titleOf(key)}…`
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

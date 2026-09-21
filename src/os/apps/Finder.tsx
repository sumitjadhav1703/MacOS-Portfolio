import { useState } from 'react'
import { s } from '../css'
import { EASE } from '../anim'
import { FOLDER_TINTS, folderColor } from '../packs'
import { useContent } from '../content'
import { pressable } from '../pressable'
import { finderLabel } from './finderPath'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useReducedMotion, useTheme } from '../useTheme'
import { SECTION_CONTENT } from './simple'
import type { AppId, FinderPath, FinderSection, FolderTint } from '../types'

/**
 * The sidebar, below Projects. Each row now *navigates* — it swaps the content pane, the way
 * Finder does — instead of opening a second window on top of the one that was clicked in.
 * The tint is a `FOLDER_TINTS` key rather than a gradient: these six used to be hand-inlined
 * copies of those same hexes, which is the one thing AGENTS.md says a component must not hold.
 */
const SIDE_ITEMS: [FinderSection, FolderTint][] = [
  ['skills', 'violet'],
  ['certificates', 'sand'],
  ['education', 'blue'],
  ['experience', 'green'],
  ['resume', 'rose'],
  ['about', 'graphite'],
]

const swatch = (tint: FolderTint) => `linear-gradient(180deg,${FOLDER_TINTS[tint][0]},${FOLDER_TINTS[tint][1]})`

const ROW =
  'display:flex;align-items:center;gap:9px;padding:6px 9px;border-radius:7px;cursor:default;font-size:12.5px'

/** `Portfolio › …` — `/` is the root itself, so it gets no second crumb. */
const crumbOf = (path: FinderPath): string | null => (path === '/' ? null : finderLabel(path))

function Folder({
  id,
  label,
  colors,
  selected,
  onSelect,
  onOpen,
  delay,
}: {
  id: string
  label: string
  colors: [string, string]
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  delay: number
}) {
  const { accent } = useTheme()
  const [c1, c2] = colors
  return (
    <div
      data-dsk="1"
      data-focusable="1"
      role="button"
      tabIndex={0}
      aria-label={`${label} — double-click to open`}
      style={{
        ...s('width:96px;display:flex;flex-direction:column;align-items:center;gap:7px;cursor:default'),
        animation: delay || delay === 0 ? `lpTile .34s ${EASE} ${delay}ms backwards` : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      onKeyDown={(e) => {
        // Single click selects, so Enter has to be the one that opens — spreading pressable()
        // here would have made one click do both.
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        onSelect()
        onOpen()
      }}
      title={label}
      data-folder={id}
    >
      <div style={s('position:relative;width:62px;height:48px;filter:var(--s-icon-shadow)')}>
        <div
          style={{
            ...s('position:absolute;left:1px;top:1px;width:28px;height:14px;border-radius:5px 10px 0 0'),
            background: c2,
          }}
        />
        <div
          style={s(
            'position:absolute;left:6px;top:9px;width:50px;height:11px;border-radius:4px 4px 0 0;background:rgba(255,255,255,.72)',
          )}
        />
        <div
          style={{
            ...s(
              'position:absolute;left:0;top:13px;width:62px;height:35px;border-radius:5px 9px 9px 9px;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)',
            ),
            background: `linear-gradient(180deg,${c1},${c2})`,
          }}
        />
      </div>
      <span
        style={{
          ...s('font-size:11.5px;text-align:center;line-height:1.25;padding:1px 6px;border-radius:6px'),
          background: selected ? accent : 'transparent',
          color: selected ? '#fff' : 'var(--s-text)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function Row({ path, label, tint }: { path: FinderPath; label: string; tint: FolderTint }) {
  const { finderPath } = useOs()
  const dispatch = useDispatch()
  const here = finderPath === path
  return (
    <div
      data-side="1"
      data-here={here ? '1' : undefined}
      {...pressable(label, () => dispatch({ type: 'finderPath', path }))}
      style={{
        ...s(ROW),
        background: here ? 'var(--s-fill-2)' : 'transparent',
        transition: `background .2s ${EASE},transform .2s ${EASE}`,
      }}
    >
      <span style={{ ...s('width:15px;height:15px;border-radius:4px;flex:none'), background: swatch(tint) }} />
      {label}
    </div>
  )
}

export function Finder() {
  const { finderPath, prefs } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const reduced = useReducedMotion()
  const [selected, setSelected] = useState<AppId | 'finder-projects' | null>(null)

  // `/` and `projects` are folders of folders; every other path is a section that renders in
  // place. Sidebar rows used to call openApp() and pile a second window on top instead.
  const Section = finderPath === '/' || finderPath === 'projects' ? null : SECTION_CONTENT[finderPath]
  const crumb = crumbOf(finderPath)
  const paneIn = reduced ? 'none' : `lpIn .28s ${EASE} both`

  // The Projects folder lists whatever is published. Every folder is Finder blue unless the
  // visitor has tagged that one, which is what a Mac does.
  const projects = useContent().projects

  const tintOf = (id: AppId): [string, string] => {
    const tint = prefs.folderTint[id]
    return tint ? FOLDER_TINTS[tint] : folderColor()
  }

  return (
    <div style={s('display:flex;height:100%')}>
      <div
        data-glasspane="1"
        style={s('width:186px;flex:none;padding:10px 8px;border-right:1px solid var(--s-line);overflow:auto')}
      >
        <div
          style={s(
            'font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--s-faint);padding:8px 9px 6px',
          )}
        >
          Favourites
        </div>
        <Row path="projects" label="Projects" tint="blue" />
        {SIDE_ITEMS.map(([id, tint]) => (
          <Row key={id} path={id} label={finderLabel(id)} tint={tint} />
        ))}
      </div>

      <div style={s('flex:1;overflow:auto;padding:22px 24px')}>
        <div
          data-glasspane="1"
          style={s(
            'display:flex;align-items:center;gap:10px;margin:-22px -24px 18px;padding:9px 24px;font-size:12px;color:var(--s-dim);border-bottom:1px solid var(--s-line);position:sticky;top:-22px;z-index:2',
          )}
        >
          <span
            data-side="1"
            style={s('padding:3px 8px;border-radius:6px;cursor:default')}
            onClick={() => dispatch({ type: 'finderPath', path: '/' })}
          >
            Portfolio
          </span>
          {crumb ? (
            <>
              <span>›</span>
              <span style={s('padding:3px 8px;border-radius:6px;color:var(--s-text)')}>{crumb}</span>
            </>
          ) : null}
          <span style={s('flex:1')} />
          {selected && selected !== 'finder-projects' ? (
            <>
              <span style={s('color:var(--s-faint);font-size:11px')}>Tag</span>
              {(Object.keys(FOLDER_TINTS) as FolderTint[]).map((key) => (
                <span
                  key={key}
                  title={key}
                  style={{
                    ...s('width:14px;height:14px;border-radius:50%;cursor:default;flex:none'),
                    background: `linear-gradient(180deg,${FOLDER_TINTS[key][0]},${FOLDER_TINTS[key][1]})`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    dispatch({ type: 'folderTint', app: selected, tint: key })
                  }}
                />
              ))}
            </>
          ) : null}
        </div>

        {Section ? (
          // The same component the window manager would open, rendered into the pane it was
          // asked for. `Body` is already `height:100%;overflow:auto`, so it fills this box —
          // but the pane scrolls too, and two scrollers would fight, so the pane gives up its
          // own padding and lets the section keep its reading measure.
          <div key={finderPath} style={{ ...s('margin:0 -24px -22px'), animation: paneIn }}>
            <Section />
          </div>
        ) : (
          <div style={{ ...s('display:flex;flex-wrap:wrap;gap:22px 14px'), animation: paneIn }}>
            {finderPath === 'projects' ? (
              projects.map((project, i) => {
                const id = project.id as AppId
                return (
                  <Folder
                    key={id}
                    id={id}
                    label={project.desktopLabel}
                    colors={tintOf(id)}
                    selected={selected === id}
                    onSelect={() => setSelected(id)}
                    onOpen={() => openApp(id)}
                    delay={reduced ? 0 : Math.min(i * 22, 240)}
                  />
                )
              })
            ) : (
              <Folder
                id="finder-projects"
                label="Projects"
                colors={FOLDER_TINTS.blue}
                selected={selected === 'finder-projects'}
                onSelect={() => setSelected('finder-projects')}
                onOpen={() => dispatch({ type: 'finderPath', path: 'projects' })}
                delay={0}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

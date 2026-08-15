import { useState } from 'react'
import { s } from '../css'
import { EASE } from '../anim'
import { FOLDER_COLORS, FOLDER_TINTS } from '../packs'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useTheme } from '../useTheme'
import type { AppId, FolderTint } from '../types'

const SIDE_ITEMS: [AppId, string, string][] = [
  ['skills', 'Skills', 'linear-gradient(180deg,#a97bf0,#6a3ec0)'],
  ['certificates', 'Certificates', 'linear-gradient(180deg,#f79a3e,#cd6212)'],
  ['education', 'Education', 'linear-gradient(180deg,#4ea3f5,#1c62c9)'],
  ['experience', 'Experience', 'linear-gradient(180deg,#5cc36a,#2b8743)'],
  ['resume', 'Resume', 'linear-gradient(180deg,#f26a63,#c33026)'],
  ['about', 'About', 'linear-gradient(180deg,#8e97a6,#4c545f)'],
]

const PROJECT_FOLDERS: [AppId, string][] = [
  ['project-lazarus', 'Lazarus Sentinel'],
  ['project-ai-video', 'AI Video Assistant'],
  ['project-pm25', 'PM2.5 Forecasting'],
  ['project-sar', 'SAR Crop Mapping'],
  ['project-multi-agent', 'Multi-Agent Research'],
  ['project-airbnb', 'NYC Airbnb Classifier'],
]

function Folder({
  id,
  label,
  colors,
  selected,
  onSelect,
  onOpen,
}: {
  id: string
  label: string
  colors: [string, string]
  selected: boolean
  onSelect: () => void
  onOpen: () => void
}) {
  const { accent } = useTheme()
  const [c1, c2] = colors
  return (
    <div
      data-dsk="1"
      style={s('width:96px;display:flex;flex-direction:column;align-items:center;gap:7px;cursor:default')}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      title={label}
      data-folder={id}
    >
      <div style={s('position:relative;width:62px;height:48px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.4))')}>
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

export function Finder() {
  const { finderPath, prefs } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const [selected, setSelected] = useState<AppId | 'finder-projects' | null>(null)

  const tintOf = (id: AppId): [string, string] => {
    const tint = prefs.folderTint[id]
    return tint ? FOLDER_TINTS[tint] : (FOLDER_COLORS[id] ?? ['#4ea3f5', '#1c62c9'])
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
        <div
          data-side="1"
          style={{
            ...s(
              'display:flex;align-items:center;gap:9px;padding:6px 9px;border-radius:7px;cursor:default;font-size:12.5px',
            ),
            background: finderPath === 'projects' ? 'var(--s-fill-2)' : 'transparent',
            transition: `background .2s ${EASE}`,
          }}
          onClick={() => dispatch({ type: 'finderPath', path: 'projects' })}
        >
          <span
            style={s(
              'width:15px;height:15px;border-radius:4px;background:linear-gradient(180deg,#4ea3f5,#1c62c9);flex:none',
            )}
          />
          Projects
        </div>
        {SIDE_ITEMS.map(([id, label, color]) => (
          <div
            key={id}
            data-side="1"
            style={{
              ...s(
                'display:flex;align-items:center;gap:9px;padding:6px 9px;border-radius:7px;cursor:default;font-size:12.5px',
              ),
              transition: `background .2s ${EASE}`,
            }}
            onClick={() => openApp(id)}
          >
            <span style={{ ...s('width:15px;height:15px;border-radius:4px;flex:none'), background: color }} />
            {label}
          </div>
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
          {finderPath === 'projects' ? (
            <>
              <span>›</span>
              <span style={s('padding:3px 8px;border-radius:6px;color:var(--s-text)')}>Projects</span>
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

        <div style={s('display:flex;flex-wrap:wrap;gap:22px 14px')}>
          {finderPath === 'projects' ? (
            PROJECT_FOLDERS.map(([id, label]) => (
              <Folder
                key={id}
                id={id}
                label={label}
                colors={tintOf(id)}
                selected={selected === id}
                onSelect={() => setSelected(id)}
                onOpen={() => openApp(id)}
              />
            ))
          ) : (
            <Folder
              id="finder-projects"
              label="Projects"
              colors={['#4ea3f5', '#1c62c9']}
              selected={selected === 'finder-projects'}
              onSelect={() => setSelected('finder-projects')}
              onOpen={() => dispatch({ type: 'finderPath', path: 'projects' })}
            />
          )}
        </div>
      </div>
    </div>
  )
}

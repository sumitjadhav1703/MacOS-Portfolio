import { SHORTCUTS } from '../../data/os'
import { s } from '../css'
import { useDispatch, useOs } from '../store'

export function Shortcuts() {
  const { shortcuts } = useOs()
  const dispatch = useDispatch()
  if (!shortcuts) return null

  return (
    <div
      id="shortcuts"
      onClick={() => dispatch({ type: 'overlay', name: 'shortcuts', on: false })}
      style={s(
        'position:absolute;inset:0;z-index:310;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center',
      )}
    >
      <div
        id="shortcuts-box"
        onClick={(e) => e.stopPropagation()}
        style={s(
          'width:min(470px,88vw);padding:20px 22px 18px;border-radius:16px;background:var(--s-pop);backdrop-filter:var(--s-blur);-webkit-backdrop-filter:var(--s-blur);border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);color:var(--s-text)',
        )}
      >
        <div style={s('display:flex;align-items:baseline;gap:10px;margin-bottom:14px')}>
          <div style={s('font-size:15px;font-weight:700;letter-spacing:-.01em')}>Keyboard shortcuts</div>
          <div style={s('flex:1')} />
          <div style={s('font-size:11.5px;color:var(--s-faint)')}>? or Esc to close</div>
        </div>
        <div id="shortcuts-list" style={s('display:flex;flex-direction:column')}>
          {SHORTCUTS.map(([keys, what]) => (
            <div
              key={keys}
              style={s('display:flex;justify-content:space-between;gap:14px;font-size:12.5px;padding:5px 0')}
            >
              <span style={s('color:var(--s-dim)')}>{what}</span>
              <span style={s('font-family:ui-monospace,Menlo,monospace')}>{keys}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

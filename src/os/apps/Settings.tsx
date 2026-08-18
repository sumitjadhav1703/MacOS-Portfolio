import { useState, type ReactNode } from 'react'
import { useContent } from '../content'
import { EASE } from '../anim'
import { s } from '../css'
import { PACKS } from '../packs'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useReducedMotion, useTheme } from '../useTheme'
import { pickWallpaper } from '../shell/Wallpaper'
import { useAppCommand } from '../cmd'
import type { PackId, Prefs, Theme } from '../types'

const TABS = [
  ['overview', 'Overview'],
  ['appearance', 'Appearance'],
  ['performance', 'Performance'],
  ['accessibility', 'Accessibility'],
  ['about', 'About'],
] as const

type Tab = (typeof TABS)[number][0]

const CARD = 'padding:13px 16px;border-radius:13px;background:var(--s-fill);border:1px solid var(--s-line)'

function SetHead({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h2 style={s('margin:0 0 4px;font-size:20px;font-weight:700;letter-spacing:-.01em')}>{title}</h2>
      <div style={s('color:var(--s-dim);font-size:12.5px;margin-bottom:18px')}>{sub}</div>
    </>
  )
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div style={s('border-radius:13px;background:var(--s-fill);border:1px solid var(--s-line);overflow:hidden')}>
      {rows.map(([label, value], i) => (
        <div
          key={label}
          style={{
            ...s('display:flex;justify-content:space-between;gap:16px;padding:11px 16px;font-size:12.5px'),
            borderTop: i ? '1px solid var(--s-line)' : undefined,
          }}
        >
          <span style={s('color:var(--s-dim)')}>{label}</span>
          <span style={s('text-align:right')}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function Switch({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string
  desc: string
  on: boolean
  onToggle: () => void
}) {
  const { accent } = useTheme()
  return (
    <div
      data-side="1"
      tabIndex={0}
      data-focusable="1"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      style={s(
        'display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px;border-radius:13px;background:var(--s-fill);border:1px solid var(--s-line);cursor:default;transition:background .2s ease',
      )}
    >
      <span>
        <span style={s('font-weight:600')}>{label}</span>
        <div style={s('color:var(--s-dim);font-size:12px;margin-top:2px;line-height:1.45')}>{desc}</div>
      </span>
      <span
        style={{
          ...s('flex:none;width:41px;height:24px;border-radius:999px;position:relative;transition:background .25s ease'),
          background: on ? accent : 'var(--s-fill-3)',
        }}
      >
        <span
          style={{
            ...s(
              'position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35)',
            ),
            left: on ? 20 : 3,
            transition: `left .25s ${EASE}`,
          }}
        />
      </span>
    </div>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onPick,
}: {
  options: [T, string][]
  value: T
  onPick: (v: T) => void
}) {
  const { accent } = useTheme()
  return (
    <div style={s('display:flex;gap:6px')}>
      {options.map(([v, label]) => (
        <div
          key={v}
          tabIndex={0}
          data-focusable="1"
          role="button"
          onClick={() => onPick(v)}
          style={{
            ...s('flex:1;text-align:center;padding:8px 0;border-radius:9px;font-size:12.5px;cursor:default'),
            background: v === value ? accent : 'var(--s-fill-2)',
            color: v === value ? '#fff' : 'var(--s-text)',
          }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

export function Settings() {
  const content = useContent()
  const { prefs, status, activity, wins } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const reduced = useReducedMotion()
  const { theme, accent } = useTheme()
  const [tab, setTab] = useState<Tab>('overview')

  // The View menu selects a pane by name, the same values the sidebar rows carry.
  useAppCommand('settings', (cmd) => {
    const [prefix, pane] = cmd.split(':')
    if (prefix === 'pane' && TABS.some(([value]) => value === pane)) setTab(pane as Tab)
  })

  const setPref = (patch: Partial<Prefs>) => dispatch({ type: 'prefs', patch })

  const panes: Record<Tab, ReactNode> = {
    overview: (
      <>
        <SetHead title="Overview" sub="This machine" />
        <div style={s('display:flex;flex-direction:column;gap:12px;max-width:470px')}>
          <div
            style={s(
              'display:flex;align-items:center;gap:14px;padding:16px;border-radius:14px;background:var(--s-fill);border:1px solid var(--s-line)',
            )}
          >
            <div
              style={s(
                'width:50px;height:50px;flex:none;border-radius:12px;background:var(--s-fill-2);box-shadow:inset 0 0 0 1px var(--s-line);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:600',
              )}
            >
              SJ
            </div>
            <div>
              <div style={s('font-size:15px;font-weight:700')}>Sumit Jadhav</div>
              <div style={s('color:var(--s-dim);font-size:12.5px')}>
                AI &amp; Data Science · B.Tech, JNEC / MGM University
              </div>
            </div>
          </div>
          <Rows
            rows={[
              [
                'Appearance',
                prefs.theme === 'system'
                  ? `System (${theme})`
                  : theme[0].toUpperCase() + theme.slice(1),
              ],
              ['Status', status],
              ['Activity', activity],
              ['Open windows', String(Object.keys(wins).length)],
              ['Storage', 'This browser only'],
            ]}
          />
          <div style={s('display:flex;gap:8px;flex-wrap:wrap')}>
            <a
              href={content.site.resumeUrl}
              download="Sumit_Jadhav_Resume.pdf"
              data-btn="1"
              style={{
                ...s(
                  'padding:9px 15px;border-radius:10px;color:#fff;font-weight:600;font-size:12.5px;text-decoration:none',
                ),
                background: accent,
              }}
            >
              Download Resume
            </a>
            <span
              data-side="1"
              tabIndex={0}
              data-focusable="1"
              role="button"
              onClick={() => openApp('finder-projects')}
              style={s(
                'padding:9px 15px;border-radius:10px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12.5px;cursor:default',
              )}
            >
              Open Projects
            </span>
          </div>
        </div>
      </>
    ),

    appearance: (
      <>
        <SetHead title="Appearance" sub="Themes, dock material and desktop picture" />
        <div style={s('display:flex;flex-direction:column;gap:10px;max-width:470px')}>
          <div style={s(CARD)}>
            <div style={s('font-weight:600;margin-bottom:10px')}>Themes</div>
            <div style={s('display:grid;grid-template-columns:repeat(3,1fr);gap:8px')}>
              {(Object.keys(PACKS) as PackId[]).map((key) => {
                const pack = PACKS[key]
                const on = prefs.pack === key
                return (
                  <div
                    key={key}
                    tabIndex={0}
                    data-focusable="1"
                    role="button"
                    onClick={() => {
                      setPref({ pack: key })
                      dispatch({ type: 'notify', title: 'Themes', msg: `${pack.name} applied` })
                    }}
                    style={{
                      ...s('padding:7px;border-radius:11px;cursor:default;background:var(--s-fill-2)'),
                      border: `1px solid ${on ? pack.accent : 'var(--s-line)'}`,
                      boxShadow: on ? `0 0 0 1px ${pack.accent}` : 'none',
                    }}
                  >
                    <div
                      style={{
                        ...s('height:44px;border-radius:7px;position:relative;overflow:hidden'),
                        background: pack.wall[pack.prefers],
                      }}
                    >
                      <span
                        style={{
                          ...s('position:absolute;left:6px;bottom:6px;width:13px;height:13px;border-radius:4px'),
                          background: pack.accent,
                        }}
                      />
                    </div>
                    <div style={s('font-size:12px;font-weight:600;margin-top:7px')}>{pack.name}</div>
                    <div style={s('font-size:11px;color:var(--s-dim);line-height:1.35;margin-top:1px')}>
                      {pack.note}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={s('color:var(--s-faint);font-size:11.5px;margin-top:9px')}>
              Each theme swaps wallpaper, accent and dock tint. Daylight switches the interface to
              light.
            </div>
          </div>

          <div style={s(CARD)}>
            <div style={s('font-weight:600;margin-bottom:10px')}>Dock material</div>
            <Segmented
              options={[
                ['glass', 'Glass'],
                ['solid', 'Solid'],
              ]}
              value={prefs.dockStyle}
              onPick={(v) => setPref({ dockStyle: v })}
            />
            <div style={s('color:var(--s-faint);font-size:11.5px;margin-top:9px')}>
              Glass refracts the wallpaper behind the dock. Reduce Transparency overrides both with a
              solid surface.
            </div>
          </div>

          <div style={s(CARD)}>
            <div style={s('font-weight:600;margin-bottom:10px')}>Theme</div>
            <Segmented
              options={
                [
                  ['light', 'Light'],
                  ['dark', 'Dark'],
                  ['system', 'System'],
                ] as [Theme, string][]
              }
              value={prefs.theme}
              onPick={(v) => {
                setPref({ theme: v })
                dispatch({
                  type: 'notify',
                  title: 'Appearance',
                  msg:
                    v === 'system'
                      ? 'Following your system setting'
                      : `${v[0].toUpperCase()}${v.slice(1)} appearance`,
                })
              }}
            />
            <div style={s('color:var(--s-faint);font-size:11.5px;margin-top:9px')}>
              System follows your device's light/dark setting live.
            </div>
          </div>

          <div
            style={s(
              'display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px;border-radius:13px;background:var(--s-fill);border:1px solid var(--s-line)',
            )}
          >
            <span>
              <span style={s('font-weight:600')}>Desktop picture</span>
              <div style={s('color:var(--s-dim);font-size:12px;margin-top:2px')}>
                Drop in your own photograph
              </div>
            </span>
            <span
              data-btn="1"
              tabIndex={0}
              data-focusable="1"
              role="button"
              onClick={pickWallpaper}
              style={{
                ...s(
                  'padding:8px 14px;border-radius:9px;color:#fff;font-size:12.5px;font-weight:600;cursor:default;white-space:nowrap',
                ),
                background: accent,
              }}
            >
              Choose…
            </span>
          </div>

          <div style={s(CARD)}>
            <div style={s('font-weight:600')}>Wallpaper brightness</div>
            <input
              id="set-bright"
              type="range"
              min={45}
              max={115}
              value={prefs.bright}
              onChange={(e) => setPref({ bright: Number(e.target.value) })}
              style={{ ...s('width:100%;margin-top:11px'), accentColor: accent }}
            />
          </div>

          <Switch
            label="Dock labels"
            desc="Show the application name above a magnified dock icon"
            on={prefs.dockLabels}
            onToggle={() => setPref({ dockLabels: !prefs.dockLabels })}
          />
          <Switch
            label="Menu bar status"
            desc="Show the portfolio status indicator"
            on={prefs.showStatus}
            onToggle={() => setPref({ showStatus: !prefs.showStatus })}
          />
          <Switch
            label="Menu bar activity"
            desc="Show the activity meter"
            on={prefs.showActivity}
            onToggle={() => setPref({ showActivity: !prefs.showActivity })}
          />
        </div>
      </>
    ),

    performance: (
      <>
        <SetHead
          title="Performance"
          sub="Reduce the cost of the interface on low-power hardware"
        />
        <div style={s('display:flex;flex-direction:column;gap:10px;max-width:470px')}>
          <Switch
            label="Low Power Mode"
            desc="Turns off background blur, shortens animation and flattens dock magnification. Surfaces stay theme-correct rather than falling back to a fixed dark colour."
            on={prefs.lowPower}
            onToggle={() => setPref({ lowPower: !prefs.lowPower })}
          />
          <Rows
            rows={[
              ['Blur', prefs.lowPower ? 'Disabled' : 'Enabled'],
              ['Dock magnification', prefs.lowPower || reduced ? 'Off' : '150%'],
              ['Window animation', reduced ? 'Off' : 'On'],
              ['Open windows', String(Object.keys(wins).length)],
            ]}
          />
          <div style={s('color:var(--s-faint);font-size:12px')}>
            Nothing here polls in the background. The clock updates once every ten seconds;
            everything else redraws only on interaction.
          </div>
        </div>
      </>
    ),

    accessibility: (
      <>
        <SetHead title="Accessibility" sub="Motion, transparency and contrast" />
        <div style={s('display:flex;flex-direction:column;gap:10px;max-width:470px')}>
          <Switch
            label="Reduce motion"
            desc="Removes window, dock and typing animation. Follows your system setting until you change it here."
            on={reduced}
            onToggle={() => setPref({ reduceMotion: !reduced })}
          />
          <Switch
            label="Reduce transparency"
            desc="Replaces translucent menus, popovers and the dock with solid theme surfaces"
            on={prefs.opaque}
            onToggle={() => setPref({ opaque: !prefs.opaque })}
          />
          <Switch
            label="Increase contrast"
            desc="Strengthens borders and lifts secondary text to full contrast"
            on={prefs.contrast}
            onToggle={() => setPref({ contrast: !prefs.contrast })}
          />
          <div style={s(CARD)}>
            <div style={s('font-weight:600;margin-bottom:8px')}>Keyboard</div>
            {content.os.shortcuts.map(([keys, what]) => (
              <div
                key={keys}
                style={s('display:flex;justify-content:space-between;gap:14px;font-size:12.5px;padding:3px 0')}
              >
                <span style={s('color:var(--s-dim)')}>{what}</span>
                <span style={s('font-family:ui-monospace,Menlo,monospace')}>{keys}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    ),

    about: (
      <>
        <SetHead
          title="Sumit's Portfolio OS"
          sub="An interactive portfolio built as a desktop environment"
        />
        <div style={s('display:flex;flex-direction:column;gap:10px;max-width:470px')}>
          <Rows
            rows={[
              ['Interface', 'React and TypeScript on Next.js'],
              ['Portfolio data', 'Bundled with the page — no backend'],
              ['Ask Sumit', 'Local keyword lookup, not a language model'],
              ['Storage', 'Preferences and window positions in this browser'],
            ]}
          />
          <div style={s('color:var(--s-dim);font-size:12.5px;line-height:1.6')}>
            Sumit's Portfolio OS is an independent personal portfolio by Sumit Jadhav. The desktop
            metaphor is original work and is not affiliated with, sponsored by or endorsed by any
            operating-system vendor.
          </div>
          <div style={s('display:flex;gap:8px;flex-wrap:wrap')}>
            <span
              data-side="1"
              tabIndex={0}
              data-focusable="1"
              role="button"
              onClick={() => openApp('about')}
              style={s(
                'padding:8px 14px;border-radius:9px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12.5px;cursor:default',
              )}
            >
              About Sumit
            </span>
            <span
              data-side="1"
              tabIndex={0}
              data-focusable="1"
              role="button"
              onClick={() => {
                localStorage.removeItem('sumit-os-prefs')
                location.reload()
              }}
              style={s(
                'padding:8px 14px;border-radius:9px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12.5px;cursor:default',
              )}
            >
              Reset preferences
            </span>
          </div>
        </div>
      </>
    ),
  }

  return (
    <div style={s('display:flex;height:100%')}>
      <div
        data-glasspane="1"
        style={s('width:186px;flex:none;padding:12px 8px;border-right:1px solid var(--s-line);overflow:auto')}
      >
        {TABS.map(([value, label]) => (
          <div
            key={value}
            data-side="1"
            tabIndex={0}
            data-focusable="1"
            role="button"
            onClick={() => setTab(value)}
            style={{
              ...s('padding:7px 10px;border-radius:8px;font-size:12.5px;cursor:default;margin-bottom:2px'),
              background: tab === value ? 'var(--s-fill-2)' : 'transparent',
            }}
          >
            {label}
          </div>
        ))}
      </div>
      <div style={s('flex:1;overflow:auto;padding:26px 30px 34px')}>{panes[tab]}</div>
    </div>
  )
}

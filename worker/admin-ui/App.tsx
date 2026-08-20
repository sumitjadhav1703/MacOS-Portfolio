import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, reportExpiredSession } from './api'
import { COLLECTIONS, OS_FIELDS, SITE_FIELDS, grouped } from './schema'
import type { FieldUI } from './schema'
import { Collection, hydrate } from './Collection'
import { Field } from './Fields'
import { NAV, PAGES, titleOf } from './nav'
import { HOME, hashFor, parseHash, sameRoute } from './router'
import type { Route } from './router'
import { AdminProvider, useAdmin } from './store'
import {
  Banner,
  Button,
  CARD,
  DiscardPrompt,
  Group,
  Input,
  Label,
  SaveBar,
  fieldErrors,
  useAction,
  useDirty,
  useSaveShortcut,
} from './ui'
import type { SaveState } from './ui'
import { Assets } from './Assets'
import { Resume } from './Resume'
import { Search } from './Search'
import { s } from '../../src/os/css'

/** What the public site does after a save here, said plainly. Never "instantly everywhere". */
const PROPAGATION = 'Live now — may take a minute or two to appear everywhere.'

// Where the public portfolio lives, for the Preview links. Injected at build time so the admin
// does not have to guess; falls back to the deployed site.
const SITE_ORIGIN =
  (import.meta as { env?: Record<string, string> }).env?.VITE_SITE_ORIGIN ??
  'https://sumitjadhav.vercel.app'

function Login({ onIn }: { onIn: () => void }) {
  const [password, setPassword] = useState('')
  const { error, busy, run } = useAction()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await run(() => api.login(password))) onIn()
  }

  return (
    <div style={s('min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px')}>
      <form onSubmit={submit} style={s(CARD + ';width:340px;max-width:100%')}>
        <h1 style={s('margin:0 0 4px;font-size:17px')}>SumitOS</h1>
        <p style={s('margin:0 0 18px;font-size:12px;color:var(--s-dim)')}>Content management</p>
        {error ? <Banner tone="error">{error.message}</Banner> : null}
        <Label text="Password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
          />
        </Label>
        <Button type="submit" tone="accent" disabled={busy || !password}>
          {busy ? 'Checking…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}

/**
 * A session that runs out mid-edit is a password prompt, not a lost form. Nothing unmounts: the
 * editor keeps its state behind this, and the failed write can simply be retried afterwards.
 */
function Relogin({ onIn }: { onIn: () => void }) {
  const [password, setPassword] = useState('')
  const { error, busy, run } = useAction()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await run(() => api.login(password))) onIn()
  }

  return (
    <div
      style={s(
        'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;' +
          'justify-content:center;z-index:60;padding:16px',
      )}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="Session expired"
        style={s(CARD + ';width:340px;max-width:100%')}
      >
        <h2 style={s('margin:0 0 4px;font-size:15px')}>Your session expired</h2>
        <p style={s('margin:0 0 16px;font-size:12px;color:var(--s-dim)')}>
          Sign in again. Your unsaved work is still on the screen behind this.
        </p>
        {error ? <Banner tone="error">{error.message}</Banner> : null}
        <Label text="Password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
          />
        </Label>
        <Button type="submit" tone="accent" disabled={busy || !password}>
          {busy ? 'Checking…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}

/** What is the current state of the portfolio, and the four things most often done next. */
function Dashboard({ go }: { go: (route: Route) => void }) {
  const { stats, error } = useAdmin()

  const tiles: [string, string | number, string?][] = [
    ['Projects', stats?.projects ?? '—', `${stats?.publishedProjects ?? 0} published`],
    [
      'Unpublished changes',
      stats?.projectDrafts ?? '—',
      stats?.projectDrafts ? 'Projects with edits waiting' : 'Everything is published',
    ],
    ['Certificates', stats?.certificates ?? '—'],
    ['Experience', stats?.experience ?? '—'],
    ['Education', stats?.education ?? '—'],
    ['Skill groups', stats?.skills ?? '—'],
    ['Social links', stats?.socialLinks ?? '—'],
    ['Assets', stats?.assets ?? '—'],
  ]

  const actions: [string, Route][] = [
    ['+ Add project', { page: 'projects', id: 'new' }],
    ['+ Add certificate', { page: 'certificates', id: 'new' }],
    ['Edit profile', { page: 'site' }],
    ['Replace resume', { page: 'resume' }],
  ]

  return (
    <div>
      <h1 style={s('margin:0 0 16px;font-size:16px')}>Dashboard</h1>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px')}>
        {tiles.map(([label, value, note]) => (
          <div key={label} style={s(CARD)}>
            <div style={s('font-size:12px;color:var(--s-dim)')}>{label}</div>
            <div style={s('font-size:22px;margin-top:6px')}>{value}</div>
            {note ? (
              <div style={s('font-size:11px;color:var(--s-faint);margin-top:4px')}>{note}</div>
            ) : null}
          </div>
        ))}
      </div>

      <h2 style={s('margin:22px 0 10px;font-size:13px;color:var(--s-dim)')}>Jump straight in</h2>
      <div style={s('display:flex;gap:8px;flex-wrap:wrap')}>
        {actions.map(([label, route]) => (
          <Button key={label} onClick={() => go(route)}>
            {label}
          </Button>
        ))}
      </div>

      <h2 style={s('margin:22px 0 10px;font-size:13px;color:var(--s-dim)')}>Keyboard</h2>
      <ul style={s('margin:0;padding:0;list-style:none;font-size:12px;color:var(--s-faint);display:flex;gap:18px;flex-wrap:wrap')}>
        <li>⌘K / Ctrl+K — search everything</li>
        <li>⌘S / Ctrl+S — save the open editor</li>
        <li>Esc — close a dialog</li>
      </ul>

      <p style={s('margin-top:22px;font-size:12px;color:var(--s-faint)')}>
        Last content change:{' '}
        {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : '—'}. Publishing clears
        the edge cache where you are; elsewhere it takes up to a minute or two.
      </p>
    </div>
  )
}

/**
 * The two singleton rows. These have no draft state: there is one of each, it is always live, and
 * the save bar says so rather than implying a staging step that does not exist.
 */
function SingletonForm({
  name,
  title,
  fields,
  onDirty,
}: {
  name: string
  title: string
  fields: FieldUI[]
  onDirty?: (dirty: boolean) => void
}) {
  const [draft, setDraft] = useState<Record<string, any> | null>(null)
  const [baseline, setBaseline] = useState<Record<string, any> | null>(null)
  const [state, setState] = useState<SaveState>('saved')
  const [notice, setNotice] = useState<string | null>(null)
  const { error, busy, run } = useAction()

  const dirty = useDirty(draft, baseline)
  const invalid = useMemo(() => fieldErrors(error?.fields ?? []), [error])

  useEffect(() => {
    run(async () => {
      const row = hydrate((await api.singleton(name)) ?? {}, fields)
      setDraft(row)
      setBaseline(row)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  useEffect(() => {
    onDirty?.(dirty)
    return () => onDirty?.(false)
  }, [dirty, onDirty])

  useEffect(() => {
    if (state === 'saving') return
    setState(dirty ? 'dirty' : 'saved')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty])

  useSaveShortcut(() => void save(), dirty)

  const save = async () => {
    if (!draft) return
    setState('saving')
    setNotice(null)
    const body: Record<string, unknown> = {}
    for (const field of fields) body[field.col] = draft[field.col]
    if (!(await run(() => api.saveSingleton(name, body)))) {
      setState('failed')
      return
    }
    setBaseline(draft)
    setState('saved')
    setNotice(`Saved. ${PROPAGATION}`)
  }

  return (
    <div style={s(CARD)}>
      <h1 style={s('margin:0 0 16px;font-size:16px')}>{title}</h1>
      {error ? <Banner tone="error">{error.message}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}
      {draft
        ? grouped(fields).map((section, i) => {
            const controls = section.fields.map((field) => (
              <Field
                key={field.col}
                field={field}
                value={draft[field.col]}
                form={draft}
                error={invalid[field.col]}
                onChange={(v) => setDraft({ ...draft, [field.col]: v })}
              />
            ))
            return section.title ? (
              <Group key={section.title} title={section.title} open={i === 0}>
                {controls}
              </Group>
            ) : (
              controls
            )
          })
        : null}
      <SaveBar state={state} note="This is live — saving updates the public site.">
        <Button tone="accent" onClick={save} disabled={busy || !draft || (!dirty && state !== 'failed')}>
          {state === 'failed' ? 'Retry save' : 'Save'}
        </Button>
      </SaveBar>
    </div>
  )
}

function Shell({ onOut }: { onOut: () => void }) {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState<Route | null>(null)
  const [expired, setExpired] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [searching, setSearching] = useState(false)

  // Refs, because the hashchange listener is registered once and must see the current values.
  const dirtyRef = useRef(dirty)
  const routeRef = useRef(route)
  dirtyRef.current = dirty
  routeRef.current = route

  useEffect(() => {
    reportExpiredSession(() => setExpired(true))
  }, [])

  // ⌘K opens the search. Nothing else in the admin claims it, and the browser's own use of it is
  // a focus shortcut for the address bar, which the palette is the local equivalent of.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearching(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /**
   * Back, Forward and a pasted link all arrive here. When there is unsaved work the hash is put
   * back where it was and the author is asked first — a Back button that silently throws away a
   * full editor is exactly the loss the prompt exists to prevent.
   */
  useEffect(() => {
    const onHash = () => {
      const next = parseHash(window.location.hash)
      if (sameRoute(next, routeRef.current)) return
      if (dirtyRef.current) {
        setPending(next)
        window.history.replaceState(null, '', hashFor(routeRef.current))
        return
      }
      setRoute(next)
      setNavOpen(false)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((next: Route) => {
    if (sameRoute(next, routeRef.current)) return
    if (dirtyRef.current) {
      setPending(next)
      return
    }
    window.location.hash = hashFor(next)
  }, [])

  const leave = (next: Route) => {
    setDirty(false)
    dirtyRef.current = false
    setPending(null)
    setRoute(next)
    setNavOpen(false)
    window.history.replaceState(null, '', hashFor(next))
  }

  const page = PAGES.includes(route.page) ? route.page : HOME.page
  const collection = COLLECTIONS.find((c) => c.type === page)

  useEffect(() => {
    document.title = `${titleOf(page)} · SumitOS admin`
  }, [page])

  return (
    <div style={s('display:flex;min-height:100vh;align-items:flex-start')}>
      <button
        onClick={() => setNavOpen((v) => !v)}
        aria-expanded={navOpen}
        data-adminmenu
        data-focusable
        style={s(
          'display:none;position:fixed;top:10px;left:10px;z-index:40;border-radius:8px;' +
            'border:1px solid var(--s-line);background:var(--s-chrome);color:var(--s-text);' +
            'font:inherit;font-size:13px;padding:7px 12px;cursor:pointer',
        )}
      >
        {navOpen ? 'Close' : 'Menu'}
      </button>

      <nav
        aria-label="Sections"
        data-adminnav={navOpen ? 'open' : 'closed'}
        style={s(
          'width:214px;flex:none;align-self:stretch;border-right:1px solid var(--s-line);' +
            'padding:18px 12px;background:var(--s-chrome);display:flex;flex-direction:column;gap:2px',
        )}
      >
        <div style={s('font-size:13px;padding:0 10px 10px;color:var(--s-dim)')}>SumitOS admin</div>
        <button
          type="button"
          onClick={() => setSearching(true)}
          data-focusable
          style={s(
            'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 2px 8px;' +
              'border:1px solid var(--s-line);background:var(--s-input);color:var(--s-dim);' +
              'border-radius:8px;padding:7px 10px;font:inherit;font-size:12px;cursor:pointer',
          )}
        >
          Search everything
          <span aria-hidden style={s('color:var(--s-faint)')}>⌘K</span>
        </button>

        {NAV.map((group) => (
          <div key={group.title ?? 'top'} style={s('display:flex;flex-direction:column;gap:2px')}>
            {group.title ? (
              <div
                style={s(
                  'font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--s-faint);' +
                    'padding:14px 10px 4px',
                )}
              >
                {group.title}
              </div>
            ) : null}
            {group.items.map((item) => (
              <a
                key={item.page}
                href={hashFor({ page: item.page })}
                onClick={(e) => {
                  e.preventDefault()
                  go({ page: item.page })
                }}
                aria-current={page === item.page ? 'page' : undefined}
                data-focusable
                style={{
                  ...s(
                    'display:block;text-align:left;border-radius:8px;padding:8px 10px;' +
                      'font-size:13px;cursor:pointer;color:var(--s-text);text-decoration:none',
                  ),
                  background: page === item.page ? 'var(--s-fill-2)' : 'transparent',
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
        ))}

        <div style={s('flex:1;min-height:18px')} />
        <div
          style={s(
            'font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--s-faint);padding:0 10px 4px',
          )}
        >
          Account
        </div>
        <Button
          onClick={async () => {
            await api.logout()
            onOut()
          }}
        >
          Log out
        </Button>
      </nav>

      <main style={s('flex:1;min-width:0;padding:24px;max-width:940px')}>
        {page === 'dashboard' ? <Dashboard go={go} /> : null}
        {collection ? (
          <Collection
            ui={collection}
            siteOrigin={SITE_ORIGIN}
            openId={route.id}
            onOpen={(id) => {
              const next = id ? { page, id } : { page }
              setRoute(next)
              window.history.replaceState(null, '', hashFor(next))
            }}
            onDirty={setDirty}
          />
        ) : null}
        {page === 'site' ? (
          <SingletonForm name="site" title="Profile" fields={SITE_FIELDS} onDirty={setDirty} />
        ) : null}
        {page === 'os' ? (
          <SingletonForm name="os" title="Shell & Ask Sumit" fields={OS_FIELDS} onDirty={setDirty} />
        ) : null}
        {page === 'assets' ? <Assets /> : null}
        {page === 'resume' ? <Resume /> : null}
      </main>

      {pending ? (
        <DiscardPrompt onStay={() => setPending(null)} onDiscard={() => leave(pending)} />
      ) : null}
      {searching ? <Search onGo={go} onClose={() => setSearching(false)} /> : null}
      {expired ? <Relogin onIn={() => setExpired(false)} /> : null}
    </div>
  )
}

export default function App() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    api
      .me()
      .then(() => setSignedIn(true))
      .catch(() => setSignedIn(false))
  }, [])

  if (signedIn === null) {
    return <div style={s('padding:40px;color:var(--s-faint);font-size:13px')}>Loading…</div>
  }
  if (!signedIn) return <Login onIn={() => setSignedIn(true)} />

  return (
    <AdminProvider>
      <Shell onOut={() => setSignedIn(false)} />
    </AdminProvider>
  )
}

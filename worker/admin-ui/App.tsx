import { useEffect, useState } from 'react'
import { api } from './api'
import type { Asset } from './api'
import { COLLECTIONS, OS_FIELDS, SITE_FIELDS } from './schema'
import type { FieldUI } from './schema'
import { Collection, hydrate } from './Collection'
import { Field } from './Fields'
import { Banner, Button, CARD, Confirm, Input, Label, useAction } from './ui'
import { s } from '../../src/os/css'

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
      <form onSubmit={submit} style={s(CARD + ';width:340px')}>
        <h1 style={s('margin:0 0 4px;font-size:17px')}>SumitOS</h1>
        <p style={s('margin:0 0 18px;font-size:12px;color:var(--s-dim)')}>Content management</p>
        {error ? <Banner tone="error">{error}</Banner> : null}
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

function Dashboard() {
  const [data, setData] = useState<Record<string, any> | null>(null)
  const { error, run } = useAction()
  useEffect(() => {
    run(async () => setData(await api.stats()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tiles: [string, string | number | undefined][] = [
    ['Total projects', data?.projects],
    ['Published projects', data?.publishedProjects],
    ['Certificates', data?.certificates],
    ['Experience entries', data?.experience],
    ['Assets', data?.assets],
    ['Last updated', data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : '—'],
  ]

  return (
    <div>
      <h2 style={s('margin:0 0 16px;font-size:16px')}>Dashboard</h2>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px')}>
        {tiles.map(([label, value]) => (
          <div key={label} style={s(CARD)}>
            <div style={s('font-size:12px;color:var(--s-dim)')}>{label}</div>
            <div style={s('font-size:20px;margin-top:6px')}>{value ?? '—'}</div>
          </div>
        ))}
      </div>
      <p style={s('margin-top:18px;font-size:12px;color:var(--s-faint)')}>
        Publishing clears the edge cache immediately — changes show on the next page load.
      </p>
    </div>
  )
}

function SingletonForm({ name, title, fields }: { name: string; title: string; fields: FieldUI[] }) {
  const [draft, setDraft] = useState<Record<string, any> | null>(null)
  const [saved, setSaved] = useState(false)
  const { error, busy, run } = useAction()

  useEffect(() => {
    run(async () => {
      const row = await api.singleton(name)
      setDraft(hydrate(row ?? {}, fields))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  const save = async () => {
    if (!draft) return
    const body: Record<string, unknown> = {}
    for (const field of fields) body[field.col] = draft[field.col]
    if (!(await run(() => api.saveSingleton(name, body)))) return
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={s(CARD)}>
      <h2 style={s('margin:0 0 16px;font-size:16px')}>{title}</h2>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {saved ? <Banner tone="ok">Saved.</Banner> : null}
      {draft
        ? fields.map((field) => (
            <Field
              key={field.col}
              field={field}
              value={draft[field.col]}
              onChange={(v) => setDraft({ ...draft, [field.col]: v })}
            />
          ))
        : null}
      <Button tone="accent" onClick={save} disabled={busy || !draft}>
        Save
      </Button>
    </div>
  )
}

function Assets() {
  const [items, setItems] = useState<Asset[]>([])
  const [confirming, setConfirming] = useState<string | null>(null)
  const { error, run } = useAction()

  const load = () => run(async () => setItems(await api.assets()))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const remove = async (key: string) => {
    setConfirming(null)
    await run(() => api.deleteAsset(key))
    await load()
  }

  return (
    <div>
      <h2 style={s('margin:0 0 16px;font-size:16px')}>Assets</h2>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <div style={s(CARD + ';padding:0;overflow:hidden')}>
        {items.length === 0 ? (
          <div style={s('padding:24px;color:var(--s-faint);font-size:13px')}>No files uploaded.</div>
        ) : null}
        {items.map((asset, i) => (
          <div
            key={asset.key}
            style={s(
              'display:flex;align-items:center;gap:12px;padding:12px 16px;' +
                (i ? 'border-top:1px solid var(--s-line)' : ''),
            )}
          >
            <div style={s('flex:1;min-width:0')}>
              <a href={`/files/${asset.key}`} target="_blank" rel="noreferrer" style={s('font-size:13px')}>
                {asset.filename}
              </a>
              <div style={s('font-size:11px;color:var(--s-faint);margin-top:2px')}>
                {asset.kind} · {asset.content_type} · {Math.round(asset.size / 1024)} KB
              </div>
            </div>
            <Button tone="danger" onClick={() => setConfirming(asset.key)}>
              Delete
            </Button>
          </div>
        ))}
      </div>
      {confirming ? (
        <Confirm
          message="Delete this file? It is refused if any project, certificate or the resume still points at it."
          onCancel={() => setConfirming(null)}
          onConfirm={() => remove(confirming)}
        />
      ) : null}
    </div>
  )
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  ...COLLECTIONS.map((c) => ({ id: c.type, label: c.title })),
  { id: 'site', label: 'Profile & About' },
  { id: 'os', label: 'Shell & Ask Sumit' },
  { id: 'assets', label: 'Assets' },
]

export default function App() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [page, setPage] = useState('dashboard')

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

  const collection = COLLECTIONS.find((c) => c.type === page)

  return (
    <div style={s('display:flex;min-height:100vh')}>
      <nav
        style={s(
          'width:210px;flex:none;border-right:1px solid var(--s-line);padding:18px 12px;' +
            'background:var(--s-chrome);display:flex;flex-direction:column;gap:2px',
        )}
      >
        <div style={s('font-size:13px;padding:0 10px 14px;color:var(--s-dim)')}>SumitOS admin</div>
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            data-focusable
            style={{
              ...s(
                'text-align:left;border:0;border-radius:8px;padding:8px 10px;font:inherit;' +
                  'font-size:13px;cursor:pointer;color:var(--s-text)',
              ),
              background: page === item.id ? 'var(--s-fill-2)' : 'transparent',
            }}
          >
            {item.label}
          </button>
        ))}
        <div style={s('flex:1')} />
        <Button
          onClick={async () => {
            await api.logout()
            setSignedIn(false)
          }}
        >
          Log out
        </Button>
      </nav>

      <main style={s('flex:1;padding:24px;max-width:940px')}>
        {page === 'dashboard' ? <Dashboard /> : null}
        {collection ? <Collection ui={collection} siteOrigin={SITE_ORIGIN} /> : null}
        {page === 'site' ? (
          <SingletonForm name="site" title="Profile & About" fields={SITE_FIELDS} />
        ) : null}
        {page === 'os' ? <SingletonForm name="os" title="Shell & Ask Sumit" fields={OS_FIELDS} /> : null}
        {page === 'assets' ? <Assets /> : null}
      </main>
    </div>
  )
}

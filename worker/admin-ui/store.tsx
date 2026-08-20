// One copy of the admin's data, in one place.
//
// Before this, four screens each fetched on mount and threw the result away when you navigated
// off, so the dashboard's counts went stale the moment you published anything and switching
// sections refetched from scratch. Here a list is read once, kept, and re-read only when a write
// makes it wrong — which is also what lets the dashboard and, later, a global search see
// everything without asking the Worker again.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { Asset } from './api'

export type Row = Record<string, any>

export type Stats = {
  projects: number
  publishedProjects: number
  projectDrafts: number
  certificates: number
  experience: number
  education: number
  skills: number
  socialLinks: number
  assets: number
  lastUpdated: string | null
}

/** The collection that is not a `/admin/api/<type>` list. */
export const ASSETS = 'assets'

/** The rows there is exactly one of, read through a different endpoint. */
const SINGLETONS = ['site', 'os']

type Store = {
  lists: Record<string, Row[]>
  assets: Asset[] | null
  stats: Stats | null
  error: string | null
  /** Fetch this collection unless it is already loaded or in flight. Safe to call repeatedly. */
  ensure: (type: string) => void
  /** Re-read one collection and the counts that depend on it, and hand back the fresh rows. */
  refresh: (type: string) => Promise<Row[]>
}

const AdminContext = createContext<Store | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<Record<string, Row[]>>({})
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Which collections have been asked for. A ref, not state, because it must be true the instant
  // `ensure` runs — two components mounting in the same tick would otherwise both fetch.
  const asked = useRef<Set<string>>(new Set())

  const read = useCallback(async (type: string): Promise<Row[]> => {
    if (type === ASSETS) {
      const items = await api.assets()
      setAssets(items)
      return items as unknown as Row[]
    }
    // A singleton is a list of one here. It costs nothing and it means the global search does not
    // need a second shape to look through.
    const items = SINGLETONS.includes(type)
      ? await api.singleton(type).then((row) => (row ? [row] : []))
      : await api.list(type)
    setLists((current) => ({ ...current, [type]: items }))
    return items
  }, [])

  const refresh = useCallback(
    async (type: string): Promise<Row[]> => {
      asked.current.add(type)
      try {
        const [items] = await Promise.all([read(type), api.stats().then(setStats)])
        setError(null)
        return items
      } catch (e) {
        setError((e as Error).message)
        return type === ASSETS ? ((assets ?? []) as unknown as Row[]) : (lists[type] ?? [])
      }
    },
    [read, assets, lists],
  )

  const ensure = useCallback(
    (type: string) => {
      if (asked.current.has(type)) return
      asked.current.add(type)
      read(type).catch((e) => setError((e as Error).message))
    },
    [read],
  )

  // The counts are wanted by the dashboard on arrival and are cheap — one batched read.
  useEffect(() => {
    api.stats().then(setStats).catch(() => {})
  }, [])

  return (
    <AdminContext.Provider value={{ lists, assets, stats, error, ensure, refresh }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin(): Store {
  const store = useContext(AdminContext)
  if (!store) throw new Error('useAdmin outside AdminProvider')
  return store
}

/** The rows of one collection, fetched on first use. */
export function useList(type: string): Row[] {
  const { lists, ensure } = useAdmin()
  useEffect(() => ensure(type), [type, ensure])
  return lists[type] ?? []
}

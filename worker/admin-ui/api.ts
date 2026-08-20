// Thin wrapper over the admin API. Same-origin, so the session cookie rides along automatically
// and the browser attaches the Origin header the Worker checks on every mutation.

const BASE = '/admin/api'

export class ApiError extends Error {
  status: number
  fields: string[]
  constructor(status: number, message: string, fields: string[] = []) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

/**
 * Where an expired session gets reported. The app shows a sign-in prompt over whatever screen is
 * open rather than unmounting it, so a session that runs out mid-edit costs a password, not the
 * work in the form.
 */
let onExpired: (() => void) | null = null
export const reportExpiredSession = (handler: () => void) => {
  onExpired = handler
}

async function request(path: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch(BASE + path, { credentials: 'same-origin', ...init })
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}
  if (!response.ok) {
    // `me` is the probe that asks whether we are signed in at all; its 401 is an answer, not a
    // session that just expired underneath someone.
    if (response.status === 401 && path !== '/me' && path !== '/login') onExpired?.()
    throw new ApiError(response.status, data.error ?? 'Request failed.', data.fields ?? [])
  }
  return data
}

const withJson = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  me: () => request('/me'),
  login: (password: string) => request('/login', withJson('POST', { password })),
  logout: () => request('/logout', { method: 'POST' }),
  stats: () => request('/stats'),

  list: (type: string) => request(`/${type}`).then((r) => r.items as Record<string, any>[]),
  create: (type: string, body: unknown) => request(`/${type}`, withJson('POST', body)),
  update: (type: string, id: string, body: unknown) =>
    request(`/${type}/${encodeURIComponent(id)}`, withJson('PATCH', body)),
  remove: (type: string, id: string) =>
    request(`/${type}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  reorder: (type: string, ids: string[]) => request(`/reorder/${type}`, withJson('POST', { ids })),

  // Projects only. A draft is stored beside the live row and read by nobody else, so saving one
  // changes nothing a visitor can see until publish promotes it.
  saveDraft: (id: string, body: unknown) =>
    request(`/projects/${encodeURIComponent(id)}/draft`, withJson('PUT', body)) as Promise<{
      updatedAt: string
    }>,
  discardDraft: (id: string, expectedUpdatedAt?: string) =>
    request(`/projects/${encodeURIComponent(id)}/draft`, withJson('DELETE', { expectedUpdatedAt })),
  /** A copy of a project, unpublished, under its own slug. */
  duplicate: (id: string) =>
    request(`/projects/${encodeURIComponent(id)}/duplicate`, withJson('POST', {})) as Promise<{
      id: string
    }>,
  publish: (id: string, expectedUpdatedAt?: string) =>
    request(`/projects/${encodeURIComponent(id)}/publish`, withJson('POST', { expectedUpdatedAt })) as Promise<{
      id: string
      updatedAt: string
    }>,

  singleton: (name: string) => request(`/${name}`).then((r) => r.item as Record<string, any> | null),
  saveSingleton: (name: string, body: unknown) => request(`/${name}`, withJson('PUT', body)),

  assets: () => request('/files').then((r) => r.items as Asset[]),
  deleteAsset: (key: string) => request(`/files/${key}`, { method: 'DELETE' }),
  upload: (file: File, kind: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    return request('/files', { method: 'POST', body: form }) as Promise<Asset>
  },
}

export type Asset = {
  key: string
  filename: string
  content_type: string
  size: number
  kind: string
  created_at?: string
  /** The rows still pointing at this file, by name. Empty means it is safe to delete. */
  usedBy?: string[]
}

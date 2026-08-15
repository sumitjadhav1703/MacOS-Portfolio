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

async function request(path: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch(BASE + path, { credentials: 'same-origin', ...init })
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}
  if (!response.ok) {
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
}

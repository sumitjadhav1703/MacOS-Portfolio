// Where you are in the admin, kept in the URL.
//
// The admin is one page served by the Worker's asset handler, so its routes live in the hash:
// the browser never asks the server for `#/projects/project-demo`, which means deep links,
// Back, and a refresh that lands where you were all work without a server-side route table or a
// router dependency.

export type Route = {
  /** Dashboard, a collection type, a singleton, or assets. */
  page: string
  /** The item being edited, when the route names one. */
  id?: string
}

export const HOME: Route = { page: 'dashboard' }

/** `#/projects/project-demo` → `{ page: 'projects', id: 'project-demo' }`. Junk falls home. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const page = parts[0]
  if (!page) return HOME
  return parts[1] ? { page, id: parts[1] } : { page }
}

/** The inverse, so links and history entries are written in exactly one place. */
export function hashFor(route: Route): string {
  const tail = route.id ? `/${encodeURIComponent(route.id)}` : ''
  return `#/${encodeURIComponent(route.page)}${tail}`
}

export const sameRoute = (a: Route, b: Route): boolean => a.page === b.page && a.id === b.id

import type { Env } from './env'
import { corsHeaders, fail, json, log } from './http'
import { TTL_SECONDS, cachedContent } from './content'
import { serveFile } from './files'
import { currentSession, handleLogin, handleLogout, originAllowed } from './auth'
import { handleAdminApi } from './admin'
import { askOriginAllowed, handleAsk } from './ask'

const MUTATIONS = ['POST', 'PUT', 'PATCH', 'DELETE']

/**
 * Public read API. Every endpoint is a slice of the one cached bundle, so the granular routes
 * cost no extra database reads and there is a single cache entry to invalidate on publish.
 * Nothing here can write, and nothing here reads a session.
 */
async function publicApi(
  path: string,
  env: Env,
  origin: string,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const { content } = await cachedContent(env, origin, ctx)

  const slice = (): unknown => {
    switch (path) {
      case '/api/content':
        return content
      case '/api/projects':
        return content.projects
      case '/api/certificates':
        return content.certificates
      case '/api/experience':
        return content.experience
      case '/api/education':
        return content.education
      case '/api/skills':
        return content.skills
      case '/api/social-links':
        return content.socialLinks
      case '/api/site':
        return content.site
      case '/api/os':
        return content.os
      case '/api/resume':
        return { url: content.site.resumeUrl }
      default:
        return undefined
    }
  }

  const match = path.match(/^\/api\/projects\/([a-z0-9-]+)$/)
  if (match) {
    const project = content.projects.find((p) => p.slug === match[1])
    return project ? json(project) : fail(404, 'Not found.')
  }

  const value = slice()
  return value === undefined ? null : json(value)
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const origin = url.origin
    const path = url.pathname

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    try {
      // ---- public: files -------------------------------------------------------------
      if (path.startsWith('/files/')) {
        if (request.method !== 'GET') return fail(405, 'Method not allowed.')
        return serveFile(env, decodeURIComponent(path.slice('/files/'.length)))
      }

      // ---- brand marks ------------------------------------------------------------------
      // The glyphs are Next's (app/icons/[slug]/route.ts). The admin runs on this origin and
      // renders the public site's own components in its preview, so the same relative URL has to
      // resolve here too.
      //
      // Passed through rather than redirected, because these are painted as CSS masks and a mask
      // image must be same-origin — a cross-origin one is silently dropped and the icon simply
      // never appears. The bytes are immutable and long-cached, so this is one subrequest per
      // glyph per colo, not per page view.
      if (path.startsWith('/icons/')) {
        if (request.method !== 'GET') return fail(405, 'Method not allowed.')
        const slug = path.slice('/icons/'.length)
        if (!/^[a-z0-9.-]{1,60}\.svg$/.test(slug)) return fail(404, 'Not found.')
        const glyph = await fetch(`${env.SITE_ORIGIN}/icons/${slug}`, {
          cf: { cacheEverything: true, cacheTtl: 86_400 },
        } as RequestInit)
        if (!glyph.ok) return fail(404, 'Not found.')
        return new Response(glyph.body, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=86400',
          },
        })
      }

      // ---- public: Ask Sumit -----------------------------------------------------------
      // The one POST outside /admin/api/*. It is allowed there because it writes nothing: it
      // reads the same published bundle every other public endpoint serves and returns prose
      // about it. It must be matched before the read-only guard below, which would 405 it.
      if (path === '/api/ask') {
        if (request.method !== 'POST') return fail(405, 'Method not allowed.')
        if (!askOriginAllowed(request, env)) return fail(403, 'Blocked.')
        const answered = await handleAsk(request, env, origin, ctx)
        const headers = new Headers(answered.headers)
        for (const [k, v] of Object.entries(corsHeaders(request, env))) headers.set(k, v)
        headers.set('Cache-Control', 'no-store')
        return new Response(answered.body, { status: answered.status, headers })
      }

      // ---- public: read-only content -------------------------------------------------
      if (path.startsWith('/api/')) {
        if (request.method !== 'GET') return fail(405, 'The public API is read-only.')
        const response = await publicApi(path, env, origin, ctx)
        if (!response) return fail(404, 'Not found.')
        const headers = new Headers(response.headers)
        for (const [k, v] of Object.entries(corsHeaders(request, env))) headers.set(k, v)
        headers.set('Cache-Control', `public, max-age=${TTL_SECONDS}, s-maxage=${TTL_SECONDS}`)
        return new Response(response.body, { status: response.status, headers })
      }

      // ---- admin API -----------------------------------------------------------------
      if (path.startsWith('/admin/api/')) {
        const parts = path.slice('/admin/api/'.length).split('/').filter(Boolean)

        if (parts[0] === 'login' && request.method === 'POST') {
          if (!originAllowed(request)) return fail(403, 'Blocked.')
          return handleLogin(request, env)
        }

        // Authorisation is enforced here, on the server, for every remaining admin route. The
        // admin UI's navigation is a convenience; this is the thing that actually stops anyone.
        const session = await currentSession(request, env)
        if (!session) {
          log('admin.unauthorised', { path, method: request.method })
          return fail(401, 'Not signed in.')
        }

        if (parts[0] === 'logout') return handleLogout(request, env)
        if (parts[0] === 'me') return json({ ok: true })

        if (MUTATIONS.includes(request.method) && !originAllowed(request)) {
          log('admin.bad_origin', { path, method: request.method })
          return fail(403, 'Blocked.')
        }

        return handleAdminApi(request, env, parts, origin)
      }

      // ---- admin UI ------------------------------------------------------------------
      if (path === '/') return Response.redirect(`${origin}/admin`, 302)
      return env.ASSETS.fetch(request)
    } catch (error) {
      // The client is told nothing beyond "it failed"; the detail goes to the log.
      log('server.error', { path, method: request.method, message: String(error) })
      return fail(500, 'Something went wrong.')
    }
  },
}

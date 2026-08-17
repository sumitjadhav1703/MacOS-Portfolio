import type { Env } from './env'
import { cachedContent } from './content'
import { allowedOrigins } from './http'
import { clientIp, fail, json, log } from './http'

/**
 * Ask Sumit's front door.
 *
 * This Worker does no AI work. It decides who may ask, how often, and what they are allowed to
 * be asked *about* — then hands the question and the published bundle to `sumitos-ai`, the
 * Python Worker, over a service binding.
 *
 * Handing the content over rather than letting the AI Worker read D1 is the whole privacy
 * design. `cachedContent` returns what `readContent` already filtered with `published = 1`, so
 * a draft is not withheld from the assistant by a rule someone has to remember — it is simply
 * never in the process that answers.
 */

/** Questions per IP per minute. Generous for a person, useless for a script. */
export const ASK_RATE = { limit: 20, period: 60 }

/** Longest body accepted before it is even parsed. The Python side re-checks the fields. */
const MAX_BODY_BYTES = 8_000

export function askOriginAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin')
  return !!origin && allowedOrigins(env).includes(origin)
}

export async function handleAsk(
  request: Request,
  env: Env,
  origin: string,
  ctx: ExecutionContext,
): Promise<Response> {
  const ip = clientIp(request)
  const { success } = await env.ASK_LIMIT.limit({ key: ip })
  if (!success) {
    log('ask.rate_limited', { ip })
    return fail(429, 'Too many questions. Try again in a minute.')
  }

  const length = Number(request.headers.get('Content-Length') ?? '0')
  if (length > MAX_BODY_BYTES) return fail(400, 'That message is too long.')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail(400, 'Invalid request.')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail(400, 'Invalid request.')
  }

  // Only the two fields the assistant is allowed to receive are copied across. A caller cannot
  // smuggle a `content` key of their own invention into the AI Worker by putting it in the
  // body, because this object is rebuilt rather than forwarded.
  const { message, history } = body as { message?: unknown; history?: unknown }
  const { content } = await cachedContent(env, origin, ctx)

  let upstream: Response
  try {
    upstream = await env.ASK_AI.fetch(
      new Request('https://sumitos-ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, content }),
      }),
    )
  } catch (error) {
    log('ask.unreachable', { message: String(error) })
    return fail(502, 'The assistant is unavailable.')
  }

  // A 4xx is the assistant rejecting the question and is passed through so the visitor learns
  // their message was too long or empty. A 5xx is ours, and is flattened to one sentence:
  // whatever the model or the runtime said about it belongs in the log, not in a response.
  if (upstream.status >= 500) {
    log('ask.provider_error', { status: upstream.status })
    return fail(502, 'The assistant is unavailable.')
  }

  const payload = await upstream.json().catch(() => null)
  if (payload === null) {
    log('ask.bad_payload', { status: upstream.status })
    return fail(502, 'The assistant is unavailable.')
  }
  return json(payload, { status: upstream.status })
}

// `/mcp` after authentication: origin check, then the SDK's stateless Streamable HTTP handler.
//
// By the time a request is here the OAuth provider has already refused anything without a valid,
// unexpired token for this resource, and index.ts has checked the scope and the rate limit. This
// file adds the one browser-facing defence the SDK leaves to its host (Origin validation, against
// DNS rebinding and cross-site calls) and the operational log lines.

import { createMcpHandler, originValidationResponse } from '@modelcontextprotocol/server'
import { log } from '../http'
import { createServer } from './tools'
import type { ReadonlyContextSource } from './types'

export type McpRequestOptions = {
  /** Hostnames a browser `Origin` may name. A request with no Origin (CLI clients) passes. */
  allowedOriginHostnames: string[]
}

export async function handleMcp(
  request: Request,
  source: ReadonlyContextSource,
  { allowedOriginHostnames }: McpRequestOptions,
): Promise<Response> {
  const rid = crypto.randomUUID()
  const blocked = originValidationResponse(request, allowedOriginHostnames)
  if (blocked) {
    log('mcp.bad_origin', { rid })
    return blocked
  }

  const started = Date.now()
  // Logged: which tool, how long, how many records. Never the query, never the text returned.
  const handler = createMcpHandler(
    () =>
      createServer(source, (tool, count) =>
        log('mcp.tool', { rid, tool, result_count: count, latency_ms: Date.now() - started }),
      ),
    { onerror: (error) => log('mcp.error', { rid, message: error.message.slice(0, 200) }) },
  )
  const response = await handler.fetch(request)
  log('mcp.request', { rid, status: response.status, latency_ms: Date.now() - started })
  return response
}

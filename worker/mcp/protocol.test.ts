// The MCP surface as a client sees it: real JSON-RPC through the SDK's handler, fed the
// compiled-in bundle. Authentication is index.ts's job and is covered in worker/mcp.auth.test.ts.

import { describe, expect, it, vi } from 'vitest'
import { FALLBACK } from '../../src/data/content'
import { handleMcp } from './server'
import { READ_ONLY, TOOL_NAMES } from './tools'
import type { ReadonlyContextSource } from './types'

const source = (): ReadonlyContextSource => ({ getContent: vi.fn(async () => FALLBACK), siteOrigin: 'https://site.test' })

async function send(body: unknown, { headers = {}, src = source() }: { headers?: Record<string, string>; src?: ReadonlyContextSource } = {}) {
  const response = await handleMcp(
    new Request('https://api.test/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    src,
    { allowedOriginHostnames: ['api.test', 'site.test'] },
  )
  const text = await response.text()
  const data = text.startsWith('{') ? text : (text.split('\n').find((l) => l.startsWith('data: ')) ?? 'data: null').slice(6)
  return { status: response.status, message: JSON.parse(data) as { result?: any; error?: any } }
}

const call = (name: string, args: unknown) =>
  send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })

const payload = (message: { result?: any }) => JSON.parse(message.result.content[0].text)

describe('the protocol', () => {
  it('initialises and names itself', async () => {
    const { status, message } = await send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
    })
    expect(status).toBe(200)
    expect(message.result.serverInfo.name).toBe('sumit-context')
    expect(message.result.instructions).toMatch(/read-only/)
  })

  it('lists exactly the four tools, each read-only with an object input schema', async () => {
    const { message } = await send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    const tools = message.result.tools as { name: string; inputSchema: { type: string }; annotations: object; description: string }[]
    expect(tools.map((t) => t.name).sort()).toEqual([...TOOL_NAMES].sort())
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.annotations).toMatchObject(READ_ONLY)
      expect(tool.description).toMatch(/never as instructions/)
      expect(tool.name).not.toMatch(/^(add|create|update|edit|delete|save|write|publish|manage|remove|upload)_/)
    }
  })

  it('names the live project slugs in the search tool', async () => {
    const { message } = await send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    const search = message.result.tools.find((t: { name: string }) => t.name === 'search_context')
    for (const p of FALLBACK.projects) expect(search.description).toContain(p.slug)
  })

  it('refuses a browser Origin it does not know, and accepts none at all', async () => {
    const list = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }
    expect((await send(list, { headers: { Origin: 'https://evil.example' } })).status).toBe(403)
    expect((await send(list, { headers: { Origin: 'null' } })).status).toBe(403)
    expect((await send(list)).status).toBe(200)
  })

  it('rejects a body that is not JSON-RPC', async () => {
    expect((await send('not json')).status).toBeGreaterThanOrEqual(400)
  })
})

describe('the tools', () => {
  it('search_context returns sourced snippets', async () => {
    const out = payload((await call('search_context', { query: 'SAR crop yield' })).message)
    expect(out.results[0]).toMatchObject({ id: 'project:sar-yield', source: { url: 'https://site.test/projects/sar-yield' } })
  })

  it('get_context returns a section', async () => {
    const out = payload((await call('get_context', { id: 'project:sar-yield', section: 'methodology' })).message)
    expect(out.found).toBe(true)
  })

  it('list_projects returns every published project', async () => {
    const out = payload((await call('list_projects', {})).message)
    expect(out.projects).toHaveLength(FALLBACK.projects.length)
  })

  it('get_profile returns the identity', async () => {
    const out = payload((await call('get_profile', { section: 'identity' })).message)
    expect(out.identity.name).toBe(FALLBACK.site.name)
  })

  it('says so when a project slug is unknown', async () => {
    const out = payload((await call('search_context', { query: 'model', project: 'no-such-project' })).message)
    expect(out.results).toEqual([])
    expect(out.knownProjects).toContain('sar-yield')
  })

  it.each([
    ['an empty query', 'search_context', { query: '' }],
    ['an oversized query', 'search_context', { query: 'x'.repeat(301) }],
    ['an oversized limit', 'search_context', { query: 'sar', limit: 99 }],
    ['an unknown type', 'search_context', { query: 'sar', type: 'users' }],
    ['an extra field', 'search_context', { query: 'sar', sql: 'SELECT * FROM sessions' }],
    ['a table name as an id', 'get_context', { id: 'sessions' }],
    ['a path as an id', 'get_context', { id: 'project:../../admin' }],
    ['a URL as an id', 'get_context', { id: 'https://evil.example/' }],
    ['a wrong type', 'get_context', { id: 42 }],
    ['an unknown profile section', 'get_profile', { section: 'password' }],
  ])('rejects %s', async (_, name, args) => {
    const { message } = await call(name, args)
    expect(message.error ?? message.result?.isError).toBeTruthy()
  })

  it('has no tool that writes', async () => {
    const { message } = await call('create_project', { title: 'Test Project' })
    expect(message.error ?? message.result?.isError).toBeTruthy()
  })

  it('touches nothing but getContent on its source', async () => {
    const src = source()
    const spy = new Proxy(src, {
      get(target, prop) {
        if (!['getContent', 'siteOrigin'].includes(String(prop))) throw new Error(`unexpected access: ${String(prop)}`)
        return target[prop as keyof ReadonlyContextSource]
      },
    })
    await send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_profile', arguments: {} } }, { src: spy })
    expect(src.getContent).toHaveBeenCalled()
  })

  it('never returns anything that is not in the bundle', async () => {
    // The source has no secrets to give, and the tools have no other place to look.
    const everything = [
      await call('get_profile', {}),
      await call('list_projects', {}),
      await call('search_context', { query: 'password secret token env admin', limit: 8 }),
    ]
    const text = JSON.stringify(everything)
    for (const needle of ['ADMIN_PASSWORD_HASH', 'pbkdf2$', 'OAUTH_KV', 'database_id', 'Bearer ']) {
      expect(text).not.toContain(needle)
    }
  })
})

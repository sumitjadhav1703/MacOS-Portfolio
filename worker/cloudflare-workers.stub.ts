// `cloudflare:workers` exists only inside workerd. The OAuth provider imports WorkerEntrypoint
// from it for an `instanceof` check; under vitest this empty class stands in (vitest.config.ts).
export class WorkerEntrypoint {}

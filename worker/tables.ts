// One declarative spec per content type, so the admin API needs a single CRUD handler instead of
// six near-identical ones. Request bodies are keyed by column name; anything not listed here is
// dropped rather than written, which is what keeps a crafted body from touching `published` on a
// table that has no such concept, or from setting `id` directly.

export type Field =
  | { kind: 'text'; max: number; required?: boolean; pattern?: RegExp }
  | { kind: 'url'; required?: boolean }
  | { kind: 'bool' }
  | { kind: 'int'; min?: number; max?: number }
  | { kind: 'json'; of: 'strings' | 'any'; max: number; urls?: true }

export type Spec = {
  table: string
  fields: Record<string, Field>
  /** Column whose value must be unique across the table, checked on write. */
  unique?: string
  /** Derives the primary key for a new row from the validated body. */
  id: (body: Record<string, unknown>) => string
  /** R2 key columns, consulted before an asset is deleted. */
  fileColumns: string[]
  /** The column that names a row, for messages about it — "used by AI Video Assistant". */
  label: string
}

const uuid = () => crypto.randomUUID()

const ORDERING: Record<string, Field> = {
  published: { kind: 'bool' },
  display_order: { kind: 'int', min: 0, max: 10_000 },
}

/**
 * A map lookup that is actually an allowlist.
 *
 * `SPECS[name]` on its own is not one. Every object inherits `constructor`, `toString`,
 * `valueOf` and `hasOwnProperty` from Object.prototype, so a truthiness check passes for names
 * nobody declared — and the spec that comes back has `table: undefined`, which reaches D1 as
 * `SELECT * FROM undefined`. Object.hasOwn is the difference between "this map declares that
 * key" and "something in the prototype chain answers to that name".
 *
 * Both maps are routed by request text, so both are read through this and nothing else.
 */
/**
 * The shape of a key this Worker generated: `portfolio/<kind>/<uuid>.<sniffed ext>`.
 *
 * Lives here rather than in files.ts because the file-key *columns* are validated against it on
 * every write, and files.ts already imports this module. One regex, so the thing that decides
 * what may be stored and the thing that decides what may be served cannot drift apart.
 */
export const ASSET_KEY =
  /^portfolio\/(resume|certificates|projects|profile|misc)\/[0-9a-f-]{36}\.(pdf|png|jpg|webp)$/

export const own = <T>(map: Record<string, T>, key: string | undefined): T | undefined =>
  key !== undefined && Object.hasOwn(map, key) ? map[key] : undefined

export const SPECS: Record<string, Spec> = {
  projects: {
    table: 'projects',
    label: 'title',
    unique: 'slug',
    id: (b) => `project-${String(b.slug)}`,
    fileColumns: ['cover_key'],
    fields: {
      slug: { kind: 'text', max: 60, required: true, pattern: /^[a-z0-9][a-z0-9-]*$/ },
      title: { kind: 'text', max: 120, required: true },
      desktop_label: { kind: 'text', max: 40 },
      tagline: { kind: 'text', max: 300 },
      status_label: { kind: 'text', max: 80 },
      status_ok: { kind: 'bool' },
      stack: { kind: 'json', of: 'strings', max: 40 },
      sections: { kind: 'json', of: 'any', max: 40 },
      links: { kind: 'json', of: 'any', max: 20, urls: true },
      aliases: { kind: 'json', of: 'strings', max: 20 },
      note: { kind: 'text', max: 800 },
      caveat: { kind: 'text', max: 800 },
      cover_key: { kind: 'text', max: 200, pattern: ASSET_KEY },
      featured: { kind: 'bool' },
      ...ORDERING,
    },
  },
  certificates: {
    table: 'certificates',
    label: 'title',
    id: uuid,
    fileColumns: ['file_key', 'image_key'],
    fields: {
      title: { kind: 'text', max: 160, required: true },
      issuer: { kind: 'text', max: 120 },
      issue_date: { kind: 'text', max: 20, pattern: /^(\d{4}(-\d{2}(-\d{2})?)?)?$/ },
      credential_url: { kind: 'url' },
      file_key: { kind: 'text', max: 200, pattern: ASSET_KEY },
      image_key: { kind: 'text', max: 200, pattern: ASSET_KEY },
      ...ORDERING,
    },
  },
  experience: {
    table: 'experience',
    label: 'title',
    id: uuid,
    fileColumns: [],
    fields: {
      title: { kind: 'text', max: 200, required: true },
      detail: { kind: 'text', max: 1200 },
      hint: { kind: 'text', max: 200 },
      ...ORDERING,
    },
  },
  education: {
    table: 'education',
    label: 'title',
    id: uuid,
    fileColumns: [],
    fields: {
      title: { kind: 'text', max: 200, required: true },
      detail: { kind: 'text', max: 1200 },
      hint: { kind: 'text', max: 200 },
      ...ORDERING,
    },
  },
  skills: {
    table: 'skills',
    label: 'heading',
    id: uuid,
    fileColumns: [],
    fields: {
      heading: { kind: 'text', max: 120, required: true },
      items: { kind: 'json', of: 'strings', max: 60 },
      ...ORDERING,
    },
  },
  'social-links': {
    table: 'social_links',
    label: 'label',
    id: uuid,
    fileColumns: [],
    fields: {
      slug: { kind: 'text', max: 40, required: true, pattern: /^[a-z0-9-]+$/ },
      label: { kind: 'text', max: 60, required: true },
      handle: { kind: 'text', max: 160 },
      url: { kind: 'url', required: true },
      pill: { kind: 'bool' },
      ...ORDERING,
    },
  },
}

/** The two singleton rows, updated in place rather than created and deleted. */
export const SINGLETONS: Record<
  string,
  { table: string; fields: Record<string, Field>; fileColumns: string[]; label: string }
> = {
  site: {
    table: 'site',
    // There is one row, so it names itself.
    label: 'Profile',
    fileColumns: ['resume_key'],
    fields: {
      name: { kind: 'text', max: 120 },
      initials: { kind: 'text', max: 4 },
      subtitle: { kind: 'text', max: 200 },
      paragraphs: { kind: 'json', of: 'strings', max: 12 },
      // The desktop builds `mailto:${email}?subject=…`, so `?` and `&` in an address would be
      // read as mailto parameters rather than as part of it. An explicit charset is narrower
      // than "anything that is not whitespace or @".
      email: { kind: 'text', max: 160, pattern: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/ },
      resume_key: { kind: 'text', max: 200, pattern: ASSET_KEY },
    },
  },
  os: {
    table: 'os_content',
    label: 'Shell & Ask Sumit',
    fileColumns: [],
    fields: {
      term: { kind: 'json', of: 'any', max: 60 },
      neofetch_art: { kind: 'text', max: 2000 },
      neofetch_rows: { kind: 'json', of: 'any', max: 20 },
      kb: { kind: 'json', of: 'any', max: 100 },
      ai_fallback: { kind: 'text', max: 1000 },
      ai_suggestions: { kind: 'json', of: 'strings', max: 12 },
      shortcuts: { kind: 'json', of: 'any', max: 40 },
    },
  },
}

export type Validated = { values: Record<string, string | number>; errors: string[] }

/**
 * The only URL schemes that may reach an href. `javascript:`, `data:` and `file:` are the ones
 * that matter: every one of these values is rendered by the desktop as a link the visitor can
 * click, so a scheme that executes is a stored XSS with a UI in front of it.
 *
 * Both places that accept a URL call this — the `url` field kind, and the entries of a `json`
 * field marked `urls`. Keeping it one function is what stops the two from drifting apart.
 */
export function urlAllowed(text: string): boolean {
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(text).protocol)
  } catch {
    return false
  }
}

/**
 * Server-side validation. Every admin write goes through this — the admin UI's own checks are a
 * convenience and are never the thing that keeps bad data out.
 *
 * `partial` is true for PATCH: absent keys are left alone, present ones are still validated, and
 * `required` is only enforced on create.
 */
export function validate(
  fields: Record<string, Field>,
  body: Record<string, unknown>,
  partial: boolean,
): Validated {
  const values: Record<string, string | number> = {}
  const errors: string[] = []

  for (const [name, field] of Object.entries(fields)) {
    const present = Object.prototype.hasOwnProperty.call(body, name)
    if (!present) {
      if (!partial && 'required' in field && field.required) errors.push(`${name} is required`)
      continue
    }
    const raw = body[name]

    switch (field.kind) {
      case 'text': {
        // `null` is how the admin UI clears an optional field, so it normalises to '' rather
        // than being rejected. It then goes through the same `required` and `pattern` checks as
        // any other value — short-circuiting here is what let {"slug": null} create a row with
        // an empty slug and an id of `project-`, and publish it. Same shape as `url` below.
        if (raw !== null && typeof raw !== 'string') {
          errors.push(`${name} must be text`)
          break
        }
        const text = raw === null ? '' : raw.trim()
        if (field.required && !text) errors.push(`${name} is required`)
        else if (text.length > field.max) errors.push(`${name} is longer than ${field.max} characters`)
        else if (text && field.pattern && !field.pattern.test(text)) errors.push(`${name} has an invalid format`)
        else values[name] = text
        break
      }
      case 'url': {
        const text = typeof raw === 'string' ? raw.trim() : ''
        if (!text) {
          if (field.required) errors.push(`${name} is required`)
          else values[name] = ''
          break
        }
        if (urlAllowed(text)) values[name] = text
        else errors.push(`${name} must be a valid http, https or mailto URL`)
        break
      }
      case 'bool':
        values[name] = raw === true || raw === 1 || raw === '1' ? 1 : 0
        break
      case 'int': {
        const n = typeof raw === 'number' ? raw : Number(raw)
        if (!Number.isInteger(n) || n < (field.min ?? -1e9) || n > (field.max ?? 1e9)) {
          errors.push(`${name} must be a whole number`)
        } else values[name] = n
        break
      }
      case 'json': {
        if (raw === null || raw === undefined) {
          values[name] = '[]'
          break
        }
        const isArray = Array.isArray(raw)
        if (!isArray && typeof raw !== 'object') {
          errors.push(`${name} must be a list or object`)
          break
        }
        const size = isArray ? raw.length : Object.keys(raw as object).length
        if (size > field.max) {
          errors.push(`${name} has more than ${field.max} entries`)
          break
        }
        if (field.of === 'strings' && (!isArray || (raw as unknown[]).some((v) => typeof v !== 'string'))) {
          errors.push(`${name} must be a list of text values`)
          break
        }
        if (field.urls) {
          const entries = (isArray ? raw : [raw]) as unknown[]
          const bad = entries.filter((entry) => {
            if (typeof entry !== 'object' || entry === null) return false
            const url = (entry as { url?: unknown }).url
            if (url === undefined || url === null || url === '') return false
            return typeof url !== 'string' || !urlAllowed(url.trim())
          })
          if (bad.length) {
            errors.push(`${name} contains a link that is not a valid http, https or mailto URL`)
            break
          }
        }
        const text = JSON.stringify(raw)
        // A hard ceiling on any single JSON cell, so a deeply nested body cannot blow up a row.
        if (text.length > 100_000) errors.push(`${name} is too large`)
        else values[name] = text
        break
      }
    }
  }

  return { values, errors }
}

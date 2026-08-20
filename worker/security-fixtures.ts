// One table of hostile inputs, imported by every suite that has a trust boundary to test.
//
// Spec §7 asks for exactly this and forbids the alternative: the same twelve strings copied into
// a dozen files, where adding a thirteenth means finding all twelve copies. A new attack string
// goes here once and every boundary gets it.

/** Schemes that must never reach an href. `mailto:` is allowed and is deliberately absent here. */
export const DANGEROUS_URLS = [
  'javascript:alert(1)',
  'JavaScript:alert(1)',
  '  javascript:alert(1)  ',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  'data:text/html,<script>alert(1)</script>',
  'file:///etc/passwd',
  'vbscript:msgbox(1)',
  'blob:https://example.com/x',
  'about:blank',
]

/** Schemes and shapes that must keep working — a guard that blocks these is too tight. */
export const SAFE_URLS = [
  'https://github.com/sumitjadhav1703/repo',
  'http://localhost:3000/preview',
  'mailto:someone@example.com',
  'https://example.com/path?q=1&r=2#frag',
  'https://xn--e1afmkfd.xn--p1ai/',
]

/**
 * Hosts that are not, on their own, a reason to reject a link. The portfolio links to demos on
 * hosts nobody can vet, and the Worker never fetches these URLs — it only renders them — so
 * treating them as SSRF candidates would block real content for no gain. Listed so the decision
 * is visible rather than implied by its absence.
 */
export const NOT_SSRF_RELEVANT = [
  'http://localhost:8080/',
  'http://127.0.0.1/',
  'http://169.254.169.254/latest/meta-data/',
  'http://10.0.0.1/',
  'http://[::1]/',
]

/** Text that must be stored and rendered as text, never interpreted. */
export const XSS_STRINGS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  "';alert(String.fromCharCode(88,83,83));//",
  '<svg/onload=alert(1)>',
  '{{constructor.constructor("alert(1)")()}}',
]

/** Shapes an injection attempt takes. D1 is only ever given bound parameters, never interpolation. */
export const SQL_STRINGS = [
  "' OR '1'='1",
  "'; DROP TABLE projects; --",
  "1' UNION SELECT id, expires_at FROM sessions --",
  "admin'--",
]

/** Values that must never be accepted where a slug or an R2 key is expected. */
export const TRAVERSAL_STRINGS = [
  '../../../etc/passwd',
  'portfolio/../../secret.pdf',
  '/etc/passwd',
  'portfolio/projects/../../../etc/passwd',
  '..%2f..%2fetc%2fpasswd',
  'portfolio\\projects\\x.png',
]

/** Text that must survive a round trip unmangled — the portfolio is not ASCII-only. */
export const UNICODE_STRINGS = [
  'Café résumé — naïve',
  '深度学习模型',
  '\u{1F680} Ship it \u{1F389}',
  'Z̓͡algo',
]

/**
 * Text carrying invisible characters. These must not be a way to smuggle one value past a check
 * while a human reads another — written as escapes so they stay visible in the source.
 */
export const INVISIBLE_STRINGS = [
  'safe\u200bname', // zero-width space
  'safe\u202ename', // right-to-left override
  'safe\u0000name', // NUL
  'safe\ufeffname', // byte-order mark
]

/** Session cookie values that must never authenticate. */
export const BAD_SESSION_IDS = [
  '',
  'not-a-session',
  'A'.repeat(64), // uppercase hex — the format check is lowercase only
  'a'.repeat(63), // one short
  'a'.repeat(65), // one long
  '../../../etc/passwd',
  "' OR 1=1 --",
  '<script>alert(1)</script>',
  `g${'a'.repeat(63)}`, // right length, not hex
]

/** File bodies that claim to be an image and are not. */
export const FAKE_FILES: { name: string; claimed: string; bytes: Uint8Array }[] = [
  { name: 'shell.png', claimed: 'image/png', bytes: new TextEncoder().encode('#!/bin/sh\nrm -rf /') },
  { name: 'page.png', claimed: 'image/png', bytes: new TextEncoder().encode('<html><script>alert(1)</script>') },
  { name: 'x.pdf', claimed: 'application/pdf', bytes: new TextEncoder().encode('not a pdf at all') },
  { name: 'php.jpg', claimed: 'image/jpeg', bytes: new TextEncoder().encode('<?php system($_GET[0]); ?>') },
]

/** Genuine leading bytes for each accepted type, for the cases that must be allowed through. */
export const REAL_FILES = {
  png: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
  jpg: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]),
  pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
  webp: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
}

/** A string longer than any field's maximum. */
export const OVERSIZED = 'x'.repeat(200_000)

/**
 * Anything matching this must never appear in a response body. Used as a blanket assertion over
 * every response an auth suite produces, so a future handler that starts echoing its input is
 * caught without anyone remembering to write a test for it.
 */
export const SECRET_SHAPES = [
  /pbkdf2\$/, // a stored hash, in any field
  /"password"\s*:/i, // the submitted password echoed back as a field
  /password_hash/i,
  /ADMIN_PASSWORD_HASH/,
  /expires_at/, // the column name; the API's own `expiresAt` is returned on purpose
  /"sid"\s*:/i, // a session id anywhere but the cookie
]

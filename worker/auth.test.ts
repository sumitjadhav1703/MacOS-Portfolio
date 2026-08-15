import { describe, expect, it } from 'vitest'
import { pbkdf2, verifyPassword } from './auth'

const encode = (b: Uint8Array) => btoa(String.fromCharCode(...b))

async function hash(password: string, iterations = 1000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derived = await pbkdf2(password, salt, iterations)
  return `pbkdf2$${iterations}$${encode(salt)}$${encode(derived)}`
}

describe('verifyPassword', () => {
  it('accepts the right password and rejects a wrong one', async () => {
    const stored = await hash('correct horse battery staple')
    expect(await verifyPassword('correct horse battery staple', stored)).toBe(true)
    expect(await verifyPassword('correct horse battery stapl', stored)).toBe(false)
    expect(await verifyPassword('', stored)).toBe(false)
  })

  it('fails closed on a malformed or missing secret rather than letting anything through', async () => {
    for (const stored of [
      '',
      'hunter2',
      'pbkdf2$notanumber$c2FsdA==$aGFzaA==',
      'pbkdf2$1$c2FsdA==$aGFzaA==', // iteration count below the floor
      'bcrypt$210000$c2FsdA==$aGFzaA==',
      'pbkdf2$210000$!!!notbase64!!!$aGFzaA==',
    ]) {
      expect(await verifyPassword('anything', stored)).toBe(false)
    }
  })

  it('rejects a hash derived with a different iteration count', async () => {
    const stored = await hash('secret', 1000)
    const tampered = stored.replace('$1000$', '$2000$')
    expect(await verifyPassword('secret', tampered)).toBe(false)
  })
})

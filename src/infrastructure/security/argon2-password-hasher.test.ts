import { describe, expect, it } from 'vitest'
import { Argon2PasswordHasher } from './argon2-password-hasher'

describe('Argon2PasswordHasher', () => {
  it('gera hash diferente do texto e verifica corretamente', async () => {
    const hasher = new Argon2PasswordHasher()
    const hash = await hasher.hash('Str0ng!Pass')
    expect(hash).not.toBe('Str0ng!Pass')
    expect(await hasher.verify('Str0ng!Pass', hash)).toBe(true)
  })

  it('retorna false para senha errada (sem lançar)', async () => {
    const hasher = new Argon2PasswordHasher()
    const hash = await hasher.hash('Str0ng!Pass')
    expect(await hasher.verify('errada', hash)).toBe(false)
  })

  it('retorna false para hash malformado (sem lançar)', async () => {
    const hasher = new Argon2PasswordHasher()
    expect(await hasher.verify('x', 'nao-e-um-hash')).toBe(false)
  })
})

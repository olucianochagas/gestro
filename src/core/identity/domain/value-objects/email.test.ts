import { describe, expect, it } from 'vitest'
import { Email } from './email'
import { InvalidEmailError } from '../errors/invalid-email.error'

describe('Email', () => {
  it('normaliza (trim + lowercase) um e-mail válido', () => {
    const result = Email.create('  User@Example.COM ')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.value).toBe('user@example.com')
  })

  it('rejeita e-mail sem @ com InvalidEmailError', () => {
    const result = Email.create('not-an-email')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidEmailError)
  })

  it('rejeita string vazia', () => {
    expect(Email.create('').ok).toBe(false)
  })
})

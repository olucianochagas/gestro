import { describe, expect, it } from 'vitest'
import { ProjectKey } from './project-key'
import { InvalidProjectKeyError } from '../errors/invalid-project-key.error'

describe('ProjectKey', () => {
  it('normaliza para maiúsculas', () => {
    const r = ProjectKey.create('ges')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.value).toBe('GES')
  })

  it('rejeita chave que começa com número', () => {
    const r = ProjectKey.create('1AB')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidProjectKeyError)
  })

  it('rejeita chave de 1 caractere e com mais de 10', () => {
    expect(ProjectKey.create('A').ok).toBe(false)
    expect(ProjectKey.create('A'.repeat(11)).ok).toBe(false)
  })

  it('rejeita caracteres especiais', () => {
    expect(ProjectKey.create('GE-S').ok).toBe(false)
  })
})

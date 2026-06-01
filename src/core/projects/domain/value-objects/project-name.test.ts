import { describe, expect, it } from 'vitest'
import { ProjectName } from './project-name'
import { InvalidProjectNameError } from '../errors/invalid-project-name.error'

describe('ProjectName', () => {
  it('aceita e faz trim de um nome válido', () => {
    const r = ProjectName.create('  Gestrô Core  ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.value).toBe('Gestrô Core')
  })

  it('rejeita nome vazio', () => {
    const r = ProjectName.create('   ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidProjectNameError)
  })

  it('rejeita nome com mais de 120 caracteres', () => {
    expect(ProjectName.create('a'.repeat(121)).ok).toBe(false)
  })
})

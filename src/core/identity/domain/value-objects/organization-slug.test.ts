import { describe, expect, it } from 'vitest'
import { OrganizationSlug } from './organization-slug'

describe('OrganizationSlug', () => {
  it('deriva slug a partir de um nome com acentos e espaços', () => {
    expect(OrganizationSlug.fromText('Workspace da Ana').value).toBe('workspace-da-ana')
  })

  it('colapsa caracteres não alfanuméricos em hífens', () => {
    expect(OrganizationSlug.fromText('Time   ###  X').value).toBe('time-x')
  })

  it('nunca retorna slug vazio (fallback)', () => {
    expect(OrganizationSlug.fromText('@@@').value.length).toBeGreaterThan(0)
  })
})

import { describe, expect, it } from 'vitest'
import { Email } from '@/core/identity/domain/value-objects/email'
import { OrganizationSlug } from '@/core/identity/domain/value-objects/organization-slug'
import { Role } from '@/core/identity/domain/value-objects/role'
import { ProjectKey } from '@/core/projects/domain/value-objects/project-key'
import { ProjectName } from '@/core/projects/domain/value-objects/project-name'
import { ProjectStatus } from '@/core/projects/domain/value-objects/project-status'

describe('fromTrusted dos Value Objects', () => {
  it('reconstrói valores válidos', () => {
    expect(Email.fromTrusted('ana@example.com').value).toBe('ana@example.com')
    expect(OrganizationSlug.fromTrusted('ana').value).toBe('ana')
    expect(Role.fromTrusted('OWNER').value).toBe('OWNER')
    expect(ProjectKey.fromTrusted('GES').value).toBe('GES')
    expect(ProjectName.fromTrusted('Gestrô Core').value).toBe('Gestrô Core')
    expect(ProjectStatus.fromTrusted('ACTIVE').value).toBe('ACTIVE')
  })

  it('lança em valores corrompidos (dado persistido inválido é excepcional)', () => {
    expect(() => Email.fromTrusted('invalido')).toThrow()
    expect(() => Role.fromTrusted('ADMIN')).toThrow()
    // '1AB' começa com dígito → falha o padrão mesmo após normalização (não vira válido).
    expect(() => ProjectKey.fromTrusted('1AB')).toThrow()
    expect(() => ProjectName.fromTrusted('')).toThrow()
    expect(() => ProjectStatus.fromTrusted('DONE')).toThrow()
  })
})

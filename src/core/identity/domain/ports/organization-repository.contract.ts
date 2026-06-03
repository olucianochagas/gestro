import { describe, expect, it, beforeEach } from 'vitest'
import type { OrganizationRepository } from './organization-repository'
import { Organization } from '../entities/organization'
import { OrganizationSlug } from '../value-objects/organization-slug'
import { FixedClock } from '@/test-support/fakes'

function buildOrg(id: string, slug: string, name = 'Workspace'): Organization {
  return Organization.restore(id, {
    name,
    slug: OrganizationSlug.fromTrusted(slug),
    ownerId: 'owner-1',
    createdAt: new FixedClock().now(),
  })
}

export function runOrganizationRepositoryContract(makeRepository: () => OrganizationRepository): void {
  describe('OrganizationRepository (contrato)', () => {
    let repo: OrganizationRepository

    beforeEach(() => {
      repo = makeRepository()
    })

    it('salva e recupera por id', async () => {
      await repo.save(buildOrg('o-1', 'ana'))
      const found = await repo.findById('o-1')
      expect(found?.slug.value).toBe('ana')
    })

    it('retorna null para inexistente', async () => {
      expect(await repo.findById('nope')).toBeNull()
    })

    it('save é upsert por id', async () => {
      await repo.save(buildOrg('o-1', 'ana', 'Antigo'))
      await repo.save(buildOrg('o-1', 'ana', 'Novo'))
      const found = await repo.findById('o-1')
      expect(found?.name).toBe('Novo')
    })

    it('aceita slugs iguais em orgs distintas (sem unicidade de slug)', async () => {
      await repo.save(buildOrg('o-1', 'ana'))
      await repo.save(buildOrg('o-2', 'ana'))
      expect((await repo.findById('o-1'))?.slug.value).toBe('ana')
      expect((await repo.findById('o-2'))?.slug.value).toBe('ana')
    })
  })
}

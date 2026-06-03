import { describe, expect, it, beforeEach } from 'vitest'
import type { MembershipRepository } from './membership-repository'
import { Membership } from '../entities/membership'
import { Role } from '../value-objects/role'

function buildMembership(userId: string, orgId: string): Membership {
  return Membership.create({ userId, organizationId: orgId, role: Role.OWNER })
}

export function runMembershipRepositoryContract(makeRepository: () => MembershipRepository): void {
  describe('MembershipRepository (contrato)', () => {
    let repo: MembershipRepository

    beforeEach(() => {
      repo = makeRepository()
    })

    it('salva e lista por usuário', async () => {
      await repo.save(buildMembership('u-1', 'o-1'))
      const list = await repo.findByUser('u-1')
      expect(list).toHaveLength(1)
      expect(list[0].organizationId).toBe('o-1')
      expect(list[0].role.value).toBe('OWNER')
    })

    it('usuário sem membership retorna lista vazia', async () => {
      expect(await repo.findByUser('nope')).toEqual([])
    })

    it('lista múltiplas organizações do mesmo usuário', async () => {
      await repo.save(buildMembership('u-1', 'o-1'))
      await repo.save(buildMembership('u-1', 'o-2'))
      const list = await repo.findByUser('u-1')
      expect(list.map((m) => m.organizationId).sort()).toEqual(['o-1', 'o-2'])
    })

    it('save é idempotente por (usuário, organização)', async () => {
      await repo.save(buildMembership('u-1', 'o-1'))
      await repo.save(buildMembership('u-1', 'o-1'))
      const list = await repo.findByUser('u-1')
      expect(list).toHaveLength(1)
    })
  })
}

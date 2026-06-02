import { describe, expect, it, beforeEach } from 'vitest'
import type { UserRepository } from './user-repository'
import { User } from '../entities/user'
import { Email } from '../value-objects/email'
import { FixedClock } from '@/test-support/fakes'

function buildUser(id: string, emailRaw: string, name = 'Ana', passwordHash = 'hash'): User {
  return User.restore(id, {
    name,
    email: Email.fromTrusted(emailRaw),
    passwordHash,
    createdAt: new FixedClock().now(),
  })
}

export function runUserRepositoryContract(makeRepository: () => UserRepository): void {
  describe('UserRepository (contrato)', () => {
    let repo: UserRepository

    beforeEach(() => {
      repo = makeRepository()
    })

    it('salva e recupera por id', async () => {
      await repo.save(buildUser('u-1', 'ana@example.com'))
      const found = await repo.findById('u-1')
      expect(found?.email.value).toBe('ana@example.com')
    })

    it('recupera por e-mail', async () => {
      await repo.save(buildUser('u-1', 'ana@example.com'))
      const found = await repo.findByEmail(Email.fromTrusted('ana@example.com'))
      expect(found?.id).toBe('u-1')
    })

    it('retorna null para inexistente', async () => {
      expect(await repo.findById('nope')).toBeNull()
      expect(await repo.findByEmail(Email.fromTrusted('x@y.com'))).toBeNull()
    })

    it('save é upsert por id', async () => {
      await repo.save(buildUser('u-1', 'ana@example.com'))
      await repo.save(buildUser('u-1', 'ana@example.com', 'Ana Maria', 'hash2'))
      const found = await repo.findById('u-1')
      expect(found?.name).toBe('Ana Maria')
      expect(found?.passwordHash).toBe('hash2')
    })
  })
}

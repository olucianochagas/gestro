import { describe, expect, it } from 'vitest'
import { GetCurrentUser } from './get-current-user'
import { RegisterUser } from '../commands/register-user'
import { InMemoryUserRepository } from '@/infrastructure/persistence/in-memory/in-memory-user.repository'
import { InMemoryOrganizationRepository } from '@/infrastructure/persistence/in-memory/in-memory-organization.repository'
import { InMemoryMembershipRepository } from '@/infrastructure/persistence/in-memory/in-memory-membership.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'
import { InMemoryTransactionRunner } from '@/infrastructure/persistence/in-memory/in-memory-transaction-runner'

class StubHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`
  }
  async verify(): Promise<boolean> {
    return true
  }
}

describe('GetCurrentUser', () => {
  it('retorna UserDTO para um id existente', async () => {
    const users = new InMemoryUserRepository()
    const register = new RegisterUser(
      users,
      new InMemoryOrganizationRepository(),
      new InMemoryMembershipRepository(),
      new StubHasher(),
      new SequentialIdGenerator(),
      new FixedClock(),
      new InMemoryTransactionRunner(),
    )
    await register.execute({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' })

    const dto = await new GetCurrentUser(users).execute({ userId: 'id-1' })
    expect(dto).toEqual({ id: 'id-1', name: 'Ana', email: 'ana@example.com' })
  })

  it('retorna null para id inexistente', async () => {
    const dto = await new GetCurrentUser(new InMemoryUserRepository()).execute({ userId: 'nao-existe' })
    expect(dto).toBeNull()
  })
})

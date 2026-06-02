import { describe, expect, it } from 'vitest'
import { AuthenticateUser } from './authenticate-user'
import { RegisterUser } from './register-user'
import { InMemoryUserRepository } from '@/infrastructure/persistence/in-memory/in-memory-user.repository'
import { InMemoryOrganizationRepository } from '@/infrastructure/persistence/in-memory/in-memory-organization.repository'
import { InMemoryMembershipRepository } from '@/infrastructure/persistence/in-memory/in-memory-membership.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error'

class StubHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`
  }
}

async function makeSut() {
  const users = new InMemoryUserRepository()
  const orgs = new InMemoryOrganizationRepository()
  const memberships = new InMemoryMembershipRepository()
  const hasher = new StubHasher()
  const register = new RegisterUser(users, orgs, memberships, hasher, new SequentialIdGenerator(), new FixedClock())
  await register.execute({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' })
  const sut = new AuthenticateUser(users, memberships, hasher)
  return { sut }
}

describe('AuthenticateUser', () => {
  it('retorna SessionData com userId e organizationId quando as credenciais batem', async () => {
    const { sut } = await makeSut()
    const result = await sut.execute({ email: 'ana@example.com', password: 'Str0ng!Pass' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.userId).toBe('id-1')
      expect(result.value.organizationId).toBe('id-2')
    }
  })

  it('falha com InvalidCredentials para senha errada', async () => {
    const { sut } = await makeSut()
    const result = await sut.execute({ email: 'ana@example.com', password: 'errada' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidCredentialsError)
  })

  it('falha com InvalidCredentials (genérico) para e-mail inexistente', async () => {
    const { sut } = await makeSut()
    const result = await sut.execute({ email: 'ninguem@example.com', password: 'Str0ng!Pass' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidCredentialsError)
  })
})

import { describe, expect, it } from 'vitest'
import { RegisterUser } from './register-user'
import { InMemoryUserRepository } from '@/infrastructure/persistence/in-memory/in-memory-user.repository'
import { InMemoryOrganizationRepository } from '@/infrastructure/persistence/in-memory/in-memory-organization.repository'
import { InMemoryMembershipRepository } from '@/infrastructure/persistence/in-memory/in-memory-membership.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'
import { EmailAlreadyInUseError } from '../../domain/errors/email-already-in-use.error'
import { InvalidEmailError } from '../../domain/errors/invalid-email.error'
import { Email } from '../../domain/value-objects/email'

class StubHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`
  }
}

function makeSut() {
  const users = new InMemoryUserRepository()
  const orgs = new InMemoryOrganizationRepository()
  const memberships = new InMemoryMembershipRepository()
  const sut = new RegisterUser(
    users,
    orgs,
    memberships,
    new StubHasher(),
    new SequentialIdGenerator(),
    new FixedClock(),
  )
  return { sut, users, memberships }
}

describe('RegisterUser', () => {
  it('cria usuário + organização pessoal + membership OWNER', async () => {
    const { sut, users, memberships } = makeSut()

    const result = await sut.execute({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({ id: 'id-1', name: 'Ana', email: 'ana@example.com' })

    const saved = await users.findByEmail((Email.create('ana@example.com') as { value: Email }).value)
    expect(saved?.passwordHash).toBe('hashed:Str0ng!Pass')

    const userMemberships = await memberships.findByUser('id-1')
    expect(userMemberships).toHaveLength(1)
    expect(userMemberships[0].role.value).toBe('OWNER')
  })

  it('rejeita e-mail duplicado', async () => {
    const { sut } = makeSut()
    await sut.execute({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' })

    const result = await sut.execute({ name: 'Outra', email: 'ANA@example.com', password: 'Str0ng!Pass' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(EmailAlreadyInUseError)
  })

  it('rejeita e-mail inválido', async () => {
    const { sut } = makeSut()
    const result = await sut.execute({ name: 'Ana', email: 'invalido', password: 'Str0ng!Pass' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidEmailError)
  })
})

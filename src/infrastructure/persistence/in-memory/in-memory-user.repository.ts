import type { UserRepository } from '@/core/identity/domain/ports/user-repository'
import type { User } from '@/core/identity/domain/entities/user'
import type { Email } from '@/core/identity/domain/value-objects/email'

export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>()

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.byId.values()) {
      if (user.email.value === email.value) return user
    }
    return null
  }

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null
  }

  async save(user: User): Promise<void> {
    this.byId.set(user.id, user)
  }
}

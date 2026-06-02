import type { MembershipRepository } from '@/core/identity/domain/ports/membership-repository'
import type { Membership } from '@/core/identity/domain/entities/membership'

export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly all: Membership[] = []

  async save(membership: Membership): Promise<void> {
    this.all.push(membership)
  }

  async findByUser(userId: string): Promise<Membership[]> {
    return this.all.filter((m) => m.userId === userId)
  }
}

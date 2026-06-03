import type { MembershipRepository } from '@/core/identity/domain/ports/membership-repository'
import type { Membership } from '@/core/identity/domain/entities/membership'

export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly all: Membership[] = []

  async save(membership: Membership): Promise<void> {
    const index = this.all.findIndex(
      (m) => m.userId === membership.userId && m.organizationId === membership.organizationId,
    )
    if (index >= 0) this.all[index] = membership
    else this.all.push(membership)
  }

  async findByUser(userId: string): Promise<Membership[]> {
    return this.all.filter((m) => m.userId === userId)
  }
}

import type { Membership } from '../entities/membership'

export interface MembershipRepository {
  save(membership: Membership): Promise<void>
  findByUser(userId: string): Promise<Membership[]>
}

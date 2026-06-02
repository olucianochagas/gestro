import type { MembershipRepository } from '@/core/identity/domain/ports/membership-repository'
import type { Membership } from '@/core/identity/domain/entities/membership'
import type { PgDatabase } from './pg-database'
import { rowToMembership, type MembershipRow } from './mappers/membership.mapper'

export class PgMembershipRepository implements MembershipRepository {
  constructor(private readonly db: PgDatabase) {}

  async save(membership: Membership): Promise<void> {
    await this.db.query(
      `INSERT INTO memberships (user_id, organization_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role`,
      [membership.userId, membership.organizationId, membership.role.value],
    )
  }

  async findByUser(userId: string): Promise<Membership[]> {
    const { rows } = await this.db.query<MembershipRow>('SELECT * FROM memberships WHERE user_id = $1', [userId])
    return rows.map(rowToMembership)
  }
}

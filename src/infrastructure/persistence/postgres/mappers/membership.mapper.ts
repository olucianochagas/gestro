import { Membership } from '@/core/identity/domain/entities/membership'
import { Role } from '@/core/identity/domain/value-objects/role'

export type MembershipRow = {
  user_id: string
  organization_id: string
  role: string
}

export function rowToMembership(row: MembershipRow): Membership {
  return Membership.create({
    userId: row.user_id,
    organizationId: row.organization_id,
    role: Role.fromTrusted(row.role),
  })
}

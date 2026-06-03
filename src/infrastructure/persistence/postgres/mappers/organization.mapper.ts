import { Organization } from '@/core/identity/domain/entities/organization'
import { OrganizationSlug } from '@/core/identity/domain/value-objects/organization-slug'

export type OrganizationRow = {
  id: string
  name: string
  slug: string
  owner_id: string
  created_at: Date
}

export function rowToOrganization(row: OrganizationRow): Organization {
  return Organization.restore(row.id, {
    name: row.name,
    slug: OrganizationSlug.fromTrusted(row.slug),
    ownerId: row.owner_id,
    createdAt: new Date(row.created_at),
  })
}

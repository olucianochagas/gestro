import type { OrganizationRepository } from '@/core/identity/domain/ports/organization-repository'
import type { Organization } from '@/core/identity/domain/entities/organization'
import type { PgDatabase } from './pg-database'
import { rowToOrganization, type OrganizationRow } from './mappers/organization.mapper'

export class PgOrganizationRepository implements OrganizationRepository {
  constructor(private readonly db: PgDatabase) {}

  async save(organization: Organization): Promise<void> {
    await this.db.query(
      `INSERT INTO organizations (id, name, slug, owner_id, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         owner_id = EXCLUDED.owner_id,
         created_at = EXCLUDED.created_at`,
      [organization.id, organization.name, organization.slug.value, organization.ownerId, organization.createdAt],
    )
  }

  async findById(id: string): Promise<Organization | null> {
    const { rows } = await this.db.query<OrganizationRow>('SELECT * FROM organizations WHERE id = $1', [id])
    return rows[0] ? rowToOrganization(rows[0]) : null
  }
}

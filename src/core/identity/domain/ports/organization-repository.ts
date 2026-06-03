import type { Organization } from '../entities/organization'

export interface OrganizationRepository {
  save(organization: Organization): Promise<void>
  findById(id: string): Promise<Organization | null>
}

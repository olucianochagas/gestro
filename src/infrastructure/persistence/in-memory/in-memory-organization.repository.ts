import type { OrganizationRepository } from '@/core/identity/domain/ports/organization-repository'
import type { Organization } from '@/core/identity/domain/entities/organization'

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private readonly byId = new Map<string, Organization>()

  async save(organization: Organization): Promise<void> {
    this.byId.set(organization.id, organization)
  }
}

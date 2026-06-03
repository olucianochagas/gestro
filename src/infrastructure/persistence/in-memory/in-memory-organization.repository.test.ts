import { runOrganizationRepositoryContract } from '@/core/identity/domain/ports/organization-repository.contract'
import { InMemoryOrganizationRepository } from './in-memory-organization.repository'

runOrganizationRepositoryContract(() => new InMemoryOrganizationRepository())

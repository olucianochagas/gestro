import { runMembershipRepositoryContract } from '@/core/identity/domain/ports/membership-repository.contract'
import { InMemoryMembershipRepository } from './in-memory-membership.repository'

runMembershipRepositoryContract(() => new InMemoryMembershipRepository())

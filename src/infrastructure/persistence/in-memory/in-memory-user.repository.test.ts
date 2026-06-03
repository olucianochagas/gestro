import { runUserRepositoryContract } from '@/core/identity/domain/ports/user-repository.contract'
import { InMemoryUserRepository } from './in-memory-user.repository'

runUserRepositoryContract(() => new InMemoryUserRepository())

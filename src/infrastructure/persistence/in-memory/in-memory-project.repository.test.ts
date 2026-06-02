import { runProjectRepositoryContract } from '@/core/projects/domain/ports/project-repository.contract'
import { InMemoryProjectRepository } from './in-memory-project.repository'

runProjectRepositoryContract(() => new InMemoryProjectRepository())

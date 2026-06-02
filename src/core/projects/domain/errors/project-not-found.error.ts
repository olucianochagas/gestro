import { DomainError } from '@/core/shared/domain/domain-error'

export class ProjectNotFoundError extends DomainError {
  readonly code = 'PROJECTS.NOT_FOUND'
  constructor() {
    super('Projeto não encontrado.')
  }
}

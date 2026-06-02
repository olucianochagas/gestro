import { DomainError } from '@/core/shared/domain/domain-error'

export class InvalidProjectNameError extends DomainError {
  readonly code = 'PROJECTS.INVALID_NAME'
  constructor() {
    super('Nome de projeto inválido (1 a 120 caracteres).')
  }
}

import { DomainError } from '@/core/shared/domain/domain-error'

export class DuplicateProjectKeyError extends DomainError {
  readonly code = 'PROJECTS.DUPLICATE_KEY'
  constructor() {
    super('Já existe um projeto com esta chave nesta organização.')
  }
}

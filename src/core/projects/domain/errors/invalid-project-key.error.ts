import { DomainError } from '@/core/shared/domain/domain-error'

export class InvalidProjectKeyError extends DomainError {
  readonly code = 'PROJECTS.INVALID_KEY'
  constructor() {
    super('Chave inválida. Use 2 a 10 caracteres: letra inicial e A–Z/0–9 (ex.: GES).')
  }
}

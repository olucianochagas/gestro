import { DomainError } from '@/core/shared/domain/domain-error'

export class InvalidEmailError extends DomainError {
  readonly code = 'IDENTITY.INVALID_EMAIL'
  constructor(raw: string) {
    super(`E-mail inválido: "${raw}".`)
  }
}

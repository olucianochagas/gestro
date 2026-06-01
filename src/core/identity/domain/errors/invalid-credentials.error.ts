import { DomainError } from '@/core/shared/domain/domain-error'

export class InvalidCredentialsError extends DomainError {
  readonly code = 'IDENTITY.INVALID_CREDENTIALS'
  constructor() {
    super('Credenciais inválidas.')
  }
}

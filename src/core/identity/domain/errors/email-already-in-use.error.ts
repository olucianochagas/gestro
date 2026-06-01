import { DomainError } from '@/core/shared/domain/domain-error'

export class EmailAlreadyInUseError extends DomainError {
  readonly code = 'IDENTITY.EMAIL_ALREADY_IN_USE'
  constructor() {
    super('Este e-mail já está em uso.')
  }
}

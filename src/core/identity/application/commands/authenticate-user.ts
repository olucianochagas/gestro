import type { UseCase } from '@/core/shared/application/use-case'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { Email } from '../../domain/value-objects/email'
import type { UserRepository } from '../../domain/ports/user-repository'
import type { MembershipRepository } from '../../domain/ports/membership-repository'
import type { PasswordHasher } from '../../domain/ports/password-hasher'
import type { SessionData } from '../../domain/ports/session-service'
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error'

export interface AuthenticateUserInput {
  email: string
  password: string
}

export class AuthenticateUser
  implements UseCase<AuthenticateUserInput, Result<SessionData, InvalidCredentialsError>>
{
  constructor(
    private readonly users: UserRepository,
    private readonly memberships: MembershipRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<Result<SessionData, InvalidCredentialsError>> {
    const emailResult = Email.create(input.email)
    if (!emailResult.ok) return err(new InvalidCredentialsError())

    const user = await this.users.findByEmail(emailResult.value)
    if (!user) return err(new InvalidCredentialsError())

    const valid = await this.hasher.verify(input.password, user.passwordHash)
    if (!valid) return err(new InvalidCredentialsError())

    // Invariante do esqueleto: 1 organização (pessoal) por usuário, criada no RegisterUser.
    // Ao introduzir multi-org/convites, esta seleção precisará de um critério explícito
    // (ex.: org ativa selecionada pelo usuário) em vez de simplesmente memberships[0].
    const memberships = await this.memberships.findByUser(user.id)
    const membership = memberships[0]
    if (!membership) return err(new InvalidCredentialsError())

    return ok({ userId: user.id, organizationId: membership.organizationId })
  }
}

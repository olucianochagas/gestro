import type { UseCase } from '@/core/shared/application/use-case'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'
import type { TransactionRunner } from '@/core/shared/application/transaction-runner'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { Email } from '../../domain/value-objects/email'
import { OrganizationSlug } from '../../domain/value-objects/organization-slug'
import { Role } from '../../domain/value-objects/role'
import { User } from '../../domain/entities/user'
import { Organization } from '../../domain/entities/organization'
import { Membership } from '../../domain/entities/membership'
import type { UserRepository } from '../../domain/ports/user-repository'
import type { OrganizationRepository } from '../../domain/ports/organization-repository'
import type { MembershipRepository } from '../../domain/ports/membership-repository'
import type { PasswordHasher } from '../../domain/ports/password-hasher'
import { InvalidEmailError } from '../../domain/errors/invalid-email.error'
import { EmailAlreadyInUseError } from '../../domain/errors/email-already-in-use.error'
import { type UserDTO, toUserDTO } from '../dtos/user.dto'

export interface RegisterUserInput {
  name: string
  email: string
  password: string
}

type RegisterUserError = InvalidEmailError | EmailAlreadyInUseError

export class RegisterUser implements UseCase<RegisterUserInput, Result<UserDTO, RegisterUserError>> {
  constructor(
    private readonly users: UserRepository,
    private readonly organizations: OrganizationRepository,
    private readonly memberships: MembershipRepository,
    private readonly hasher: PasswordHasher,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly tx: TransactionRunner,
  ) {}

  async execute(input: RegisterUserInput): Promise<Result<UserDTO, RegisterUserError>> {
    const emailResult = Email.create(input.email)
    if (!emailResult.ok) return err(emailResult.error)
    const email = emailResult.value

    const existing = await this.users.findByEmail(email)
    if (existing) return err(new EmailAlreadyInUseError())

    const passwordHash = await this.hasher.hash(input.password)
    const deps = { idGenerator: this.idGenerator, clock: this.clock }

    const user = User.create({ name: input.name, email, passwordHash }, deps)
    const organization = Organization.create(
      {
        name: `Workspace de ${input.name}`,
        slug: OrganizationSlug.fromText(input.name),
        ownerId: user.id,
      },
      deps,
    )
    const membership = Membership.create({
      userId: user.id,
      organizationId: organization.id,
      role: Role.OWNER,
    })

    return this.tx.run(async () => {
      await this.users.save(user)
      await this.organizations.save(organization)
      await this.memberships.save(membership)
      return ok(toUserDTO(user))
    })
  }
}

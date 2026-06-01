import { Entity } from '@/core/shared/domain/entity'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'
import type { Email } from '../value-objects/email'

interface UserProps {
  name: string
  email: Email
  passwordHash: string
  createdAt: Date
}

export class User extends Entity<string> {
  private readonly props: UserProps

  private constructor(id: string, props: UserProps) {
    super(id)
    this.props = props
  }

  get name(): string {
    return this.props.name
  }
  get email(): Email {
    return this.props.email
  }
  get passwordHash(): string {
    return this.props.passwordHash
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt)
  }

  static create(
    input: { name: string; email: Email; passwordHash: string },
    deps: { idGenerator: IdGenerator; clock: Clock },
  ): User {
    return new User(deps.idGenerator.generate(), {
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: deps.clock.now(),
    })
  }

  static restore(id: string, props: UserProps): User {
    return new User(id, props)
  }
}

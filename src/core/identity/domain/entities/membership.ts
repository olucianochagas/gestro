import type { Role } from '../value-objects/role'

interface MembershipProps {
  userId: string
  organizationId: string
  role: Role
}

export class Membership {
  private readonly props: MembershipProps

  private constructor(props: MembershipProps) {
    this.props = props
  }

  get userId(): string {
    return this.props.userId
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get role(): Role {
    return this.props.role
  }

  static create(input: { userId: string; organizationId: string; role: Role }): Membership {
    return new Membership(input)
  }
}

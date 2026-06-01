import { Entity } from '@/core/shared/domain/entity'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'
import type { OrganizationSlug } from '../value-objects/organization-slug'

interface OrganizationProps {
  name: string
  slug: OrganizationSlug
  ownerId: string
  createdAt: Date
}

export class Organization extends Entity<string> {
  private readonly props: OrganizationProps

  private constructor(id: string, props: OrganizationProps) {
    super(id)
    this.props = props
  }

  get name(): string {
    return this.props.name
  }
  get slug(): OrganizationSlug {
    return this.props.slug
  }
  get ownerId(): string {
    return this.props.ownerId
  }
  get createdAt(): Date {
    return this.props.createdAt
  }

  static create(
    input: { name: string; slug: OrganizationSlug; ownerId: string },
    deps: { idGenerator: IdGenerator; clock: Clock },
  ): Organization {
    return new Organization(deps.idGenerator.generate(), {
      name: input.name,
      slug: input.slug,
      ownerId: input.ownerId,
      createdAt: deps.clock.now(),
    })
  }

  static restore(id: string, props: OrganizationProps): Organization {
    return new Organization(id, props)
  }
}

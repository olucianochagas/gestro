import { Entity } from '@/core/shared/domain/entity'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'
import type { ProjectName } from '../value-objects/project-name'
import type { ProjectKey } from '../value-objects/project-key'
import { ProjectStatus } from '../value-objects/project-status'

interface ProjectProps {
  organizationId: string
  key: ProjectKey
  name: ProjectName
  description: string
  status: ProjectStatus
  createdBy: string
  createdAt: Date
}

export class Project extends Entity<string> {
  private readonly props: ProjectProps

  private constructor(id: string, props: ProjectProps) {
    super(id)
    this.props = props
  }

  get organizationId(): string {
    return this.props.organizationId
  }
  get key(): ProjectKey {
    return this.props.key
  }
  get name(): ProjectName {
    return this.props.name
  }
  get description(): string {
    return this.props.description
  }
  get status(): ProjectStatus {
    return this.props.status
  }
  get createdBy(): string {
    return this.props.createdBy
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt)
  }

  static create(
    input: {
      organizationId: string
      key: ProjectKey
      name: ProjectName
      description: string
      createdBy: string
    },
    deps: { idGenerator: IdGenerator; clock: Clock },
  ): Project {
    return new Project(deps.idGenerator.generate(), {
      organizationId: input.organizationId,
      key: input.key,
      name: input.name,
      description: input.description,
      status: ProjectStatus.ACTIVE,
      createdBy: input.createdBy,
      createdAt: deps.clock.now(),
    })
  }

  static restore(id: string, props: ProjectProps): Project {
    return new Project(id, props)
  }
}

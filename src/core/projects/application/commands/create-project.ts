import type { UseCase } from '@/core/shared/application/use-case'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { ProjectName } from '../../domain/value-objects/project-name'
import { ProjectKey } from '../../domain/value-objects/project-key'
import { Project } from '../../domain/entities/project'
import type { ProjectRepository } from '../../domain/ports/project-repository'
import { InvalidProjectNameError } from '../../domain/errors/invalid-project-name.error'
import { InvalidProjectKeyError } from '../../domain/errors/invalid-project-key.error'
import { DuplicateProjectKeyError } from '../../domain/errors/duplicate-project-key.error'
import { type ProjectDTO, toProjectDTO } from '../dtos/project.dto'

export interface CreateProjectInput {
  organizationId: string
  createdBy: string
  name: string
  key: string
  description: string
}

type CreateProjectError =
  | InvalidProjectNameError
  | InvalidProjectKeyError
  | DuplicateProjectKeyError

export class CreateProject
  implements UseCase<CreateProjectInput, Result<ProjectDTO, CreateProjectError>>
{
  constructor(
    private readonly projects: ProjectRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateProjectInput): Promise<Result<ProjectDTO, CreateProjectError>> {
    const nameResult = ProjectName.create(input.name)
    if (!nameResult.ok) return err(nameResult.error)

    const keyResult = ProjectKey.create(input.key)
    if (!keyResult.ok) return err(keyResult.error)

    const existing = await this.projects.findByKeyInOrg(input.organizationId, keyResult.value)
    if (existing) return err(new DuplicateProjectKeyError())

    const project = Project.create(
      {
        organizationId: input.organizationId,
        key: keyResult.value,
        name: nameResult.value,
        description: input.description,
        createdBy: input.createdBy,
      },
      { idGenerator: this.idGenerator, clock: this.clock },
    )

    await this.projects.save(project)
    return ok(toProjectDTO(project))
  }
}

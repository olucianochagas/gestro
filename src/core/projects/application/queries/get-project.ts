import type { UseCase } from '@/core/shared/application/use-case'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { ProjectKey } from '../../domain/value-objects/project-key'
import type { ProjectRepository } from '../../domain/ports/project-repository'
import { ProjectNotFoundError } from '../../domain/errors/project-not-found.error'
import { type ProjectDTO, toProjectDTO } from '../dtos/project.dto'

export interface GetProjectInput {
  organizationId: string
  key: string
}

export class GetProject implements UseCase<GetProjectInput, Result<ProjectDTO, ProjectNotFoundError>> {
  constructor(private readonly projects: ProjectRepository) {}

  async execute(input: GetProjectInput): Promise<Result<ProjectDTO, ProjectNotFoundError>> {
    // Chave malformada não pode existir → 404 (não vaza diferença entre "inválida" e "inexistente").
    const keyResult = ProjectKey.create(input.key)
    if (!keyResult.ok) return err(new ProjectNotFoundError())

    const project = await this.projects.findByKeyInOrg(input.organizationId, keyResult.value)
    if (!project) return err(new ProjectNotFoundError())

    return ok(toProjectDTO(project))
  }
}

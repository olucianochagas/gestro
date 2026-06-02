import type { UseCase } from '@/core/shared/application/use-case'
import type { ProjectRepository } from '../../domain/ports/project-repository'
import { type ProjectDTO, toProjectDTO } from '../dtos/project.dto'

export interface ListProjectsInput {
  organizationId: string
}

export class ListProjects implements UseCase<ListProjectsInput, ProjectDTO[]> {
  constructor(private readonly projects: ProjectRepository) {}

  async execute(input: ListProjectsInput): Promise<ProjectDTO[]> {
    const projects = await this.projects.listByOrg(input.organizationId)
    return projects.map(toProjectDTO)
  }
}

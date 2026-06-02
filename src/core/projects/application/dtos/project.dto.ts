import type { Project } from '../../domain/entities/project'

export interface ProjectDTO {
  id: string
  key: string
  name: string
  description: string
  status: string
  createdAt: string
}

export function toProjectDTO(project: Project): ProjectDTO {
  return {
    id: project.id,
    key: project.key.value,
    name: project.name.value,
    description: project.description,
    status: project.status.value,
    createdAt: project.createdAt.toISOString(),
  }
}

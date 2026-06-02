import type { ProjectRepository } from '@/core/projects/domain/ports/project-repository'
import type { Project } from '@/core/projects/domain/entities/project'
import type { ProjectKey } from '@/core/projects/domain/value-objects/project-key'

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly byId = new Map<string, Project>()

  async save(project: Project): Promise<void> {
    this.byId.set(project.id, project)
  }

  async findByKeyInOrg(organizationId: string, key: ProjectKey): Promise<Project | null> {
    for (const project of this.byId.values()) {
      if (project.organizationId === organizationId && project.key.value === key.value) {
        return project
      }
    }
    return null
  }

  async listByOrg(organizationId: string): Promise<Project[]> {
    return [...this.byId.values()].filter((p) => p.organizationId === organizationId)
  }
}

import type { Project } from '../entities/project'
import type { ProjectKey } from '../value-objects/project-key'

export interface ProjectRepository {
  save(project: Project): Promise<void>
  findByKeyInOrg(organizationId: string, key: ProjectKey): Promise<Project | null>
  listByOrg(organizationId: string): Promise<Project[]>
}

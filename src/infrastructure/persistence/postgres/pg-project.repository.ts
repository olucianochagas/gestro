import type { ProjectRepository } from '@/core/projects/domain/ports/project-repository'
import type { Project } from '@/core/projects/domain/entities/project'
import type { ProjectKey } from '@/core/projects/domain/value-objects/project-key'
import type { PgDatabase } from './pg-database'
import { rowToProject, type ProjectRow } from './mappers/project.mapper'

export class PgProjectRepository implements ProjectRepository {
  constructor(private readonly db: PgDatabase) {}

  async save(project: Project): Promise<void> {
    await this.db.query(
      `INSERT INTO projects (id, organization_id, key, name, description, status, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         key = EXCLUDED.key,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         created_by = EXCLUDED.created_by,
         created_at = EXCLUDED.created_at`,
      [
        project.id,
        project.organizationId,
        project.key.value,
        project.name.value,
        project.description,
        project.status.value,
        project.createdBy,
        project.createdAt,
      ],
    )
  }

  async findByKeyInOrg(organizationId: string, key: ProjectKey): Promise<Project | null> {
    const { rows } = await this.db.query<ProjectRow>(
      'SELECT * FROM projects WHERE organization_id = $1 AND key = $2',
      [organizationId, key.value],
    )
    return rows[0] ? rowToProject(rows[0]) : null
  }

  async listByOrg(organizationId: string): Promise<Project[]> {
    const { rows } = await this.db.query<ProjectRow>(
      'SELECT * FROM projects WHERE organization_id = $1',
      [organizationId],
    )
    return rows.map(rowToProject)
  }
}

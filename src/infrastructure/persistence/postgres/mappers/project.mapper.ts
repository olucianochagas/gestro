import { Project } from '@/core/projects/domain/entities/project'
import { ProjectKey } from '@/core/projects/domain/value-objects/project-key'
import { ProjectName } from '@/core/projects/domain/value-objects/project-name'
import { ProjectStatus } from '@/core/projects/domain/value-objects/project-status'

export type ProjectRow = {
  id: string
  organization_id: string
  key: string
  name: string
  description: string
  status: string
  created_by: string
  created_at: Date
}

export function rowToProject(row: ProjectRow): Project {
  return Project.restore(row.id, {
    organizationId: row.organization_id,
    key: ProjectKey.fromTrusted(row.key),
    name: ProjectName.fromTrusted(row.name),
    description: row.description,
    status: ProjectStatus.fromTrusted(row.status),
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  })
}

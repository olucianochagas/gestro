import { describe, expect, it, beforeEach } from 'vitest'
import type { ProjectRepository } from './project-repository'
import { Project } from '../entities/project'
import { ProjectName } from '../value-objects/project-name'
import { ProjectKey } from '../value-objects/project-key'
import { FixedClock } from '@/test-support/fakes'

function buildProject(organizationId: string, key: string): Project {
  const name = ProjectName.create(`Projeto ${key}`)
  const projectKey = ProjectKey.create(key)
  if (!name.ok || !projectKey.ok) throw new Error('fixture inválida')
  return Project.create(
    { organizationId, key: projectKey.value, name: name.value, description: '', createdBy: 'u' },
    // id determinístico e único por (org, key) — evita colisão de identidade no Map por id.
    { idGenerator: { generate: () => `${organizationId}:${key}` }, clock: new FixedClock() },
  )
}

function key(value: string): ProjectKey {
  const k = ProjectKey.create(value)
  if (!k.ok) throw new Error('chave inválida no contrato')
  return k.value
}

export function runProjectRepositoryContract(makeRepository: () => ProjectRepository): void {
  describe('ProjectRepository (contrato)', () => {
    let repo: ProjectRepository

    beforeEach(() => {
      repo = makeRepository()
    })

    it('salva e recupera por chave dentro da organização', async () => {
      await repo.save(buildProject('org-1', 'GES'))
      const found = await repo.findByKeyInOrg('org-1', key('GES'))
      expect(found?.key.value).toBe('GES')
    })

    it('não encontra projeto de outra organização', async () => {
      await repo.save(buildProject('org-1', 'GES'))
      expect(await repo.findByKeyInOrg('org-2', key('GES'))).toBeNull()
    })

    it('lista apenas projetos da organização', async () => {
      await repo.save(buildProject('org-1', 'AAA'))
      await repo.save(buildProject('org-1', 'BBB'))
      await repo.save(buildProject('org-2', 'CCC'))
      const list = await repo.listByOrg('org-1')
      expect(list.map((p) => p.key.value).sort()).toEqual(['AAA', 'BBB'])
    })
  })
}

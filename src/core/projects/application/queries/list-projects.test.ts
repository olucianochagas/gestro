import { describe, expect, it } from 'vitest'
import { ListProjects } from './list-projects'
import { CreateProject } from '../commands/create-project'
import { InMemoryProjectRepository } from '@/infrastructure/persistence/in-memory/in-memory-project.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'

describe('ListProjects', () => {
  it('retorna apenas os projetos da organização informada', async () => {
    const projects = new InMemoryProjectRepository()
    const create = new CreateProject(projects, new SequentialIdGenerator('p'), new FixedClock())
    await create.execute({ organizationId: 'org-1', createdBy: 'u', name: 'A', key: 'AAA', description: '' })
    await create.execute({ organizationId: 'org-1', createdBy: 'u', name: 'B', key: 'BBB', description: '' })
    await create.execute({ organizationId: 'org-2', createdBy: 'u', name: 'C', key: 'CCC', description: '' })

    const list = await new ListProjects(projects).execute({ organizationId: 'org-1' })
    expect(list.map((p) => p.key).sort()).toEqual(['AAA', 'BBB'])
  })

  it('retorna lista vazia quando não há projetos', async () => {
    const list = await new ListProjects(new InMemoryProjectRepository()).execute({ organizationId: 'org-x' })
    expect(list).toEqual([])
  })
})

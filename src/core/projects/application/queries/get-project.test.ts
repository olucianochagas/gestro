import { describe, expect, it } from 'vitest'
import { GetProject } from './get-project'
import { CreateProject } from '../commands/create-project'
import { InMemoryProjectRepository } from '@/infrastructure/persistence/in-memory/in-memory-project.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'
import { ProjectNotFoundError } from '../../domain/errors/project-not-found.error'

async function seed() {
  const projects = new InMemoryProjectRepository()
  const create = new CreateProject(projects, new SequentialIdGenerator('p'), new FixedClock())
  await create.execute({ organizationId: 'org-1', createdBy: 'u', name: 'Core', key: 'GES', description: 'x' })
  return projects
}

describe('GetProject', () => {
  it('retorna o projeto pela chave dentro da organização', async () => {
    const r = await new GetProject(await seed()).execute({ organizationId: 'org-1', key: 'ges' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.key).toBe('GES')
  })

  it('retorna NotFound para projeto de outra organização (anti-enumeração)', async () => {
    const r = await new GetProject(await seed()).execute({ organizationId: 'org-2', key: 'GES' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(ProjectNotFoundError)
  })

  it('retorna NotFound (não erro de validação) para chave malformada', async () => {
    const r = await new GetProject(await seed()).execute({ organizationId: 'org-1', key: '!' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(ProjectNotFoundError)
  })
})

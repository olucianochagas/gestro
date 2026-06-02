import { beforeEach, describe, expect, it } from 'vitest'
import { CreateProject } from './create-project'
import { InMemoryProjectRepository } from '@/infrastructure/persistence/in-memory/in-memory-project.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'
import { DuplicateProjectKeyError } from '../../domain/errors/duplicate-project-key.error'
import { InvalidProjectKeyError } from '../../domain/errors/invalid-project-key.error'

const ORG = 'org-1'
const USER = 'user-1'

function makeSut() {
  const projects = new InMemoryProjectRepository()
  const sut = new CreateProject(projects, new SequentialIdGenerator('proj'), new FixedClock())
  return { sut, projects }
}

describe('CreateProject', () => {
  it('cria um projeto ACTIVE escopado na organização', async () => {
    const { sut } = makeSut()
    const r = await sut.execute({
      organizationId: ORG,
      createdBy: USER,
      name: 'Gestrô Core',
      key: 'ges',
      description: 'Núcleo',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.key).toBe('GES')
      expect(r.value.status).toBe('ACTIVE')
      expect(r.value.id).toBe('proj-1')
    }
  })

  it('rejeita chave duplicada na mesma organização', async () => {
    const { sut } = makeSut()
    await sut.execute({ organizationId: ORG, createdBy: USER, name: 'A', key: 'GES', description: '' })
    const r = await sut.execute({ organizationId: ORG, createdBy: USER, name: 'B', key: 'ges', description: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(DuplicateProjectKeyError)
  })

  it('permite a mesma chave em organizações diferentes', async () => {
    const { sut } = makeSut()
    await sut.execute({ organizationId: 'org-1', createdBy: USER, name: 'A', key: 'GES', description: '' })
    const r = await sut.execute({ organizationId: 'org-2', createdBy: USER, name: 'B', key: 'GES', description: '' })
    expect(r.ok).toBe(true)
  })

  it('rejeita chave inválida', async () => {
    const { sut } = makeSut()
    const r = await sut.execute({ organizationId: ORG, createdBy: USER, name: 'A', key: '1', description: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidProjectKeyError)
  })
})

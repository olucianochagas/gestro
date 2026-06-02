import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetContainer } from '@/composition/container'

vi.mock('@/app/lib/api-auth', () => ({ readApiSession: vi.fn() }))
import { readApiSession } from '@/app/lib/api-auth'
import { GET } from './route'
import { POST as createProject } from '../route'

const session = { userId: 'u1', organizationId: 'org-1' }

beforeEach(() => {
  resetContainer()
  vi.mocked(readApiSession).mockReset()
  vi.mocked(readApiSession).mockResolvedValue(session)
})

function seedReq(): Request {
  return new Request('http://localhost/api/v1/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Core', key: 'GES', description: '' }),
  })
}

describe('GET /api/v1/projects/[key]', () => {
  it('200 quando existe na organização', async () => {
    await createProject(seedReq())
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ key: 'GES' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.key).toBe('GES')
  })

  it('404 quando não existe (ou outra org)', async () => {
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ key: 'NOPE' }) })
    expect(res.status).toBe(404)
  })
})

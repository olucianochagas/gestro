import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetContainer } from '@/composition/container'

vi.mock('@/app/lib/api-auth', () => ({ readApiSession: vi.fn() }))
import { readApiSession } from '@/app/lib/api-auth'
import { GET, POST } from './route'

const session = { userId: 'u1', organizationId: 'org-1' }

beforeEach(() => {
  resetContainer()
  vi.mocked(readApiSession).mockReset()
})

function postReq(body: unknown): Request {
  return new Request('http://localhost/api/v1/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/v1/projects', () => {
  it('GET 401 sem sessão', async () => {
    vi.mocked(readApiSession).mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it('POST 201 e GET 200 listando o criado', async () => {
    vi.mocked(readApiSession).mockResolvedValue(session)
    const created = await POST(postReq({ name: 'Core', key: 'GES', description: 'x' }))
    expect(created.status).toBe(201)

    const list = await GET()
    expect(list.status).toBe(200)
    const data = await list.json()
    expect(data).toHaveLength(1)
    expect(data[0].key).toBe('GES')
  })

  it('POST 409 chave duplicada', async () => {
    vi.mocked(readApiSession).mockResolvedValue(session)
    await POST(postReq({ name: 'A', key: 'GES', description: '' }))
    const dup = await POST(postReq({ name: 'B', key: 'GES', description: '' }))
    expect(dup.status).toBe(409)
  })

  it('POST 400 payload inválido', async () => {
    vi.mocked(readApiSession).mockResolvedValue(session)
    const res = await POST(postReq({ name: '', key: '', description: '' }))
    expect(res.status).toBe(400)
  })
})

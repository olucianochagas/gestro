import { beforeEach, describe, expect, it } from 'vitest'
import { POST } from './route'
import { resetContainer } from '@/composition/container'

beforeEach(() => resetContainer())

function req(body: unknown): Request {
  return new Request('http://localhost/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/v1/auth/register', () => {
  it('201 com UserDTO (sem passwordHash)', async () => {
    const res = await POST(req({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.email).toBe('ana@example.com')
    expect(data.passwordHash).toBeUndefined()
  })

  it('409 e-mail duplicado', async () => {
    await POST(req({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' }))
    const res = await POST(req({ name: 'Bia', email: 'ana@example.com', password: 'Str0ng!Pass' }))
    expect(res.status).toBe(409)
  })

  it('400 payload inválido', async () => {
    const res = await POST(req({ name: 'A', email: 'x', password: '123' }))
    expect(res.status).toBe(400)
  })
})

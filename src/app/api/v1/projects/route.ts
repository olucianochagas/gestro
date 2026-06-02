import { z } from 'zod'
import { readApiSession } from '@/app/lib/api-auth'
import { makeListProjects, makeCreateProject } from '@/composition/factories'
import { DuplicateProjectKeyError } from '@/core/projects/domain/errors/duplicate-project-key.error'
import { json, error } from '@/app/lib/http'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  key: z.string().min(2).max(10),
  description: z.string().max(500).optional().default(''),
})

export async function GET(): Promise<Response> {
  const session = await readApiSession()
  if (!session) return error('UNAUTHORIZED', 'Não autenticado.', 401)
  const projects = await makeListProjects().execute({ organizationId: session.organizationId })
  return json(projects, 200)
}

export async function POST(request: Request): Promise<Response> {
  const session = await readApiSession()
  if (!session) return error('UNAUTHORIZED', 'Não autenticado.', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('BAD_REQUEST', 'JSON inválido.', 400)
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return error('VALIDATION', 'Dados inválidos.', 400)

  const result = await makeCreateProject().execute({
    organizationId: session.organizationId,
    createdBy: session.userId,
    name: parsed.data.name,
    key: parsed.data.key,
    description: parsed.data.description,
  })
  if (!result.ok) {
    if (result.error instanceof DuplicateProjectKeyError) {
      return error(result.error.code, result.error.message, 409)
    }
    return error(result.error.code, result.error.message, 400)
  }
  return json(result.value, 201)
}

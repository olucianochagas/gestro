import { z } from 'zod'
import { makeAuthenticateUser } from '@/composition/factories'
import { getContainer } from '@/composition/container'
import { error, noContent } from '@/app/lib/http'

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('BAD_REQUEST', 'JSON inválido.', 400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('VALIDATION', 'Dados inválidos.', 400)

  const result = await makeAuthenticateUser().execute(parsed.data)
  if (!result.ok) return error(result.error.code, result.error.message, 401)

  await getContainer().sessionService.issue(result.value.userId, result.value.organizationId)
  return noContent()
}

export async function DELETE(): Promise<Response> {
  await getContainer().sessionService.revoke()
  return noContent()
}

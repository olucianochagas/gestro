import { z } from 'zod'
import { makeRegisterUser } from '@/composition/factories'
import { EmailAlreadyInUseError } from '@/core/identity/domain/errors/email-already-in-use.error'
import { json, error } from '@/app/lib/http'

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(200),
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

  const result = await makeRegisterUser().execute(parsed.data)
  if (!result.ok) {
    if (result.error instanceof EmailAlreadyInUseError) {
      return error(result.error.code, result.error.message, 409)
    }
    return error(result.error.code, result.error.message, 400)
  }
  return json(result.value, 201)
}

import { readApiSession } from '@/app/lib/api-auth'
import { makeGetProject } from '@/composition/factories'
import { json, error } from '@/app/lib/http'

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
): Promise<Response> {
  const session = await readApiSession()
  if (!session) return error('UNAUTHORIZED', 'Não autenticado.', 401)

  const { key } = await context.params
  const result = await makeGetProject().execute({ organizationId: session.organizationId, key })
  if (!result.ok) return error(result.error.code, result.error.message, 404)

  return json(result.value, 200)
}

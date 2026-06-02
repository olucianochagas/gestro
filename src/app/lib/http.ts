export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function error(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status)
}

export function noContent(): Response {
  return new Response(null, { status: 204 })
}

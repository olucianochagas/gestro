'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { verifySession } from '@/app/lib/dal'
import { makeCreateProject } from '@/composition/factories'
import { DuplicateProjectKeyError } from '@/core/projects/domain/errors/duplicate-project-key.error'

export interface ProjectFormState {
  error?: string
}

const schema = z.object({
  name: z.string().min(1).max(120),
  key: z.string().min(2).max(10),
  description: z.string().max(500),
})

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const session = await verifySession()

  const parsed = schema.safeParse({
    name: formData.get('name'),
    key: formData.get('key'),
    description: formData.get('description') ?? '',
  })
  if (!parsed.success) {
    return { error: 'Verifique nome (1+), chave (2–10) e descrição (até 500).' }
  }

  const result = await makeCreateProject().execute({
    organizationId: session.organizationId,
    createdBy: session.userId,
    name: parsed.data.name,
    key: parsed.data.key,
    description: parsed.data.description,
  })
  if (!result.ok) {
    if (result.error instanceof DuplicateProjectKeyError) {
      return { error: 'Já existe um projeto com esta chave.' }
    }
    return { error: 'Não foi possível criar o projeto. Verifique a chave (ex.: GES).' }
  }

  redirect(`/projects/${result.value.key}`)
}

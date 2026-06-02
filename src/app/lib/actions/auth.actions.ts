'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { makeRegisterUser, makeAuthenticateUser } from '@/composition/factories'
import { getContainer } from '@/composition/container'
import { EmailAlreadyInUseError } from '@/core/identity/domain/errors/email-already-in-use.error'

export interface AuthFormState {
  error?: string
}

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(200),
})

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: 'Verifique os campos: nome (2+), e-mail válido e senha (8+ caracteres).' }
  }

  const result = await makeRegisterUser().execute(parsed.data)
  if (!result.ok) {
    if (result.error instanceof EmailAlreadyInUseError) {
      return { error: 'Este e-mail já está em uso.' }
    }
    return { error: 'Não foi possível concluir o cadastro.' }
  }

  redirect('/login?registered=1')
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: 'Informe e-mail e senha.' }
  }

  const result = await makeAuthenticateUser().execute(parsed.data)
  if (!result.ok) {
    return { error: 'Credenciais inválidas.' }
  }

  await getContainer().sessionService.issue(result.value.userId, result.value.organizationId)
  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  await getContainer().sessionService.revoke()
  redirect('/login')
}

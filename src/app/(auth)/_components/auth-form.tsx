'use client'

import { useActionState } from 'react'
import type { AuthFormState } from '@/app/lib/actions/auth.actions'

interface AuthFormProps {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>
  mode: 'signup' | 'login'
  submitLabel: string
}

export function AuthForm({ action, mode, submitLabel }: AuthFormProps) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {})

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {mode === 'signup' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="name">Nome</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={mode === 'signup' ? 8 : 1}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </div>

      {state.error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {pending ? 'Enviando…' : submitLabel}
      </button>
    </form>
  )
}

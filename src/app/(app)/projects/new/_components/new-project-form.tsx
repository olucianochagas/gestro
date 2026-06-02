'use client'

import { useActionState } from 'react'
import { createProjectAction, type ProjectFormState } from '@/app/lib/actions/project.actions'

export function NewProjectForm() {
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(
    createProjectAction,
    {},
  )

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="name">Nome</label>
        <input id="name" name="name" required maxLength={120} className="rounded border border-gray-300 px-3 py-2" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="key">Chave</label>
        <input
          id="key"
          name="key"
          required
          minLength={2}
          maxLength={10}
          placeholder="GES"
          aria-describedby="key-hint"
          className="rounded border border-gray-300 px-3 py-2 uppercase"
        />
        <span id="key-hint" className="text-xs text-gray-500">
          2 a 10 caracteres, começando por letra (ex.: GES).
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description">Descrição</label>
        <textarea id="description" name="description" maxLength={500} rows={3} className="rounded border border-gray-300 px-3 py-2" />
      </div>

      {state.error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-60">
        {pending ? 'Criando…' : 'Criar projeto'}
      </button>
    </form>
  )
}

import Link from 'next/link'
import { AuthForm } from '../_components/auth-form'
import { signupAction } from '@/app/lib/actions/auth.actions'

export default function SignupPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Criar conta na Gestrô</h1>
      <AuthForm action={signupAction} mode="signup" submitLabel="Cadastrar" />
      <p className="text-sm">
        Já tem conta?{' '}
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </p>
    </main>
  )
}

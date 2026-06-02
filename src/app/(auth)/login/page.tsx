import Link from 'next/link'
import { AuthForm } from '../_components/auth-form'
import { loginAction } from '@/app/lib/actions/auth.actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>
}) {
  const { registered } = await searchParams

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Entrar na Gestrô</h1>
      {registered && (
        <p role="status" className="text-sm text-green-700">
          Conta criada! Faça login para continuar.
        </p>
      )}
      <AuthForm action={loginAction} mode="login" submitLabel="Entrar" />
      <p className="text-sm">
        Não tem conta?{' '}
        <Link href="/signup" className="underline">
          Cadastre-se
        </Link>
      </p>
    </main>
  )
}

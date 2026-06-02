import Link from 'next/link'
import { getCurrentUser } from '@/app/lib/dal'
import { logoutAction } from '@/app/lib/actions/auth.actions'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Olá, {user?.name ?? 'usuário'}</h1>
        <form action={logoutAction}>
          <button type="submit" className="text-sm underline">
            Sair
          </button>
        </form>
      </header>
      <nav>
        <Link href="/projects" className="underline">
          Ver projetos
        </Link>
      </nav>
    </main>
  )
}

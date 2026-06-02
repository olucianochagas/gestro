import Link from 'next/link'
import { verifySession } from '@/app/lib/dal'
import { NewProjectForm } from './_components/new-project-form'

export default async function NewProjectPage() {
  await verifySession()

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">Novo projeto</h1>
      <NewProjectForm />
      <Link href="/projects" className="text-sm underline">
        Voltar para a lista
      </Link>
    </main>
  )
}

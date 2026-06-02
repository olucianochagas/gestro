import Link from 'next/link'
import { verifySession } from '@/app/lib/dal'
import { makeListProjects } from '@/composition/factories'

export default async function ProjectsPage() {
  const session = await verifySession()
  const projects = await makeListProjects().execute({ organizationId: session.organizationId })

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projetos</h1>
        <Link href="/projects/new" className="rounded bg-black px-3 py-2 text-sm text-white">
          Novo projeto
        </Link>
      </header>

      {projects.length === 0 ? (
        <p className="text-gray-600">Nenhum projeto ainda — crie o primeiro.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id} className="rounded border border-gray-200 p-3">
              <Link href={`/projects/${project.key}`} className="font-medium underline">
                {project.key} — {project.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { verifySession } from '@/app/lib/dal'
import { makeGetProject } from '@/composition/factories'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const session = await verifySession()
  const { key } = await params

  const result = await makeGetProject().execute({ organizationId: session.organizationId, key })
  if (!result.ok) notFound()

  const project = result.value

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="font-medium">Chave</dt>
        <dd>{project.key}</dd>
        <dt className="font-medium">Status</dt>
        <dd>{project.status}</dd>
        <dt className="font-medium">Descrição</dt>
        <dd>{project.description || '—'}</dd>
      </dl>
      <Link href="/projects" className="text-sm underline">
        Voltar para a lista
      </Link>
    </main>
  )
}

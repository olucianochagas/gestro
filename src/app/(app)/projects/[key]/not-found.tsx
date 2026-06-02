import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Projeto não encontrado</h1>
      <Link href="/projects" className="mt-3 inline-block underline">
        Voltar para a lista
      </Link>
    </main>
  )
}

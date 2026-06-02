'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p role="alert" className="text-red-600">
        Não foi possível carregar os projetos.
      </p>
      <button type="button" onClick={reset} className="mt-3 underline">
        Tentar novamente
      </button>
    </main>
  )
}

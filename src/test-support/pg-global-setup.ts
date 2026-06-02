import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { ProvidedContext } from 'vitest'
import { runMigrations } from '@/infrastructure/persistence/postgres/migrate'

let container: StartedPostgreSqlContainer

type GlobalSetupApi = {
  provide: <K extends keyof ProvidedContext & string>(key: K, value: ProvidedContext[K]) => void
}

export default async function setup({ provide }: GlobalSetupApi): Promise<() => Promise<void>> {
  container = await new PostgreSqlContainer('postgres:16-alpine').start()
  const uri = container.getConnectionUri()
  await runMigrations(uri)
  provide('pgUri', uri)
  return async () => {
    await container.stop()
  }
}

declare module 'vitest' {
  export interface ProvidedContext {
    pgUri: string
  }
}

import { AsyncLocalStorage } from 'node:async_hooks'
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'

/**
 * Detém o Pool e propaga, via AsyncLocalStorage, o client transacional corrente.
 * Fora de transação as queries usam o Pool (auto-commit por statement);
 * dentro de `transaction()` usam o client ligado (BEGIN/COMMIT/ROLLBACK).
 */
export class PgDatabase {
  private readonly als = new AsyncLocalStorage<PoolClient>()

  constructor(private readonly pool: Pool) {}

  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<R>> {
    const executor = this.als.getStore() ?? this.pool
    return executor.query<R>(text, params as unknown[])
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.als.getStore()) return work() // já em transação: reusa a corrente
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await this.als.run(client, work)
      await client.query('COMMIT')
      return result
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }

  async end(): Promise<void> {
    await this.pool.end()
  }
}

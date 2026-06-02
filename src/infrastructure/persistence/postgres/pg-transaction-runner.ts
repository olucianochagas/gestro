import type { TransactionRunner } from '@/core/shared/application/transaction-runner'
import type { PgDatabase } from './pg-database'

export class PgTransactionRunner implements TransactionRunner {
  constructor(private readonly db: PgDatabase) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.db.transaction(work)
  }
}

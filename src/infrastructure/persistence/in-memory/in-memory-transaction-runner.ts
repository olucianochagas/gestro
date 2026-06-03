import type { TransactionRunner } from '@/core/shared/application/transaction-runner'

export class InMemoryTransactionRunner implements TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T> {
    return work()
  }
}

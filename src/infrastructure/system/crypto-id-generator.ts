import type { IdGenerator } from '@/core/shared/application/id-generator'

export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    return crypto.randomUUID()
  }
}

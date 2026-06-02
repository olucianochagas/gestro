import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'

export class FixedClock implements Clock {
  constructor(private readonly fixed: Date = new Date('2000-01-01T00:00:00.000Z')) {}
  now(): Date {
    return this.fixed
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0
  constructor(private readonly prefix = 'id') {}
  generate(): string {
    this.counter += 1
    return `${this.prefix}-${this.counter}`
  }
}

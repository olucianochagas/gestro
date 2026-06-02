import type { Clock } from '@/core/shared/application/clock'

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}

import { ValueObject } from '@/core/shared/domain/value-object'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { InvalidEmailError } from '../errors/invalid-email.error'

export class Email extends ValueObject<{ value: string }> {
  private static readonly PATTERN = /^[^\s@]+@[^\s@.][^\s@]*\.[^\s@]+$/

  private constructor(value: string) {
    super({ value })
  }

  get value(): string {
    return this.props.value
  }

  static create(raw: string): Result<Email, InvalidEmailError> {
    const normalized = raw.trim().toLowerCase()
    if (!Email.PATTERN.test(normalized)) {
      return err(new InvalidEmailError(raw))
    }
    return ok(new Email(normalized))
  }

  static fromTrusted(value: string): Email {
    const result = Email.create(value)
    if (!result.ok) throw new Error('Email persistido inválido')
    return result.value
  }
}

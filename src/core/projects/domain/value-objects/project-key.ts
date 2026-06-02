import { ValueObject } from '@/core/shared/domain/value-object'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { InvalidProjectKeyError } from '../errors/invalid-project-key.error'

export class ProjectKey extends ValueObject<{ value: string }> {
  private static readonly PATTERN = /^[A-Z][A-Z0-9]{1,9}$/

  private constructor(value: string) {
    super({ value })
  }

  get value(): string {
    return this.props.value
  }

  static create(raw: string): Result<ProjectKey, InvalidProjectKeyError> {
    const normalized = raw.trim().toUpperCase()
    if (!ProjectKey.PATTERN.test(normalized)) {
      return err(new InvalidProjectKeyError())
    }
    return ok(new ProjectKey(normalized))
  }

  static fromTrusted(value: string): ProjectKey {
    const result = ProjectKey.create(value)
    if (!result.ok) throw new Error(`ProjectKey persistido inválido: ${value}`)
    return result.value
  }
}

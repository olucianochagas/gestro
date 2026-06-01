import { ValueObject } from '@/core/shared/domain/value-object'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { InvalidProjectNameError } from '../errors/invalid-project-name.error'

export class ProjectName extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value })
  }

  get value(): string {
    return this.props.value
  }

  static create(raw: string): Result<ProjectName, InvalidProjectNameError> {
    const trimmed = raw.trim()
    if (trimmed.length < 1 || trimmed.length > 120) {
      return err(new InvalidProjectNameError())
    }
    return ok(new ProjectName(trimmed))
  }
}

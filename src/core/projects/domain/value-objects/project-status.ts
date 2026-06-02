import { ValueObject } from '@/core/shared/domain/value-object'

export type ProjectStatusValue = 'ACTIVE'

export class ProjectStatus extends ValueObject<{ value: ProjectStatusValue }> {
  static readonly ACTIVE = new ProjectStatus('ACTIVE')

  private constructor(value: ProjectStatusValue) {
    super({ value })
  }

  get value(): ProjectStatusValue {
    return this.props.value
  }

  static fromTrusted(value: string): ProjectStatus {
    if (value === 'ACTIVE') return ProjectStatus.ACTIVE
    throw new Error(`Status persistido inválido: ${value}`)
  }
}

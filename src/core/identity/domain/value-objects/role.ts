import { ValueObject } from '@/core/shared/domain/value-object'

export type RoleValue = 'OWNER'

export class Role extends ValueObject<{ value: RoleValue }> {
  static readonly OWNER = new Role('OWNER')

  private constructor(value: RoleValue) {
    super({ value })
  }

  get value(): RoleValue {
    return this.props.value
  }
}

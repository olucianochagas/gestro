import { ValueObject } from '@/core/shared/domain/value-object'

export class OrganizationSlug extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value })
  }

  get value(): string {
    return this.props.value
  }

  static fromText(text: string): OrganizationSlug {
    const slug = text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return new OrganizationSlug(slug.length > 0 ? slug : 'org')
  }

  static fromTrusted(value: string): OrganizationSlug {
    return new OrganizationSlug(value)
  }
}

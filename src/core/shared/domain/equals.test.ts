import { describe, expect, it } from 'vitest'
import { ValueObject } from './value-object'
import { Entity } from './entity'

class Money extends ValueObject<{ amount: number }> {
  constructor(amount: number) {
    super({ amount })
  }
}

class Widget extends Entity<string> {
  constructor(id: string) {
    super(id)
  }
}

describe('ValueObject.equals', () => {
  it('é igual quando os valores são iguais', () => {
    expect(new Money(10).equals(new Money(10))).toBe(true)
  })

  it('é diferente quando os valores diferem', () => {
    expect(new Money(10).equals(new Money(20))).toBe(false)
  })

  it('é diferente de undefined', () => {
    expect(new Money(10).equals(undefined)).toBe(false)
  })
})

describe('Entity.equals', () => {
  it('é igual quando o id é igual (mesmo conteúdo diferente)', () => {
    expect(new Widget('a').equals(new Widget('a'))).toBe(true)
  })

  it('é diferente quando o id difere', () => {
    expect(new Widget('a').equals(new Widget('b'))).toBe(false)
  })
})

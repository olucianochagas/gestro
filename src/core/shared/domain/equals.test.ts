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

class Distance extends ValueObject<{ amount: number }> {
  constructor(amount: number) {
    super({ amount })
  }
}

class Gadget extends Entity<string> {
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

  it('é diferente de outro value object de tipo distinto com mesmos props', () => {
    expect(new Money(10).equals(new Distance(10))).toBe(false)
  })
})

describe('Entity.equals', () => {
  it('é igual quando o id é igual (mesmo conteúdo diferente)', () => {
    expect(new Widget('a').equals(new Widget('a'))).toBe(true)
  })

  it('é diferente quando o id difere', () => {
    expect(new Widget('a').equals(new Widget('b'))).toBe(false)
  })

  it('é diferente de outra entidade de tipo distinto com mesmo id', () => {
    expect(new Widget('a').equals(new Gadget('a'))).toBe(false)
  })

  it('é diferente de undefined', () => {
    expect(new Widget('a').equals(undefined)).toBe(false)
  })
})

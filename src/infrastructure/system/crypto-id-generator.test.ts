import { describe, expect, it } from 'vitest'
import { CryptoIdGenerator } from './crypto-id-generator'

describe('CryptoIdGenerator', () => {
  it('gera ids únicos no formato UUID', () => {
    const gen = new CryptoIdGenerator()
    const a = gen.generate()
    const b = gen.generate()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})

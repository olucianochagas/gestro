import { hash, verify } from '@node-rs/argon2'
import type { PasswordHasher } from '@/core/identity/domain/ports/password-hasher'

export class Argon2PasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    // Defaults do @node-rs/argon2 = argon2id (recomendação OWASP).
    return hash(plain)
  }

  async verify(plain: string, hashed: string): Promise<boolean> {
    try {
      return await verify(hashed, plain)
    } catch {
      return false
    }
  }
}

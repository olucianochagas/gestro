import { User } from '@/core/identity/domain/entities/user'
import { Email } from '@/core/identity/domain/value-objects/email'

export type UserRow = {
  id: string
  name: string
  email: string
  password_hash: string
  created_at: Date
}

export function rowToUser(row: UserRow): User {
  return User.restore(row.id, {
    name: row.name,
    email: Email.fromTrusted(row.email),
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at),
  })
}

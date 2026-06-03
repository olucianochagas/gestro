import type { UserRepository } from '@/core/identity/domain/ports/user-repository'
import type { User } from '@/core/identity/domain/entities/user'
import type { Email } from '@/core/identity/domain/value-objects/email'
import type { PgDatabase } from './pg-database'
import { rowToUser, type UserRow } from './mappers/user.mapper'

export class PgUserRepository implements UserRepository {
  constructor(private readonly db: PgDatabase) {}

  async save(user: User): Promise<void> {
    await this.db.query(
      `INSERT INTO users (id, name, email, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         created_at = EXCLUDED.created_at`,
      [user.id, user.name, user.email.value, user.passwordHash, user.createdAt],
    )
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id])
    return rows[0] ? rowToUser(rows[0]) : null
  }

  async findByEmail(email: Email): Promise<User | null> {
    const { rows } = await this.db.query<UserRow>('SELECT * FROM users WHERE email = $1', [email.value])
    return rows[0] ? rowToUser(rows[0]) : null
  }
}

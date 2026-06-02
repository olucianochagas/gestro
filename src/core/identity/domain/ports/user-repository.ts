import type { User } from '../entities/user'
import type { Email } from '../value-objects/email'

export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
}

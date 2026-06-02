import type { User } from '../../domain/entities/user'

export interface UserDTO {
  id: string
  name: string
  email: string
}

export function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email.value,
  }
}

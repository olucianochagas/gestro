import type { UseCase } from '@/core/shared/application/use-case'
import type { UserRepository } from '../../domain/ports/user-repository'
import { type UserDTO, toUserDTO } from '../dtos/user.dto'

export interface GetCurrentUserInput {
  userId: string
}

export class GetCurrentUser implements UseCase<GetCurrentUserInput, UserDTO | null> {
  constructor(private readonly users: UserRepository) {}

  async execute(input: GetCurrentUserInput): Promise<UserDTO | null> {
    const user = await this.users.findById(input.userId)
    return user ? toUserDTO(user) : null
  }
}

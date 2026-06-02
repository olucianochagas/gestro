import 'server-only'
import { env } from '@/infrastructure/config/env'
import { InMemoryUserRepository } from '@/infrastructure/persistence/in-memory/in-memory-user.repository'
import { InMemoryOrganizationRepository } from '@/infrastructure/persistence/in-memory/in-memory-organization.repository'
import { InMemoryMembershipRepository } from '@/infrastructure/persistence/in-memory/in-memory-membership.repository'
import { InMemoryProjectRepository } from '@/infrastructure/persistence/in-memory/in-memory-project.repository'
import { Argon2PasswordHasher } from '@/infrastructure/security/argon2-password-hasher'
import { JoseSessionService } from '@/infrastructure/security/jose-session-service'
import { SystemClock } from '@/infrastructure/system/system-clock'
import { CryptoIdGenerator } from '@/infrastructure/system/crypto-id-generator'
import type { UserRepository } from '@/core/identity/domain/ports/user-repository'
import type { OrganizationRepository } from '@/core/identity/domain/ports/organization-repository'
import type { MembershipRepository } from '@/core/identity/domain/ports/membership-repository'
import type { ProjectRepository } from '@/core/projects/domain/ports/project-repository'
import type { PasswordHasher } from '@/core/identity/domain/ports/password-hasher'
import type { SessionService } from '@/core/identity/domain/ports/session-service'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'

export interface Container {
  users: UserRepository
  organizations: OrganizationRepository
  memberships: MembershipRepository
  projects: ProjectRepository
  hasher: PasswordHasher
  sessionService: SessionService
  clock: Clock
  idGenerator: IdGenerator
}

function build(): Container {
  const secret = new TextEncoder().encode(env.SESSION_SECRET)
  return {
    users: new InMemoryUserRepository(),
    organizations: new InMemoryOrganizationRepository(),
    memberships: new InMemoryMembershipRepository(),
    projects: new InMemoryProjectRepository(),
    hasher: new Argon2PasswordHasher(),
    sessionService: new JoseSessionService(secret),
    clock: new SystemClock(),
    idGenerator: new CryptoIdGenerator(),
  }
}

// Singleton dev-safe: o store in-memory sobrevive ao HMR no mesmo processo.
const globalRef = globalThis as unknown as { __gestroContainer?: Container }

export function getContainer(): Container {
  if (!globalRef.__gestroContainer) {
    globalRef.__gestroContainer = build()
  }
  return globalRef.__gestroContainer
}

// Usado por testes de integração para isolar o estado entre casos.
export function resetContainer(): void {
  globalRef.__gestroContainer = build()
}

import 'server-only'
import { env } from '@/infrastructure/config/env'
import { InMemoryUserRepository } from '@/infrastructure/persistence/in-memory/in-memory-user.repository'
import { InMemoryOrganizationRepository } from '@/infrastructure/persistence/in-memory/in-memory-organization.repository'
import { InMemoryMembershipRepository } from '@/infrastructure/persistence/in-memory/in-memory-membership.repository'
import { InMemoryProjectRepository } from '@/infrastructure/persistence/in-memory/in-memory-project.repository'
import { InMemoryTransactionRunner } from '@/infrastructure/persistence/in-memory/in-memory-transaction-runner'
import { Argon2PasswordHasher } from '@/infrastructure/security/argon2-password-hasher'
import { JoseSessionService } from '@/infrastructure/security/jose-session-service'
import { SystemClock } from '@/infrastructure/system/system-clock'
import { CryptoIdGenerator } from '@/infrastructure/system/crypto-id-generator'
import { Pool } from 'pg'
import { PgDatabase } from '@/infrastructure/persistence/postgres/pg-database'
import { PgTransactionRunner } from '@/infrastructure/persistence/postgres/pg-transaction-runner'
import { PgUserRepository } from '@/infrastructure/persistence/postgres/pg-user.repository'
import { PgOrganizationRepository } from '@/infrastructure/persistence/postgres/pg-organization.repository'
import { PgMembershipRepository } from '@/infrastructure/persistence/postgres/pg-membership.repository'
import { PgProjectRepository } from '@/infrastructure/persistence/postgres/pg-project.repository'
import type { UserRepository } from '@/core/identity/domain/ports/user-repository'
import type { OrganizationRepository } from '@/core/identity/domain/ports/organization-repository'
import type { MembershipRepository } from '@/core/identity/domain/ports/membership-repository'
import type { ProjectRepository } from '@/core/projects/domain/ports/project-repository'
import type { PasswordHasher } from '@/core/identity/domain/ports/password-hasher'
import type { SessionService } from '@/core/identity/domain/ports/session-service'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'
import type { TransactionRunner } from '@/core/shared/application/transaction-runner'

export interface Container {
  users: UserRepository
  organizations: OrganizationRepository
  memberships: MembershipRepository
  projects: ProjectRepository
  hasher: PasswordHasher
  sessionService: SessionService
  clock: Clock
  idGenerator: IdGenerator
  transactionRunner: TransactionRunner
}

function build(): Container {
  // Defensivo: produção nunca deve cair silenciosamente em persistência in-memory.
  // Exclui a fase de build do Next (NEXT_PHASE), que prerenderiza páginas com
  // NODE_ENV=production mas legitimamente sem DATABASE_URL; o guard vale ao servir.
  const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build'
  if (process.env.NODE_ENV === 'production' && !isNextBuild && !env.DATABASE_URL) {
    throw new Error('DATABASE_URL é obrigatória em produção.')
  }

  const secret = new TextEncoder().encode(env.SESSION_SECRET)
  const base = {
    hasher: new Argon2PasswordHasher(),
    sessionService: new JoseSessionService(secret),
    clock: new SystemClock(),
    idGenerator: new CryptoIdGenerator(),
  }

  if (env.DATABASE_URL) {
    const db = new PgDatabase(new Pool({ connectionString: env.DATABASE_URL }))
    return {
      ...base,
      users: new PgUserRepository(db),
      organizations: new PgOrganizationRepository(db),
      memberships: new PgMembershipRepository(db),
      projects: new PgProjectRepository(db),
      transactionRunner: new PgTransactionRunner(db),
    }
  }

  return {
    ...base,
    users: new InMemoryUserRepository(),
    organizations: new InMemoryOrganizationRepository(),
    memberships: new InMemoryMembershipRepository(),
    projects: new InMemoryProjectRepository(),
    transactionRunner: new InMemoryTransactionRunner(),
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

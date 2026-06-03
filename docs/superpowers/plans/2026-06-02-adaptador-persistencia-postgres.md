# Adaptador de Persistência PostgreSQL — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os 4 repositórios in-memory por implementações PostgreSQL (raw `pg`), com paridade comportamental provada por contracts rodando contra in-memory e Postgres real, mantendo o núcleo intacto.

**Architecture:** Núcleo puro inalterado salvo por um novo port `TransactionRunner` e métodos `fromTrusted` nos Value Objects. Infra nova em `src/infrastructure/persistence/postgres/`: um `PgDatabase` (Pool + `AsyncLocalStorage` para transação ambiente), 4 repositórios por SQL parametrizado, mappers row→entidade, runner de migração forward-only. O composition root seleciona Postgres quando `DATABASE_URL` está presente (obrigatória em produção), caindo em in-memory caso contrário — preservando a suíte unit sem Docker.

**Tech Stack:** Next.js 16, TypeScript estrito, `pg`, Vitest, Testcontainers (`@testcontainers/postgresql`), `tsx`.

**Spec:** [docs/superpowers/specs/2026-06-02-adaptador-persistencia-postgres-design.md](../specs/2026-06-02-adaptador-persistencia-postgres-design.md)

**Refinamentos de planejamento (deltas frente à spec):**
- **`OrganizationRepository.findById`** será adicionado ao port (a spec o tinha como removido). Razão: um contrato factory-parametrizado precisa de um método de leitura para observar o efeito de `save`; sem isso o "contrato de Organization" seria vazio. Torna os 4 contratos uniformes (round-trip save→find) e é útil de imediato.
- **Estrutura de arquivos consolidada:** em vez de `pg-pool.ts` + `pg-executor.ts` separados, um único **`pg-database.ts`** (`PgDatabase`) detém o `Pool` + o `AsyncLocalStorage` e expõe `query()` e `transaction()`. Mais coeso e injetável (os repos recebem `PgDatabase` no construtor — testável com o pool do Testcontainers).

---

## File Structure

**Núcleo (mudanças mínimas):**
- Create `src/core/shared/application/transaction-runner.ts` — port `TransactionRunner`.
- Modify `src/core/identity/domain/ports/organization-repository.ts` — adiciona `findById`.
- Modify `src/core/identity/application/commands/register-user.ts` — recebe `TransactionRunner`, envolve os saves.
- Modify VOs (`email.ts`, `organization-slug.ts`, `role.ts`, `project-key.ts`, `project-name.ts`, `project-status.ts`) — `fromTrusted`.
- Create contracts `*-repository.contract.ts` para User, Organization, Membership.

**Infra:**
- Create `src/infrastructure/persistence/in-memory/in-memory-transaction-runner.ts`.
- Modify `src/infrastructure/persistence/in-memory/in-memory-organization.repository.ts` (`findById`), `in-memory-membership.repository.ts` (save idempotente).
- Create `src/infrastructure/persistence/postgres/`: `pg-database.ts`, `pg-transaction-runner.ts`, `pg-user.repository.ts`, `pg-organization.repository.ts`, `pg-membership.repository.ts`, `pg-project.repository.ts`, `mappers/{user,organization,membership,project}.mapper.ts`, `migrations/0001_init.sql`, `migrate.ts`.

**Composição:**
- Modify `src/infrastructure/config/env.ts` (DATABASE_URL), `src/composition/container.ts` (seleção + `transactionRunner`), `src/composition/factories.ts` (injeta runner).

**Testes/config:**
- Modify `vitest.config.mts` (exclui `**/*.pg.test.ts`), `package.json` (deps + scripts).
- Create `vitest.db.config.mts`, `src/test-support/pg-global-setup.ts`.
- Create `*.pg.test.ts` por repositório + um teste de transação.

---

## Task 0: Dependências, scripts e separação das suítes

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.mts`
- Create: `vitest.db.config.mts`
- Modify: `.env.example`

- [ ] **Step 1: Instalar dependências**

Run:
```bash
npm install pg
npm install -D @types/pg testcontainers @testcontainers/postgresql tsx
```
Expected: instala sem vulnerabilidades novas; `package.json` ganha as deps.

- [ ] **Step 2: Adicionar scripts ao `package.json`**

Em `"scripts"`, adicionar:
```json
    "db:migrate": "tsx src/infrastructure/persistence/postgres/migrate.ts",
    "test:db": "vitest run --config vitest.db.config.mts"
```

- [ ] **Step 3: Excluir os testes de DB da suíte unit**

Em `vitest.config.mts`, dentro de `test`, alterar o `include` e adicionar `exclude`:
```ts
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/*.pg.test.ts"],
    setupFiles: ["./src/test-support/setup-env.ts"],
  },
```

- [ ] **Step 4: Criar `vitest.db.config.mts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./src/test-support/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.pg.test.ts"],
    globalSetup: ["./src/test-support/pg-global-setup.ts"],
    // Banco único compartilhado entre arquivos → execução serial evita corridas de TRUNCATE.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
```

- [ ] **Step 5: Documentar `DATABASE_URL` no `.env.example`**

Acrescentar ao final de `.env.example`:
```
# Conexão PostgreSQL. Obrigatória em produção; ausente em dev/test = repositórios in-memory.
DATABASE_URL=
```

- [ ] **Step 6: Verificar a suíte unit intacta**

Run: `npm test`
Expected: PASS (55 testes), agora ignorando `*.pg.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.mts vitest.db.config.mts .env.example
git commit -m "build(db): deps pg/testcontainers/tsx, scripts e separação da suíte test:db"
```

---

## Task 1: Port `TransactionRunner` + no-op in-memory + `RegisterUser` atômico

**Files:**
- Create: `src/core/shared/application/transaction-runner.ts`
- Create: `src/infrastructure/persistence/in-memory/in-memory-transaction-runner.ts`
- Modify: `src/core/identity/application/commands/register-user.ts`
- Modify: `src/core/identity/application/commands/register-user.test.ts`
- Modify: `src/core/identity/application/commands/authenticate-user.test.ts:24`
- Modify: `src/core/identity/application/queries/get-current-user.test.ts:21`
- Modify: `src/composition/container.ts`
- Modify: `src/composition/factories.ts:11`

- [ ] **Step 1: Criar o port**

`src/core/shared/application/transaction-runner.ts`:
```ts
/**
 * Executa `work` dentro de uma fronteira transacional.
 * Implementações de produção garantem atomicidade (tudo-ou-nada);
 * a implementação in-memory apenas executa o trabalho.
 */
export interface TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T>
}
```

- [ ] **Step 2: Criar o runner in-memory (no-op)**

`src/infrastructure/persistence/in-memory/in-memory-transaction-runner.ts`:
```ts
import type { TransactionRunner } from '@/core/shared/application/transaction-runner'

export class InMemoryTransactionRunner implements TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T> {
    return work()
  }
}
```

- [ ] **Step 3: Atualizar o teste do `RegisterUser` (vermelho primeiro)**

Em `register-user.test.ts`, importar o runner e injetá-lo em `makeSut`:
```ts
import { InMemoryTransactionRunner } from '@/infrastructure/persistence/in-memory/in-memory-transaction-runner'
```
Substituir a construção do `sut` em `makeSut`:
```ts
  const sut = new RegisterUser(
    users,
    orgs,
    memberships,
    new StubHasher(),
    new SequentialIdGenerator(),
    new FixedClock(),
    new InMemoryTransactionRunner(),
  )
```

- [ ] **Step 4: Rodar o teste para confirmar a falha de compilação/assinatura**

Run: `npx tsc --noEmit`
Expected: erro em `register-user.ts` — `RegisterUser` ainda não aceita o 7º parâmetro.

- [ ] **Step 5: Modificar `RegisterUser`**

Em `register-user.ts`, adicionar o import e o parâmetro, e envolver os saves:
```ts
import type { TransactionRunner } from '@/core/shared/application/transaction-runner'
```
No construtor, acrescentar como último parâmetro:
```ts
    private readonly clock: Clock,
    private readonly tx: TransactionRunner,
  ) {}
```
Substituir os três `await this.*.save(...)` + `return ok(...)` por:
```ts
    return this.tx.run(async () => {
      await this.users.save(user)
      await this.organizations.save(organization)
      await this.memberships.save(membership)
      return ok(toUserDTO(user))
    })
```

- [ ] **Step 6: Atualizar os outros 3 call sites**

`authenticate-user.test.ts:24` — adicionar import e o arg final:
```ts
import { InMemoryTransactionRunner } from '@/infrastructure/persistence/in-memory/in-memory-transaction-runner'
```
```ts
  const register = new RegisterUser(users, orgs, memberships, hasher, new SequentialIdGenerator(), new FixedClock(), new InMemoryTransactionRunner())
```
`get-current-user.test.ts:21` — mesmo import; adicionar `new InMemoryTransactionRunner()` como último argumento da construção do `register` (manter os demais args existentes).

- [ ] **Step 7: Adicionar `transactionRunner` ao container (in-memory por ora)**

Em `container.ts`: importar o runner e o tipo, acrescentar o campo na interface `Container` e no `build()`:
```ts
import { InMemoryTransactionRunner } from '@/infrastructure/persistence/in-memory/in-memory-transaction-runner'
import type { TransactionRunner } from '@/core/shared/application/transaction-runner'
```
Na interface `Container`, adicionar:
```ts
  transactionRunner: TransactionRunner
```
No objeto retornado por `build()`, adicionar:
```ts
    transactionRunner: new InMemoryTransactionRunner(),
```

- [ ] **Step 8: Injetar no factory**

`factories.ts:11` — atualizar `makeRegisterUser`:
```ts
  return new RegisterUser(c.users, c.organizations, c.memberships, c.hasher, c.idGenerator, c.clock, c.transactionRunner)
```

- [ ] **Step 9: Rodar testes**

Run: `npm test`
Expected: PASS (55 testes); `RegisterUser` agora atômico via runner no-op.

- [ ] **Step 10: Commit**

```bash
git add src/core/shared/application/transaction-runner.ts src/infrastructure/persistence/in-memory/in-memory-transaction-runner.ts src/core/identity src/composition
git commit -m "feat(core): port TransactionRunner e RegisterUser atômico (runner in-memory no-op)"
```

---

## Task 2: `fromTrusted` nos Value Objects

**Files:**
- Modify: os 6 VOs
- Create: `src/core/shared/domain/from-trusted.test.ts`

- [ ] **Step 1: Escrever o teste (vermelho)**

`src/core/shared/domain/from-trusted.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { Email } from '@/core/identity/domain/value-objects/email'
import { OrganizationSlug } from '@/core/identity/domain/value-objects/organization-slug'
import { Role } from '@/core/identity/domain/value-objects/role'
import { ProjectKey } from '@/core/projects/domain/value-objects/project-key'
import { ProjectName } from '@/core/projects/domain/value-objects/project-name'
import { ProjectStatus } from '@/core/projects/domain/value-objects/project-status'

describe('fromTrusted dos Value Objects', () => {
  it('reconstrói valores válidos', () => {
    expect(Email.fromTrusted('ana@example.com').value).toBe('ana@example.com')
    expect(OrganizationSlug.fromTrusted('ana').value).toBe('ana')
    expect(Role.fromTrusted('OWNER').value).toBe('OWNER')
    expect(ProjectKey.fromTrusted('GES').value).toBe('GES')
    expect(ProjectName.fromTrusted('Gestrô Core').value).toBe('Gestrô Core')
    expect(ProjectStatus.fromTrusted('ACTIVE').value).toBe('ACTIVE')
  })

  it('lança em valores corrompidos (dado persistido inválido é excepcional)', () => {
    expect(() => Email.fromTrusted('invalido')).toThrow()
    expect(() => Role.fromTrusted('ADMIN')).toThrow()
    expect(() => ProjectKey.fromTrusted('ges')).toThrow()
    expect(() => ProjectName.fromTrusted('')).toThrow()
    expect(() => ProjectStatus.fromTrusted('DONE')).toThrow()
  })
})
```

- [ ] **Step 2: Rodar para confirmar falha**

Run: `npx vitest run src/core/shared/domain/from-trusted.test.ts`
Expected: FAIL — `fromTrusted` não existe.

- [ ] **Step 3: Implementar `fromTrusted`**

`email.ts` — adicionar (mensagem sem o valor, pois e-mail é PII):
```ts
  static fromTrusted(value: string): Email {
    const result = Email.create(value)
    if (!result.ok) throw new Error('Email persistido inválido')
    return result.value
  }
```
`organization-slug.ts`:
```ts
  static fromTrusted(value: string): OrganizationSlug {
    return new OrganizationSlug(value)
  }
```
`role.ts`:
```ts
  static fromTrusted(value: string): Role {
    if (value === 'OWNER') return Role.OWNER
    throw new Error(`Role persistido inválido: ${value}`)
  }
```
`project-key.ts`:
```ts
  static fromTrusted(value: string): ProjectKey {
    const result = ProjectKey.create(value)
    if (!result.ok) throw new Error(`ProjectKey persistido inválido: ${value}`)
    return result.value
  }
```
`project-name.ts`:
```ts
  static fromTrusted(value: string): ProjectName {
    const result = ProjectName.create(value)
    if (!result.ok) throw new Error('ProjectName persistido inválido')
    return result.value
  }
```
`project-status.ts`:
```ts
  static fromTrusted(value: string): ProjectStatus {
    if (value === 'ACTIVE') return ProjectStatus.ACTIVE
    throw new Error(`Status persistido inválido: ${value}`)
  }
```

- [ ] **Step 4: Rodar testes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core
git commit -m "feat(core): fromTrusted nos Value Objects para reconstituição da persistência"
```

---

## Task 3: `OrganizationRepository.findById`

**Files:**
- Modify: `src/core/identity/domain/ports/organization-repository.ts`
- Modify: `src/infrastructure/persistence/in-memory/in-memory-organization.repository.ts`

- [ ] **Step 1: Adicionar `findById` ao port**

`organization-repository.ts`:
```ts
import type { Organization } from '../entities/organization'

export interface OrganizationRepository {
  save(organization: Organization): Promise<void>
  findById(id: string): Promise<Organization | null>
}
```

- [ ] **Step 2: Implementar no in-memory**

`in-memory-organization.repository.ts`:
```ts
  async findById(id: string): Promise<Organization | null> {
    return this.byId.get(id) ?? null
  }
```

- [ ] **Step 3: Verificar compilação e testes**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/core/identity/domain/ports/organization-repository.ts src/infrastructure/persistence/in-memory/in-memory-organization.repository.ts
git commit -m "feat(core): OrganizationRepository.findById (necessário para o contrato)"
```

---

## Task 4: Contracts (User, Organization, Membership) contra in-memory + save idempotente

**Files:**
- Create: `src/core/identity/domain/ports/user-repository.contract.ts`
- Create: `src/core/identity/domain/ports/organization-repository.contract.ts`
- Create: `src/core/identity/domain/ports/membership-repository.contract.ts`
- Create: `src/infrastructure/persistence/in-memory/in-memory-user.repository.test.ts`
- Create: `src/infrastructure/persistence/in-memory/in-memory-organization.repository.test.ts`
- Create: `src/infrastructure/persistence/in-memory/in-memory-membership.repository.test.ts`
- Modify: `src/infrastructure/persistence/in-memory/in-memory-membership.repository.ts`

- [ ] **Step 1: Contrato de User**

`user-repository.contract.ts`:
```ts
import { describe, expect, it, beforeEach } from 'vitest'
import type { UserRepository } from './user-repository'
import { User } from '../entities/user'
import { Email } from '../value-objects/email'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'

function buildUser(id: string, emailRaw: string): User {
  const email = Email.create(emailRaw)
  if (!email.ok) throw new Error('email inválido na fixture')
  return User.restore(id, {
    name: 'Ana',
    email: email.value,
    passwordHash: 'hash',
    createdAt: new FixedClock().now(),
  })
}

export function runUserRepositoryContract(makeRepository: () => UserRepository): void {
  describe('UserRepository (contrato)', () => {
    let repo: UserRepository
    beforeEach(() => {
      repo = makeRepository()
    })

    it('salva e recupera por id', async () => {
      await repo.save(buildUser('u-1', 'ana@example.com'))
      const found = await repo.findById('u-1')
      expect(found?.email.value).toBe('ana@example.com')
    })

    it('recupera por e-mail', async () => {
      await repo.save(buildUser('u-1', 'ana@example.com'))
      const found = await repo.findByEmail((Email.create('ana@example.com') as { value: Email }).value)
      expect(found?.id).toBe('u-1')
    })

    it('retorna null para inexistente', async () => {
      expect(await repo.findById('nope')).toBeNull()
      expect(await repo.findByEmail((Email.create('x@y.com') as { value: Email }).value)).toBeNull()
    })

    it('save é upsert por id', async () => {
      await repo.save(buildUser('u-1', 'ana@example.com'))
      await repo.save(
        User.restore('u-1', {
          name: 'Ana Maria',
          email: (Email.create('ana@example.com') as { value: Email }).value,
          passwordHash: 'hash2',
          createdAt: new FixedClock().now(),
        }),
      )
      const found = await repo.findById('u-1')
      expect(found?.name).toBe('Ana Maria')
      expect(found?.passwordHash).toBe('hash2')
    })
  })
}

// Suprime aviso de import não usado em ambientes que tree-shake fixtures.
void SequentialIdGenerator
```

> Nota: o `void SequentialIdGenerator` evita import órfão se não for usado; remova a linha e o import se o lint reclamar de variável não lida (mantenha apenas `FixedClock`).

- [ ] **Step 2: Contrato de Organization**

`organization-repository.contract.ts`:
```ts
import { describe, expect, it, beforeEach } from 'vitest'
import type { OrganizationRepository } from './organization-repository'
import { Organization } from '../entities/organization'
import { OrganizationSlug } from '../value-objects/organization-slug'
import { FixedClock } from '@/test-support/fakes'

function buildOrg(id: string, slug: string, name = 'Workspace'): Organization {
  return Organization.restore(id, {
    name,
    slug: OrganizationSlug.fromTrusted(slug),
    ownerId: 'owner-1',
    createdAt: new FixedClock().now(),
  })
}

export function runOrganizationRepositoryContract(makeRepository: () => OrganizationRepository): void {
  describe('OrganizationRepository (contrato)', () => {
    let repo: OrganizationRepository
    beforeEach(() => {
      repo = makeRepository()
    })

    it('salva e recupera por id', async () => {
      await repo.save(buildOrg('o-1', 'ana'))
      const found = await repo.findById('o-1')
      expect(found?.slug.value).toBe('ana')
    })

    it('retorna null para inexistente', async () => {
      expect(await repo.findById('nope')).toBeNull()
    })

    it('save é upsert por id', async () => {
      await repo.save(buildOrg('o-1', 'ana', 'Antigo'))
      await repo.save(buildOrg('o-1', 'ana', 'Novo'))
      const found = await repo.findById('o-1')
      expect(found?.name).toBe('Novo')
    })

    it('aceita slugs iguais em orgs distintas (sem unicidade de slug)', async () => {
      await repo.save(buildOrg('o-1', 'ana'))
      await repo.save(buildOrg('o-2', 'ana'))
      expect((await repo.findById('o-1'))?.slug.value).toBe('ana')
      expect((await repo.findById('o-2'))?.slug.value).toBe('ana')
    })
  })
}
```

- [ ] **Step 3: Contrato de Membership**

`membership-repository.contract.ts`:
```ts
import { describe, expect, it, beforeEach } from 'vitest'
import type { MembershipRepository } from './membership-repository'
import { Membership } from '../entities/membership'
import { Role } from '../value-objects/role'

function buildMembership(userId: string, orgId: string): Membership {
  return Membership.create({ userId, organizationId: orgId, role: Role.OWNER })
}

export function runMembershipRepositoryContract(makeRepository: () => MembershipRepository): void {
  describe('MembershipRepository (contrato)', () => {
    let repo: MembershipRepository
    beforeEach(() => {
      repo = makeRepository()
    })

    it('salva e lista por usuário', async () => {
      await repo.save(buildMembership('u-1', 'o-1'))
      const list = await repo.findByUser('u-1')
      expect(list).toHaveLength(1)
      expect(list[0].organizationId).toBe('o-1')
      expect(list[0].role.value).toBe('OWNER')
    })

    it('usuário sem membership retorna lista vazia', async () => {
      expect(await repo.findByUser('nope')).toEqual([])
    })

    it('lista múltiplas organizações do mesmo usuário', async () => {
      await repo.save(buildMembership('u-1', 'o-1'))
      await repo.save(buildMembership('u-1', 'o-2'))
      const list = await repo.findByUser('u-1')
      expect(list.map((m) => m.organizationId).sort()).toEqual(['o-1', 'o-2'])
    })

    it('save é idempotente por (usuário, organização)', async () => {
      await repo.save(buildMembership('u-1', 'o-1'))
      await repo.save(buildMembership('u-1', 'o-1'))
      const list = await repo.findByUser('u-1')
      expect(list).toHaveLength(1)
    })
  })
}
```

- [ ] **Step 4: Ligar os contratos ao in-memory**

`in-memory-user.repository.test.ts`:
```ts
import { runUserRepositoryContract } from '@/core/identity/domain/ports/user-repository.contract'
import { InMemoryUserRepository } from './in-memory-user.repository'

runUserRepositoryContract(() => new InMemoryUserRepository())
```
`in-memory-organization.repository.test.ts`:
```ts
import { runOrganizationRepositoryContract } from '@/core/identity/domain/ports/organization-repository.contract'
import { InMemoryOrganizationRepository } from './in-memory-organization.repository'

runOrganizationRepositoryContract(() => new InMemoryOrganizationRepository())
```
`in-memory-membership.repository.test.ts`:
```ts
import { runMembershipRepositoryContract } from '@/core/identity/domain/ports/membership-repository.contract'
import { InMemoryMembershipRepository } from './in-memory-membership.repository'

runMembershipRepositoryContract(() => new InMemoryMembershipRepository())
```

- [ ] **Step 5: Rodar — confirmar que o contrato de Membership FALHA (push duplica)**

Run: `npx vitest run src/infrastructure/persistence/in-memory/in-memory-membership.repository.test.ts`
Expected: FAIL no caso "save é idempotente" — `findByUser` retorna 2.

- [ ] **Step 6: Tornar o save in-memory idempotente**

Substituir o corpo de `in-memory-membership.repository.ts`:
```ts
import type { MembershipRepository } from '@/core/identity/domain/ports/membership-repository'
import type { Membership } from '@/core/identity/domain/entities/membership'

export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly all: Membership[] = []

  async save(membership: Membership): Promise<void> {
    const index = this.all.findIndex(
      (m) => m.userId === membership.userId && m.organizationId === membership.organizationId,
    )
    if (index >= 0) this.all[index] = membership
    else this.all.push(membership)
  }

  async findByUser(userId: string): Promise<Membership[]> {
    return this.all.filter((m) => m.userId === userId)
  }
}
```

- [ ] **Step 7: Rodar a suíte completa**

Run: `npm test`
Expected: PASS (contratos de User/Org/Membership verdes contra in-memory; total ~67 testes).

- [ ] **Step 8: Commit**

```bash
git add src/core/identity/domain/ports/*.contract.ts src/infrastructure/persistence/in-memory
git commit -m "test(core): contratos de User/Organization/Membership; save de membership idempotente"
```

---

## Task 5: Migração inicial + runner forward-only

**Files:**
- Create: `src/infrastructure/persistence/postgres/migrations/0001_init.sql`
- Create: `src/infrastructure/persistence/postgres/migrate.ts`

- [ ] **Step 1: Criar `0001_init.sql`**

```sql
CREATE TABLE users (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL
);

CREATE TABLE organizations (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  slug       text NOT NULL,
  owner_id   text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE memberships (
  user_id         text NOT NULL,
  organization_id text NOT NULL,
  role            text NOT NULL,
  PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE projects (
  id              text PRIMARY KEY,
  organization_id text NOT NULL,
  key             text NOT NULL,
  name            text NOT NULL,
  description     text NOT NULL,
  status          text NOT NULL,
  created_by      text NOT NULL,
  created_at      timestamptz NOT NULL,
  UNIQUE (organization_id, key)
);

CREATE INDEX idx_projects_org ON projects (organization_id);
```

- [ ] **Step 2: Criar `migrate.ts` (função + CLI)**

```ts
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Pool } from 'pg'

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString })
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         filename   text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    )
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
    const { rows } = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations')
    const applied = new Set(rows.map((r) => r.filename))

    for (const file of files) {
      if (applied.has(file)) continue
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8')
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
        await client.query('COMMIT')
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
    }
  } finally {
    await pool.end()
  }
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url)
if (isCli) {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL é obrigatória para migrar.')
    process.exit(1)
  }
  runMigrations(url)
    .then(() => {
      console.log('Migrações aplicadas.')
      process.exit(0)
    })
    .catch((e: unknown) => {
      console.error('Falha ao migrar:', e instanceof Error ? e.message : e)
      process.exit(1)
    })
}
```

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: limpo. (Execução real é validada na Task 6 via Testcontainers.)

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/persistence/postgres/migrations src/infrastructure/persistence/postgres/migrate.ts
git commit -m "feat(db): schema inicial 0001_init.sql e runner de migração forward-only"
```

---

## Task 6: `PgDatabase` + `PgTransactionRunner` + Testcontainers (teste de rollback)

**Files:**
- Create: `src/infrastructure/persistence/postgres/pg-database.ts`
- Create: `src/infrastructure/persistence/postgres/pg-transaction-runner.ts`
- Create: `src/test-support/pg-global-setup.ts`
- Create: `src/infrastructure/persistence/postgres/pg-transaction-runner.pg.test.ts`

- [ ] **Step 1: Criar `PgDatabase`**

```ts
import { AsyncLocalStorage } from 'node:async_hooks'
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'

/**
 * Detém o Pool e propaga, via AsyncLocalStorage, o client transacional corrente.
 * Fora de transação as queries usam o Pool (auto-commit por statement);
 * dentro de `transaction()` usam o client ligado (BEGIN/COMMIT/ROLLBACK).
 */
export class PgDatabase {
  private readonly als = new AsyncLocalStorage<PoolClient>()

  constructor(private readonly pool: Pool) {}

  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<R>> {
    const executor = this.als.getStore() ?? this.pool
    return executor.query<R>(text, params as unknown[])
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.als.getStore()) return work() // já em transação: reusa a corrente
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await this.als.run(client, work)
      await client.query('COMMIT')
      return result
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }

  async end(): Promise<void> {
    await this.pool.end()
  }
}
```

- [ ] **Step 2: Criar `PgTransactionRunner`**

```ts
import type { TransactionRunner } from '@/core/shared/application/transaction-runner'
import type { PgDatabase } from './pg-database'

export class PgTransactionRunner implements TransactionRunner {
  constructor(private readonly db: PgDatabase) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.db.transaction(work)
  }
}
```

- [ ] **Step 3: Criar o globalSetup do Testcontainers**

`src/test-support/pg-global-setup.ts`:
```ts
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { GlobalSetupContext } from 'vitest/node'
import { runMigrations } from '@/infrastructure/persistence/postgres/migrate'

let container: StartedPostgreSqlContainer

export default async function setup({ provide }: GlobalSetupContext): Promise<() => Promise<void>> {
  container = await new PostgreSqlContainer('postgres:16-alpine').start()
  const uri = container.getConnectionUri()
  await runMigrations(uri)
  provide('pgUri', uri)
  return async () => {
    await container.stop()
  }
}

declare module 'vitest' {
  export interface ProvidedContext {
    pgUri: string
  }
}
```

- [ ] **Step 4: Escrever o teste de transação (rollback)**

`pg-transaction-runner.pg.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, inject, it } from 'vitest'
import { Pool } from 'pg'
import { PgDatabase } from './pg-database'
import { PgTransactionRunner } from './pg-transaction-runner'

const pool = new Pool({ connectionString: inject('pgUri') })
const db = new PgDatabase(pool)
const tx = new PgTransactionRunner(db)

beforeEach(async () => {
  await pool.query('TRUNCATE users, organizations, memberships, projects RESTART IDENTITY CASCADE')
})

afterAll(async () => {
  await db.end()
})

describe('PgTransactionRunner', () => {
  it('commita quando o trabalho conclui', async () => {
    await tx.run(async () => {
      await db.query(
        'INSERT INTO users (id, name, email, password_hash, created_at) VALUES ($1,$2,$3,$4, now())',
        ['u-ok', 'Ana', 'ok@example.com', 'h'],
      )
    })
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', ['u-ok'])
    expect(rows).toHaveLength(1)
  })

  it('faz rollback quando o trabalho lança (nada é persistido)', async () => {
    await expect(
      tx.run(async () => {
        await db.query(
          'INSERT INTO users (id, name, email, password_hash, created_at) VALUES ($1,$2,$3,$4, now())',
          ['u-bad', 'Ana', 'bad@example.com', 'h'],
        )
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', ['u-bad'])
    expect(rows).toHaveLength(0)
  })
})
```

- [ ] **Step 5: Rodar a suíte de DB**

Run: `npm run test:db`
Expected: PASS — container sobe, migra, ambos os casos verdes. (Requer Docker.)

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/persistence/postgres/pg-database.ts src/infrastructure/persistence/postgres/pg-transaction-runner.ts src/test-support/pg-global-setup.ts src/infrastructure/persistence/postgres/pg-transaction-runner.pg.test.ts
git commit -m "feat(db): PgDatabase (ALS) + PgTransactionRunner com teste de rollback via Testcontainers"
```

---

## Task 7: `PgUserRepository` + mapper + contrato contra Postgres

**Files:**
- Create: `src/infrastructure/persistence/postgres/mappers/user.mapper.ts`
- Create: `src/infrastructure/persistence/postgres/pg-user.repository.ts`
- Create: `src/infrastructure/persistence/postgres/pg-user.repository.pg.test.ts`

- [ ] **Step 1: Criar o mapper**

`mappers/user.mapper.ts`:
```ts
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
```

- [ ] **Step 2: Criar o repositório**

`pg-user.repository.ts`:
```ts
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
```

- [ ] **Step 3: Escrever o teste do contrato contra Postgres**

`pg-user.repository.pg.test.ts`:
```ts
import { afterAll, beforeEach, inject } from 'vitest'
import { Pool } from 'pg'
import { PgDatabase } from './pg-database'
import { PgUserRepository } from './pg-user.repository'
import { runUserRepositoryContract } from '@/core/identity/domain/ports/user-repository.contract'

const pool = new Pool({ connectionString: inject('pgUri') })
const db = new PgDatabase(pool)

beforeEach(async () => {
  await pool.query('TRUNCATE users, organizations, memberships, projects RESTART IDENTITY CASCADE')
})

afterAll(async () => {
  await db.end()
})

runUserRepositoryContract(() => new PgUserRepository(db))
```

- [ ] **Step 4: Rodar test:db**

Run: `npm run test:db`
Expected: PASS — contrato de User verde contra Postgres e contra in-memory (este último em `npm test`).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/persistence/postgres/mappers/user.mapper.ts src/infrastructure/persistence/postgres/pg-user.repository.ts src/infrastructure/persistence/postgres/pg-user.repository.pg.test.ts
git commit -m "feat(db): PgUserRepository + mapper, validado pelo contrato"
```

---

## Task 8: `PgOrganizationRepository` + mapper + contrato

**Files:**
- Create: `src/infrastructure/persistence/postgres/mappers/organization.mapper.ts`
- Create: `src/infrastructure/persistence/postgres/pg-organization.repository.ts`
- Create: `src/infrastructure/persistence/postgres/pg-organization.repository.pg.test.ts`

- [ ] **Step 1: Mapper**

`mappers/organization.mapper.ts`:
```ts
import { Organization } from '@/core/identity/domain/entities/organization'
import { OrganizationSlug } from '@/core/identity/domain/value-objects/organization-slug'

export type OrganizationRow = {
  id: string
  name: string
  slug: string
  owner_id: string
  created_at: Date
}

export function rowToOrganization(row: OrganizationRow): Organization {
  return Organization.restore(row.id, {
    name: row.name,
    slug: OrganizationSlug.fromTrusted(row.slug),
    ownerId: row.owner_id,
    createdAt: new Date(row.created_at),
  })
}
```

- [ ] **Step 2: Repositório**

`pg-organization.repository.ts`:
```ts
import type { OrganizationRepository } from '@/core/identity/domain/ports/organization-repository'
import type { Organization } from '@/core/identity/domain/entities/organization'
import type { PgDatabase } from './pg-database'
import { rowToOrganization, type OrganizationRow } from './mappers/organization.mapper'

export class PgOrganizationRepository implements OrganizationRepository {
  constructor(private readonly db: PgDatabase) {}

  async save(organization: Organization): Promise<void> {
    await this.db.query(
      `INSERT INTO organizations (id, name, slug, owner_id, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         owner_id = EXCLUDED.owner_id,
         created_at = EXCLUDED.created_at`,
      [organization.id, organization.name, organization.slug.value, organization.ownerId, organization.createdAt],
    )
  }

  async findById(id: string): Promise<Organization | null> {
    const { rows } = await this.db.query<OrganizationRow>('SELECT * FROM organizations WHERE id = $1', [id])
    return rows[0] ? rowToOrganization(rows[0]) : null
  }
}
```

- [ ] **Step 3: Teste do contrato**

`pg-organization.repository.pg.test.ts`:
```ts
import { afterAll, beforeEach, inject } from 'vitest'
import { Pool } from 'pg'
import { PgDatabase } from './pg-database'
import { PgOrganizationRepository } from './pg-organization.repository'
import { runOrganizationRepositoryContract } from '@/core/identity/domain/ports/organization-repository.contract'

const pool = new Pool({ connectionString: inject('pgUri') })
const db = new PgDatabase(pool)

beforeEach(async () => {
  await pool.query('TRUNCATE users, organizations, memberships, projects RESTART IDENTITY CASCADE')
})

afterAll(async () => {
  await db.end()
})

runOrganizationRepositoryContract(() => new PgOrganizationRepository(db))
```

- [ ] **Step 4: Rodar test:db**

Run: `npm run test:db`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/persistence/postgres/mappers/organization.mapper.ts src/infrastructure/persistence/postgres/pg-organization.repository.ts src/infrastructure/persistence/postgres/pg-organization.repository.pg.test.ts
git commit -m "feat(db): PgOrganizationRepository + mapper, validado pelo contrato"
```

---

## Task 9: `PgMembershipRepository` + mapper + contrato

**Files:**
- Create: `src/infrastructure/persistence/postgres/mappers/membership.mapper.ts`
- Create: `src/infrastructure/persistence/postgres/pg-membership.repository.ts`
- Create: `src/infrastructure/persistence/postgres/pg-membership.repository.pg.test.ts`

- [ ] **Step 1: Mapper**

`mappers/membership.mapper.ts`:
```ts
import { Membership } from '@/core/identity/domain/entities/membership'
import { Role } from '@/core/identity/domain/value-objects/role'

export type MembershipRow = {
  user_id: string
  organization_id: string
  role: string
}

export function rowToMembership(row: MembershipRow): Membership {
  return Membership.create({
    userId: row.user_id,
    organizationId: row.organization_id,
    role: Role.fromTrusted(row.role),
  })
}
```

- [ ] **Step 2: Repositório**

`pg-membership.repository.ts`:
```ts
import type { MembershipRepository } from '@/core/identity/domain/ports/membership-repository'
import type { Membership } from '@/core/identity/domain/entities/membership'
import type { PgDatabase } from './pg-database'
import { rowToMembership, type MembershipRow } from './mappers/membership.mapper'

export class PgMembershipRepository implements MembershipRepository {
  constructor(private readonly db: PgDatabase) {}

  async save(membership: Membership): Promise<void> {
    await this.db.query(
      `INSERT INTO memberships (user_id, organization_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role`,
      [membership.userId, membership.organizationId, membership.role.value],
    )
  }

  async findByUser(userId: string): Promise<Membership[]> {
    const { rows } = await this.db.query<MembershipRow>('SELECT * FROM memberships WHERE user_id = $1', [userId])
    return rows.map(rowToMembership)
  }
}
```

- [ ] **Step 3: Teste do contrato**

`pg-membership.repository.pg.test.ts`:
```ts
import { afterAll, beforeEach, inject } from 'vitest'
import { Pool } from 'pg'
import { PgDatabase } from './pg-database'
import { PgMembershipRepository } from './pg-membership.repository'
import { runMembershipRepositoryContract } from '@/core/identity/domain/ports/membership-repository.contract'

const pool = new Pool({ connectionString: inject('pgUri') })
const db = new PgDatabase(pool)

beforeEach(async () => {
  await pool.query('TRUNCATE users, organizations, memberships, projects RESTART IDENTITY CASCADE')
})

afterAll(async () => {
  await db.end()
})

runMembershipRepositoryContract(() => new PgMembershipRepository(db))
```

- [ ] **Step 4: Rodar test:db**

Run: `npm run test:db`
Expected: PASS (inclui o caso de idempotência via `ON CONFLICT`).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/persistence/postgres/mappers/membership.mapper.ts src/infrastructure/persistence/postgres/pg-membership.repository.ts src/infrastructure/persistence/postgres/pg-membership.repository.pg.test.ts
git commit -m "feat(db): PgMembershipRepository + mapper (save idempotente), validado pelo contrato"
```

---

## Task 10: `PgProjectRepository` + mapper + contrato

**Files:**
- Create: `src/infrastructure/persistence/postgres/mappers/project.mapper.ts`
- Create: `src/infrastructure/persistence/postgres/pg-project.repository.ts`
- Create: `src/infrastructure/persistence/postgres/pg-project.repository.pg.test.ts`

- [ ] **Step 1: Mapper**

`mappers/project.mapper.ts`:
```ts
import { Project } from '@/core/projects/domain/entities/project'
import { ProjectKey } from '@/core/projects/domain/value-objects/project-key'
import { ProjectName } from '@/core/projects/domain/value-objects/project-name'
import { ProjectStatus } from '@/core/projects/domain/value-objects/project-status'

export type ProjectRow = {
  id: string
  organization_id: string
  key: string
  name: string
  description: string
  status: string
  created_by: string
  created_at: Date
}

export function rowToProject(row: ProjectRow): Project {
  return Project.restore(row.id, {
    organizationId: row.organization_id,
    key: ProjectKey.fromTrusted(row.key),
    name: ProjectName.fromTrusted(row.name),
    description: row.description,
    status: ProjectStatus.fromTrusted(row.status),
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  })
}
```

- [ ] **Step 2: Repositório**

`pg-project.repository.ts`:
```ts
import type { ProjectRepository } from '@/core/projects/domain/ports/project-repository'
import type { Project } from '@/core/projects/domain/entities/project'
import type { ProjectKey } from '@/core/projects/domain/value-objects/project-key'
import type { PgDatabase } from './pg-database'
import { rowToProject, type ProjectRow } from './mappers/project.mapper'

export class PgProjectRepository implements ProjectRepository {
  constructor(private readonly db: PgDatabase) {}

  async save(project: Project): Promise<void> {
    await this.db.query(
      `INSERT INTO projects (id, organization_id, key, name, description, status, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         key = EXCLUDED.key,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         created_by = EXCLUDED.created_by,
         created_at = EXCLUDED.created_at`,
      [
        project.id,
        project.organizationId,
        project.key.value,
        project.name.value,
        project.description,
        project.status.value,
        project.createdBy,
        project.createdAt,
      ],
    )
  }

  async findByKeyInOrg(organizationId: string, key: ProjectKey): Promise<Project | null> {
    const { rows } = await this.db.query<ProjectRow>(
      'SELECT * FROM projects WHERE organization_id = $1 AND key = $2',
      [organizationId, key.value],
    )
    return rows[0] ? rowToProject(rows[0]) : null
  }

  async listByOrg(organizationId: string): Promise<Project[]> {
    const { rows } = await this.db.query<ProjectRow>(
      'SELECT * FROM projects WHERE organization_id = $1',
      [organizationId],
    )
    return rows.map(rowToProject)
  }
}
```

- [ ] **Step 3: Teste do contrato**

`pg-project.repository.pg.test.ts`:
```ts
import { afterAll, beforeEach, inject } from 'vitest'
import { Pool } from 'pg'
import { PgDatabase } from './pg-database'
import { PgProjectRepository } from './pg-project.repository'
import { runProjectRepositoryContract } from '@/core/projects/domain/ports/project-repository.contract'

const pool = new Pool({ connectionString: inject('pgUri') })
const db = new PgDatabase(pool)

beforeEach(async () => {
  await pool.query('TRUNCATE users, organizations, memberships, projects RESTART IDENTITY CASCADE')
})

afterAll(async () => {
  await db.end()
})

runProjectRepositoryContract(() => new PgProjectRepository(db))
```

- [ ] **Step 4: Rodar test:db**

Run: `npm run test:db`
Expected: PASS — os 4 contratos + transação verdes contra Postgres.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/persistence/postgres/mappers/project.mapper.ts src/infrastructure/persistence/postgres/pg-project.repository.ts src/infrastructure/persistence/postgres/pg-project.repository.pg.test.ts
git commit -m "feat(db): PgProjectRepository + mapper, validado pelo contrato"
```

---

## Task 11: Seleção por `DATABASE_URL` no composition root

**Files:**
- Modify: `src/infrastructure/config/env.ts`
- Modify: `src/composition/container.ts`

- [ ] **Step 1: Atualizar `env.ts` (DATABASE_URL opcional; obrigatória em produção)**

```ts
import { z } from 'zod'

const schema = z
  .object({
    SESSION_SECRET: z
      .string()
      .min(32, { error: 'SESSION_SECRET deve ter ao menos 32 caracteres.' }),
    DATABASE_URL: z.string().min(1).optional(),
    NODE_ENV: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production' && !value.DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL é obrigatória em produção.',
      })
    }
  })

export const env = schema.parse({
  SESSION_SECRET: process.env.SESSION_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
})
```

- [ ] **Step 2: Selecionar a implementação no container**

Em `container.ts`, adicionar imports:
```ts
import { Pool } from 'pg'
import { PgDatabase } from '@/infrastructure/persistence/postgres/pg-database'
import { PgTransactionRunner } from '@/infrastructure/persistence/postgres/pg-transaction-runner'
import { PgUserRepository } from '@/infrastructure/persistence/postgres/pg-user.repository'
import { PgOrganizationRepository } from '@/infrastructure/persistence/postgres/pg-organization.repository'
import { PgMembershipRepository } from '@/infrastructure/persistence/postgres/pg-membership.repository'
import { PgProjectRepository } from '@/infrastructure/persistence/postgres/pg-project.repository'
```
Substituir o corpo de `build()` por uma ramificação:
```ts
function build(): Container {
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
```

- [ ] **Step 3: Verificar a suíte unit (sem DATABASE_URL → in-memory)**

Run: `npm test`
Expected: PASS (55+ testes); os testes de route-handler seguem em in-memory, pois `setup-env.ts` não define `DATABASE_URL`.

- [ ] **Step 4: Smoke manual contra Postgres real (opcional, recomendado)**

```bash
docker run --rm -d --name gestro-pg -e POSTGRES_PASSWORD=dev -p 5433:5432 postgres:16-alpine
DATABASE_URL=postgres://postgres:dev@localhost:5433/postgres npm run db:migrate
# subir a app com a mesma DATABASE_URL e validar signup/login/projeto
docker stop gestro-pg
```
Expected: migração aplica; fluxos do walking skeleton funcionam com Postgres.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/config/env.ts src/composition/container.ts
git commit -m "feat(app): seleciona Postgres via DATABASE_URL (obrigatória em produção), senão in-memory"
```

---

## Task 12: Documentação e verificação final

**Files:**
- Modify: `README.md` (ou criar nota em `docs/`)
- Modify: `docs/superpowers/specs/2026-06-02-adaptador-persistencia-postgres-design.md` (status)

- [ ] **Step 1: Documentar execução local com Postgres**

Acrescentar ao `README.md` uma seção "Banco de dados (PostgreSQL)":
```md
## Banco de dados (PostgreSQL)

Em dev/test, sem `DATABASE_URL`, a app usa repositórios in-memory. Para usar Postgres:

1. Suba um Postgres: `docker run --rm -d --name gestro-pg -e POSTGRES_PASSWORD=dev -p 5433:5432 postgres:16-alpine`
2. Exporte `DATABASE_URL=postgres://postgres:dev@localhost:5433/postgres`
3. Migre: `npm run db:migrate`
4. Rode a app normalmente (`npm run dev`).

Testes de integração contra Postgres real (requer Docker): `npm run test:db`.
Em produção, `DATABASE_URL` é obrigatória (a app falha ao iniciar sem ela).
```

- [ ] **Step 2: Atualizar o status da spec**

Em `2026-06-02-adaptador-persistencia-postgres-design.md`, mudar `**Status:** Aprovado (...)` para `**Status:** Implementado`.

- [ ] **Step 3: Verificação completa**

Run:
```bash
npx tsc --noEmit
npm run lint
npm test
npm run test:db
npm run build
```
Expected: tudo limpo/verde. (`test:db` requer Docker.)

- [ ] **Step 4: Commit**

```bash
git add README.md docs/superpowers/specs/2026-06-02-adaptador-persistencia-postgres-design.md
git commit -m "docs(db): instruções de Postgres local/test:db e status da spec"
```

---

## Self-Review (preenchido pelo autor do plano)

**Cobertura da spec:**
- D1 cutover 4 repos → Tasks 7–10 (+ container Task 11). ✅
- D2 pool singleton servidor longo → Task 6 (`PgDatabase` detém Pool) + Task 11 (singleton via `getContainer`). ✅
- D3 Testcontainers, suíte separada → Tasks 0, 6. ✅
- D4 tenancy app-level → SQL com `organization_id` em Tasks 9–10 + contrato de isolamento (Project). ✅
- D5 UoW atômico → Task 1 (port) + Task 6 (`PgTransactionRunner`) + `RegisterUser`. ✅
- D6 raw pg + .sql → Tasks 5–10. ✅ · D6a ALS → Task 6. ✅ · D6b slug sem UNIQUE → Task 5 (DDL) + contrato Task 4. ✅ · D6c membership idempotente → Task 4 (in-memory) + Task 9 (PG). ✅
- `fromTrusted` → Task 2. ✅ · seleção por DATABASE_URL/obrigatória em prod → Task 11. ✅ · migrate CLI → Task 5. ✅ · separação `*.pg.test.ts` → Task 0. ✅

**Placeholders:** nenhum — todo passo de código traz o código.

**Consistência de tipos/assinaturas:** `PgDatabase.query<R>(text, params)` usada uniformemente; `rowTo*` batem com `*.restore`/`create`; `TransactionRunner.run<T>` idêntico no port, no no-op e no Pg; `OrganizationRepository.findById` definido na Task 3 e usado nas Tasks 4 e 8.

**Risco residual conhecido:** `env.ts` passa a exigir `DATABASE_URL` em produção via `NODE_ENV` — confirmar que o ambiente de produção define ambas; o smoke da Task 11 cobre o caminho Postgres ponta a ponta.

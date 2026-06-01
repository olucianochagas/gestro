# Walking Skeleton: Identidade + Projetos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a primeira fatia vertical da Gestrô — registro/login/logout e CRUD parcial de Projetos (criar/listar/ver), multi-tenant — atravessando todas as camadas da Clean Architecture com núcleo de negócio testável e isolado do framework.

**Architecture:** Clean Architecture com núcleo isolado por contexto (`src/core/<contexto>` em TS puro), CQRS (comandos/consultas separados), portas/adaptadores (persistência in-memory hoje, Postgres depois), injeção de dependência via composition root, e apresentação Next.js 16 (Route Handlers REST + Server Actions + proxy de checagem otimista). Falhas de domínio via `Result<T,E>`; segurança por design (argon2id, sessão JWT httpOnly, isolamento de tenant).

**Tech Stack:** Next.js 16.2.6 · React 19.2.4 · TypeScript 5 (strict) · Tailwind 4 · `zod` · `jose` · `@node-rs/argon2` · `server-only` · Vitest · Cypress.

**Spec:** [docs/superpowers/specs/2026-06-01-identidade-projetos-walking-skeleton-design.md](../specs/2026-06-01-identidade-projetos-walking-skeleton-design.md)

### Desvios conscientes do spec
- **Deps de teste aparadas (YAGNI):** removidos `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@vitejs/plugin-react` (spec §14). Motivo: a estratégia de testes (spec §11) não tem teste unitário de componente — a UI é coberta por Cypress (E2E). Mantidos: `vitest`, `vite-tsconfig-paths`, `cypress`, `start-server-and-test`.
- **`cookie.secure`** é `NODE_ENV==='production'` (não `true` fixo) para o E2E em HTTP funcionar localmente. Em produção (HTTPS) fica `true`.

---

## Mapa de arquivos (o que cada um faz)

```
src/core/shared/domain/result.ts            Result<T,E> + helpers ok()/err()
src/core/shared/domain/domain-error.ts      Base DomainError (com code)
src/core/shared/domain/value-object.ts      Base ValueObject<T> (equals por valor)
src/core/shared/domain/entity.ts            Base Entity<TId> (equals por id)
src/core/shared/application/clock.ts         Porta Clock
src/core/shared/application/id-generator.ts  Porta IdGenerator
src/core/shared/application/use-case.ts      Interface UseCase<I,O>

src/core/identity/domain/value-objects/email.ts             Email VO (normaliza+valida)
src/core/identity/domain/value-objects/organization-slug.ts OrganizationSlug VO
src/core/identity/domain/value-objects/role.ts              Role VO (OWNER)
src/core/identity/domain/entities/user.ts                   User entity
src/core/identity/domain/entities/organization.ts           Organization entity
src/core/identity/domain/entities/membership.ts             Membership entity
src/core/identity/domain/errors/*.ts                        Erros de domínio Identity
src/core/identity/domain/ports/*.ts                         Repositórios + PasswordHasher + SessionService
src/core/identity/application/dtos/user.dto.ts              UserDTO + mapper
src/core/identity/application/commands/register-user.ts     RegisterUser (command)
src/core/identity/application/commands/authenticate-user.ts AuthenticateUser (command)
src/core/identity/application/queries/get-current-user.ts   GetCurrentUser (query)

src/core/projects/domain/value-objects/project-name.ts      ProjectName VO
src/core/projects/domain/value-objects/project-key.ts       ProjectKey VO
src/core/projects/domain/value-objects/project-status.ts    ProjectStatus VO (ACTIVE)
src/core/projects/domain/entities/project.ts                Project entity
src/core/projects/domain/errors/*.ts                        Erros de domínio Projects
src/core/projects/domain/ports/project-repository.ts        ProjectRepository
src/core/projects/application/dtos/project.dto.ts           ProjectDTO + mapper
src/core/projects/application/commands/create-project.ts    CreateProject (command)
src/core/projects/application/queries/list-projects.ts      ListProjects (query)
src/core/projects/application/queries/get-project.ts        GetProject (query)

src/infrastructure/persistence/in-memory/*.ts               Repos in-memory
src/infrastructure/security/argon2-password-hasher.ts       Argon2PasswordHasher
src/infrastructure/security/jose-session-service.ts         JoseSessionService (next/headers + jose)
src/infrastructure/system/system-clock.ts                   SystemClock
src/infrastructure/system/crypto-id-generator.ts            CryptoIdGenerator
src/infrastructure/config/env.ts                            Validação de env (zod)

src/composition/container.ts                                Composition root (singleton dev-safe)
src/composition/factories.ts                                Factories de casos de uso

src/app/lib/dal.ts                                          verifySession()/getCurrentUser() (páginas)
src/app/lib/api-auth.ts                                     readApiSession()/requireApiSession() (API)
src/app/lib/http.ts                                         Helpers de resposta JSON
src/app/api/v1/auth/register/route.ts                       POST registro
src/app/api/v1/auth/session/route.ts                        POST login / DELETE logout
src/app/api/v1/projects/route.ts                            GET listar / POST criar
src/app/api/v1/projects/[key]/route.ts                      GET detalhe
src/app/lib/actions/auth.actions.ts                         Server Actions de auth
src/app/lib/actions/project.actions.ts                      Server Action de projeto
src/app/(auth)/login/page.tsx                               Tela login
src/app/(auth)/signup/page.tsx                              Tela cadastro
src/app/(auth)/_components/auth-form.tsx                    Form client (useActionState)
src/app/(app)/dashboard/page.tsx                            Dashboard
src/app/(app)/projects/page.tsx                             Lista de projetos
src/app/(app)/projects/loading.tsx                          Estado carregando
src/app/(app)/projects/error.tsx                            Estado erro
src/app/(app)/projects/new/page.tsx                         Criar projeto
src/app/(app)/projects/[key]/page.tsx                       Detalhe
src/app/(app)/projects/[key]/not-found.tsx                  404 detalhe
src/proxy.ts                                                Proxy (checagem otimista)

src/test-support/fakes.ts                                   FixedClock, SequentialIdGenerator
vitest.config.mts                                           Config Vitest
cypress.config.ts                                           Config Cypress
cypress/e2e/walking-skeleton.cy.ts                          Jornada E2E
.env.example                                                SESSION_SECRET=
```

---

## Fase 0 — Setup do projeto

### Task 0.1: Instalar dependências

**Files:** Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Instalar runtime + dev deps**

Run:
```bash
npm install zod jose @node-rs/argon2 server-only
npm install -D vitest vite-tsconfig-paths cypress start-server-and-test
```
Expected: instala sem erros; `package.json` ganha as dependências.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: adiciona deps da fatia (zod, jose, argon2, vitest, cypress)"
```

### Task 0.2: Configurar Vitest, scripts e env de exemplo

**Files:**
- Create: `vitest.config.mts`
- Create: `.env.example`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Criar o stub de `server-only` para testes**

`src/test-support/server-only.ts`:
```ts
// Stub vazio: em testes (Node) substituímos o pacote `server-only`, que de outra
// forma lança erro ao ser importado fora de um bundle de servidor do Next.
export {}
```

- [ ] **Step 2: Criar `vitest.config.mts`**

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Evita que `import 'server-only'` quebre os testes de integração.
      'server-only': fileURLToPath(new URL('./src/test-support/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // SESSION_SECRET é exigido pela validação de env (infra/config/env.ts),
    // carregada por testes de integração dos Route Handlers.
    env: {
      SESSION_SECRET: 'test-session-secret-with-at-least-32-chars',
      NODE_ENV: 'test',
    },
  },
})
```

- [ ] **Step 3: Criar `.env.example`**

```bash
# Segredo para assinar a sessão JWT (gere com: openssl rand -base64 32)
SESSION_SECRET=
```

- [ ] **Step 4: Adicionar scripts ao `package.json`**

Adicione ao bloco `"scripts"` (mantenha os existentes `dev`/`build`/`start`/`lint`):
```json
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "start-server-and-test dev http://localhost:3000 \"cypress run --e2e\"",
    "e2e:open": "start-server-and-test dev http://localhost:3000 \"cypress open --e2e\""
```

- [ ] **Step 5: Verificar que o Vitest roda (sem testes ainda)**

Run: `npm test`
Expected: Vitest inicia e reporta "No test files found" (ainda não há `*.test.ts`). Sem erro de config.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.mts .env.example package.json src/test-support/server-only.ts
git commit -m "build: configura vitest, scripts de teste e .env.example"
```

---

## Fase 1 — Shared Kernel (`src/core/shared`)

> TS puro, reutilizado por todos os contextos. Tipos/bases sem lógica não exigem teste; `equals` (que tem comportamento) é testado.

### Task 1.1: `Result<T,E>` + helpers

**Files:** Create: `src/core/shared/domain/result.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
export interface Ok<T> {
  readonly ok: true
  readonly value: T
}

export interface Err<E> {
  readonly ok: false
  readonly error: E
}

export type Result<T, E> = Ok<T> | Err<E>

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const err = <E>(error: E): Err<E> => ({ ok: false, error })
```

- [ ] **Step 2: Commit**

```bash
git add src/core/shared/domain/result.ts
git commit -m "feat(shared): tipo Result<T,E> com helpers ok/err"
```

### Task 1.2: `DomainError` base

**Files:** Create: `src/core/shared/domain/domain-error.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
export abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/shared/domain/domain-error.ts
git commit -m "feat(shared): base DomainError com code"
```

### Task 1.3: Bases `ValueObject` e `Entity` (com teste de `equals`)

**Files:**
- Create: `src/core/shared/domain/value-object.ts`
- Create: `src/core/shared/domain/entity.ts`
- Test: `src/core/shared/domain/equals.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`src/core/shared/domain/equals.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { ValueObject } from './value-object'
import { Entity } from './entity'

class Money extends ValueObject<{ amount: number }> {
  constructor(amount: number) {
    super({ amount })
  }
}

class Widget extends Entity<string> {
  constructor(id: string) {
    super(id)
  }
}

describe('ValueObject.equals', () => {
  it('é igual quando os valores são iguais', () => {
    expect(new Money(10).equals(new Money(10))).toBe(true)
  })

  it('é diferente quando os valores diferem', () => {
    expect(new Money(10).equals(new Money(20))).toBe(false)
  })

  it('é diferente de undefined', () => {
    expect(new Money(10).equals(undefined)).toBe(false)
  })
})

describe('Entity.equals', () => {
  it('é igual quando o id é igual (mesmo conteúdo diferente)', () => {
    expect(new Widget('a').equals(new Widget('a'))).toBe(true)
  })

  it('é diferente quando o id difere', () => {
    expect(new Widget('a').equals(new Widget('b'))).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- equals`
Expected: FAIL — `value-object.ts`/`entity.ts` não existem.

- [ ] **Step 3: Implementar `value-object.ts`**

```ts
export abstract class ValueObject<T> {
  protected readonly props: T

  protected constructor(props: T) {
    this.props = Object.freeze(props)
  }

  equals(other?: ValueObject<T>): boolean {
    if (!other) return false
    return JSON.stringify(this.props) === JSON.stringify(other.props)
  }
}
```

- [ ] **Step 4: Implementar `entity.ts`**

```ts
export abstract class Entity<TId> {
  readonly id: TId

  protected constructor(id: TId) {
    this.id = id
  }

  equals(other?: Entity<TId>): boolean {
    if (!other) return false
    return this.id === other.id
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- equals`
Expected: PASS (5 testes).

- [ ] **Step 6: Commit**

```bash
git add src/core/shared/domain/value-object.ts src/core/shared/domain/entity.ts src/core/shared/domain/equals.test.ts
git commit -m "feat(shared): bases ValueObject e Entity com equals"
```

### Task 1.4: Portas `Clock`, `IdGenerator`, `UseCase`

**Files:**
- Create: `src/core/shared/application/clock.ts`
- Create: `src/core/shared/application/id-generator.ts`
- Create: `src/core/shared/application/use-case.ts`

- [ ] **Step 1: Criar `clock.ts`**

```ts
export interface Clock {
  now(): Date
}
```

- [ ] **Step 2: Criar `id-generator.ts`**

```ts
export interface IdGenerator {
  generate(): string
}
```

- [ ] **Step 3: Criar `use-case.ts`**

```ts
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>
}
```

- [ ] **Step 4: Commit**

```bash
git add src/core/shared/application
git commit -m "feat(shared): portas Clock, IdGenerator e interface UseCase"
```

### Task 1.5: Fakes de teste (`FixedClock`, `SequentialIdGenerator`)

**Files:** Create: `src/test-support/fakes.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'

export class FixedClock implements Clock {
  constructor(private readonly fixed: Date = new Date('2026-06-01T12:00:00.000Z')) {}
  now(): Date {
    return this.fixed
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0
  constructor(private readonly prefix = 'id') {}
  generate(): string {
    this.counter += 1
    return `${this.prefix}-${this.counter}`
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/test-support/fakes.ts
git commit -m "test(shared): fakes determinísticos FixedClock e SequentialIdGenerator"
```

---

## Fase 2 — Domínio Identity (`src/core/identity/domain`)

### Task 2.1: Erros de domínio do Identity

**Files:**
- Create: `src/core/identity/domain/errors/invalid-email.error.ts`
- Create: `src/core/identity/domain/errors/email-already-in-use.error.ts`
- Create: `src/core/identity/domain/errors/invalid-credentials.error.ts`

- [ ] **Step 1: Criar `invalid-email.error.ts`**

```ts
import { DomainError } from '@/core/shared/domain/domain-error'

export class InvalidEmailError extends DomainError {
  readonly code = 'IDENTITY.INVALID_EMAIL'
  constructor(raw: string) {
    super(`E-mail inválido: "${raw}".`)
  }
}
```

- [ ] **Step 2: Criar `email-already-in-use.error.ts`**

```ts
import { DomainError } from '@/core/shared/domain/domain-error'

export class EmailAlreadyInUseError extends DomainError {
  readonly code = 'IDENTITY.EMAIL_ALREADY_IN_USE'
  constructor() {
    super('Este e-mail já está em uso.')
  }
}
```

- [ ] **Step 3: Criar `invalid-credentials.error.ts`**

```ts
import { DomainError } from '@/core/shared/domain/domain-error'

export class InvalidCredentialsError extends DomainError {
  readonly code = 'IDENTITY.INVALID_CREDENTIALS'
  constructor() {
    super('Credenciais inválidas.')
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/core/identity/domain/errors
git commit -m "feat(identity): erros de domínio (email inválido, em uso, credenciais)"
```

### Task 2.2: `Email` value object

**Files:**
- Create: `src/core/identity/domain/value-objects/email.ts`
- Test: `src/core/identity/domain/value-objects/email.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`email.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { Email } from './email'
import { InvalidEmailError } from '../errors/invalid-email.error'

describe('Email', () => {
  it('normaliza (trim + lowercase) um e-mail válido', () => {
    const result = Email.create('  User@Example.COM ')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.value).toBe('user@example.com')
  })

  it('rejeita e-mail sem @ com InvalidEmailError', () => {
    const result = Email.create('not-an-email')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidEmailError)
  })

  it('rejeita string vazia', () => {
    expect(Email.create('').ok).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- email`
Expected: FAIL — `email.ts` não existe.

- [ ] **Step 3: Implementar `email.ts`**

```ts
import { ValueObject } from '@/core/shared/domain/value-object'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { InvalidEmailError } from '../errors/invalid-email.error'

export class Email extends ValueObject<{ value: string }> {
  private static readonly PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  private constructor(value: string) {
    super({ value })
  }

  get value(): string {
    return this.props.value
  }

  static create(raw: string): Result<Email, InvalidEmailError> {
    const normalized = raw.trim().toLowerCase()
    if (!Email.PATTERN.test(normalized)) {
      return err(new InvalidEmailError(raw))
    }
    return ok(new Email(normalized))
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- email`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/core/identity/domain/value-objects/email.ts src/core/identity/domain/value-objects/email.test.ts
git commit -m "feat(identity): Email value object com normalização e validação"
```

### Task 2.3: `OrganizationSlug` value object

**Files:**
- Create: `src/core/identity/domain/value-objects/organization-slug.ts`
- Test: `src/core/identity/domain/value-objects/organization-slug.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`organization-slug.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { OrganizationSlug } from './organization-slug'

describe('OrganizationSlug', () => {
  it('deriva slug a partir de um nome com acentos e espaços', () => {
    expect(OrganizationSlug.fromText('Workspace da Ana').value).toBe('workspace-da-ana')
  })

  it('colapsa caracteres não alfanuméricos em hífens', () => {
    expect(OrganizationSlug.fromText('Time   ###  X').value).toBe('time-x')
  })

  it('nunca retorna slug vazio (fallback)', () => {
    expect(OrganizationSlug.fromText('@@@').value.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- organization-slug`
Expected: FAIL — arquivo não existe.

- [ ] **Step 3: Implementar `organization-slug.ts`**

```ts
import { ValueObject } from '@/core/shared/domain/value-object'

export class OrganizationSlug extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value })
  }

  get value(): string {
    return this.props.value
  }

  static fromText(text: string): OrganizationSlug {
    const slug = text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return new OrganizationSlug(slug.length > 0 ? slug : 'org')
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- organization-slug`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/core/identity/domain/value-objects/organization-slug.ts src/core/identity/domain/value-objects/organization-slug.test.ts
git commit -m "feat(identity): OrganizationSlug value object derivado de texto"
```

### Task 2.4: `Role` value object

**Files:** Create: `src/core/identity/domain/value-objects/role.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import { ValueObject } from '@/core/shared/domain/value-object'

export type RoleValue = 'OWNER'

export class Role extends ValueObject<{ value: RoleValue }> {
  static readonly OWNER = new Role('OWNER')

  private constructor(value: RoleValue) {
    super({ value })
  }

  get value(): RoleValue {
    return this.props.value
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/identity/domain/value-objects/role.ts
git commit -m "feat(identity): Role value object (OWNER) — costura p/ RBAC futuro"
```

### Task 2.5: Entidades `User`, `Organization`, `Membership`

**Files:**
- Create: `src/core/identity/domain/entities/user.ts`
- Create: `src/core/identity/domain/entities/organization.ts`
- Create: `src/core/identity/domain/entities/membership.ts`

- [ ] **Step 1: Criar `user.ts`**

```ts
import { Entity } from '@/core/shared/domain/entity'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'
import type { Email } from '../value-objects/email'

interface UserProps {
  name: string
  email: Email
  passwordHash: string
  createdAt: Date
}

export class User extends Entity<string> {
  private readonly props: UserProps

  private constructor(id: string, props: UserProps) {
    super(id)
    this.props = props
  }

  get name(): string {
    return this.props.name
  }
  get email(): Email {
    return this.props.email
  }
  get passwordHash(): string {
    return this.props.passwordHash
  }
  get createdAt(): Date {
    return this.props.createdAt
  }

  static create(
    input: { name: string; email: Email; passwordHash: string },
    deps: { idGenerator: IdGenerator; clock: Clock },
  ): User {
    return new User(deps.idGenerator.generate(), {
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: deps.clock.now(),
    })
  }

  static restore(id: string, props: UserProps): User {
    return new User(id, props)
  }
}
```

- [ ] **Step 2: Criar `organization.ts`**

```ts
import { Entity } from '@/core/shared/domain/entity'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'
import type { OrganizationSlug } from '../value-objects/organization-slug'

interface OrganizationProps {
  name: string
  slug: OrganizationSlug
  ownerId: string
  createdAt: Date
}

export class Organization extends Entity<string> {
  private readonly props: OrganizationProps

  private constructor(id: string, props: OrganizationProps) {
    super(id)
    this.props = props
  }

  get name(): string {
    return this.props.name
  }
  get slug(): OrganizationSlug {
    return this.props.slug
  }
  get ownerId(): string {
    return this.props.ownerId
  }
  get createdAt(): Date {
    return this.props.createdAt
  }

  static create(
    input: { name: string; slug: OrganizationSlug; ownerId: string },
    deps: { idGenerator: IdGenerator; clock: Clock },
  ): Organization {
    return new Organization(deps.idGenerator.generate(), {
      name: input.name,
      slug: input.slug,
      ownerId: input.ownerId,
      createdAt: deps.clock.now(),
    })
  }

  static restore(id: string, props: OrganizationProps): Organization {
    return new Organization(id, props)
  }
}
```

- [ ] **Step 3: Criar `membership.ts`**

```ts
import type { Role } from '../value-objects/role'

interface MembershipProps {
  userId: string
  organizationId: string
  role: Role
}

export class Membership {
  private readonly props: MembershipProps

  private constructor(props: MembershipProps) {
    this.props = props
  }

  get userId(): string {
    return this.props.userId
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get role(): Role {
    return this.props.role
  }

  static create(input: { userId: string; organizationId: string; role: Role }): Membership {
    return new Membership(input)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/core/identity/domain/entities
git commit -m "feat(identity): entidades User, Organization e Membership"
```

### Task 2.6: Portas do Identity

**Files:**
- Create: `src/core/identity/domain/ports/user-repository.ts`
- Create: `src/core/identity/domain/ports/organization-repository.ts`
- Create: `src/core/identity/domain/ports/membership-repository.ts`
- Create: `src/core/identity/domain/ports/password-hasher.ts`
- Create: `src/core/identity/domain/ports/session-service.ts`

- [ ] **Step 1: Criar `user-repository.ts`**

```ts
import type { User } from '../entities/user'
import type { Email } from '../value-objects/email'

export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
}
```

- [ ] **Step 2: Criar `organization-repository.ts`**

```ts
import type { Organization } from '../entities/organization'

export interface OrganizationRepository {
  save(organization: Organization): Promise<void>
}
```

- [ ] **Step 3: Criar `membership-repository.ts`**

```ts
import type { Membership } from '../entities/membership'

export interface MembershipRepository {
  save(membership: Membership): Promise<void>
  findByUser(userId: string): Promise<Membership[]>
}
```

- [ ] **Step 4: Criar `password-hasher.ts`**

```ts
export interface PasswordHasher {
  hash(plain: string): Promise<string>
  verify(plain: string, hash: string): Promise<boolean>
}
```

- [ ] **Step 5: Criar `session-service.ts`**

```ts
export interface SessionData {
  userId: string
  organizationId: string
}

// Porta de TRANSPORTE: consumida pela apresentação (DAL/Server Actions/Route Handlers),
// não pelos casos de uso puros.
export interface SessionService {
  issue(userId: string, organizationId: string): Promise<void>
  read(): Promise<SessionData | null>
  revoke(): Promise<void>
}
```

- [ ] **Step 6: Commit**

```bash
git add src/core/identity/domain/ports
git commit -m "feat(identity): portas (repos, PasswordHasher, SessionService)"
```

---

## Fase 3 — Aplicação Identity (`src/core/identity/application`)

### Task 3.1: `UserDTO` + mapper

**Files:** Create: `src/core/identity/application/dtos/user.dto.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/core/identity/application/dtos/user.dto.ts
git commit -m "feat(identity): UserDTO + mapper (sem passwordHash)"
```

### Task 3.2: `RegisterUser` (command)

**Files:**
- Create: `src/core/identity/application/commands/register-user.ts`
- Test: `src/core/identity/application/commands/register-user.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`register-user.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { RegisterUser } from './register-user'
import { InMemoryUserRepository } from '@/infrastructure/persistence/in-memory/in-memory-user.repository'
import { InMemoryOrganizationRepository } from '@/infrastructure/persistence/in-memory/in-memory-organization.repository'
import { InMemoryMembershipRepository } from '@/infrastructure/persistence/in-memory/in-memory-membership.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'
import { EmailAlreadyInUseError } from '../../domain/errors/email-already-in-use.error'
import { InvalidEmailError } from '../../domain/errors/invalid-email.error'
import { Email } from '../../domain/value-objects/email'

class StubHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`
  }
}

function makeSut() {
  const users = new InMemoryUserRepository()
  const orgs = new InMemoryOrganizationRepository()
  const memberships = new InMemoryMembershipRepository()
  const sut = new RegisterUser(
    users,
    orgs,
    memberships,
    new StubHasher(),
    new SequentialIdGenerator(),
    new FixedClock(),
  )
  return { sut, users, memberships }
}

describe('RegisterUser', () => {
  it('cria usuário + organização pessoal + membership OWNER', async () => {
    const { sut, users, memberships } = makeSut()

    const result = await sut.execute({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({ id: 'id-1', name: 'Ana', email: 'ana@example.com' })

    const saved = await users.findByEmail((Email.create('ana@example.com') as { value: Email }).value)
    expect(saved?.passwordHash).toBe('hashed:Str0ng!Pass')

    const userMemberships = await memberships.findByUser('id-1')
    expect(userMemberships).toHaveLength(1)
    expect(userMemberships[0].role.value).toBe('OWNER')
  })

  it('rejeita e-mail duplicado', async () => {
    const { sut } = makeSut()
    await sut.execute({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' })

    const result = await sut.execute({ name: 'Outra', email: 'ANA@example.com', password: 'Str0ng!Pass' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(EmailAlreadyInUseError)
  })

  it('rejeita e-mail inválido', async () => {
    const { sut } = makeSut()
    const result = await sut.execute({ name: 'Ana', email: 'invalido', password: 'Str0ng!Pass' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidEmailError)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- register-user`
Expected: FAIL — `register-user.ts` e os repos in-memory ainda não existem. (Os repos in-memory são criados na Fase 6; este teste só ficará verde após a Task 6.x. Veja a nota de ordenação no fim do arquivo.)

> **Nota de ordenação:** os testes de caso de uso dependem dos repos in-memory (Fase 6). Ao executar via subagentes, implemente a Fase 6 (repos in-memory) **antes** de rodar os testes das Fases 3 e 5, ou rode-os ao final. O passo "ver falhar" continua válido (falha por import inexistente).

- [ ] **Step 3: Implementar `register-user.ts`**

```ts
import type { UseCase } from '@/core/shared/application/use-case'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { Email } from '../../domain/value-objects/email'
import { OrganizationSlug } from '../../domain/value-objects/organization-slug'
import { Role } from '../../domain/value-objects/role'
import { User } from '../../domain/entities/user'
import { Organization } from '../../domain/entities/organization'
import { Membership } from '../../domain/entities/membership'
import type { UserRepository } from '../../domain/ports/user-repository'
import type { OrganizationRepository } from '../../domain/ports/organization-repository'
import type { MembershipRepository } from '../../domain/ports/membership-repository'
import type { PasswordHasher } from '../../domain/ports/password-hasher'
import { InvalidEmailError } from '../../domain/errors/invalid-email.error'
import { EmailAlreadyInUseError } from '../../domain/errors/email-already-in-use.error'
import { type UserDTO, toUserDTO } from '../dtos/user.dto'

export interface RegisterUserInput {
  name: string
  email: string
  password: string
}

type RegisterUserError = InvalidEmailError | EmailAlreadyInUseError

export class RegisterUser implements UseCase<RegisterUserInput, Result<UserDTO, RegisterUserError>> {
  constructor(
    private readonly users: UserRepository,
    private readonly organizations: OrganizationRepository,
    private readonly memberships: MembershipRepository,
    private readonly hasher: PasswordHasher,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: RegisterUserInput): Promise<Result<UserDTO, RegisterUserError>> {
    const emailResult = Email.create(input.email)
    if (!emailResult.ok) return err(emailResult.error)
    const email = emailResult.value

    const existing = await this.users.findByEmail(email)
    if (existing) return err(new EmailAlreadyInUseError())

    const passwordHash = await this.hasher.hash(input.password)
    const deps = { idGenerator: this.idGenerator, clock: this.clock }

    const user = User.create({ name: input.name, email, passwordHash }, deps)
    const organization = Organization.create(
      {
        name: `Workspace de ${input.name}`,
        slug: OrganizationSlug.fromText(input.name),
        ownerId: user.id,
      },
      deps,
    )
    const membership = Membership.create({
      userId: user.id,
      organizationId: organization.id,
      role: Role.OWNER,
    })

    await this.users.save(user)
    await this.organizations.save(organization)
    await this.memberships.save(membership)

    return ok(toUserDTO(user))
  }
}
```

- [ ] **Step 4: Rodar e ver passar** (após Fase 6 estar implementada)

Run: `npm test -- register-user`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/core/identity/application/commands/register-user.ts src/core/identity/application/commands/register-user.test.ts
git commit -m "feat(identity): caso de uso RegisterUser (user + org pessoal + membership)"
```

### Task 3.3: `AuthenticateUser` (command)

**Files:**
- Create: `src/core/identity/application/commands/authenticate-user.ts`
- Test: `src/core/identity/application/commands/authenticate-user.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`authenticate-user.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { AuthenticateUser } from './authenticate-user'
import { RegisterUser } from './register-user'
import { InMemoryUserRepository } from '@/infrastructure/persistence/in-memory/in-memory-user.repository'
import { InMemoryOrganizationRepository } from '@/infrastructure/persistence/in-memory/in-memory-organization.repository'
import { InMemoryMembershipRepository } from '@/infrastructure/persistence/in-memory/in-memory-membership.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error'

class StubHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`
  }
}

async function makeSut() {
  const users = new InMemoryUserRepository()
  const orgs = new InMemoryOrganizationRepository()
  const memberships = new InMemoryMembershipRepository()
  const hasher = new StubHasher()
  const register = new RegisterUser(users, orgs, memberships, hasher, new SequentialIdGenerator(), new FixedClock())
  await register.execute({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' })
  const sut = new AuthenticateUser(users, memberships, hasher)
  return { sut }
}

describe('AuthenticateUser', () => {
  it('retorna SessionData com userId e organizationId quando as credenciais batem', async () => {
    const { sut } = await makeSut()
    const result = await sut.execute({ email: 'ana@example.com', password: 'Str0ng!Pass' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.userId).toBe('id-1')
      expect(result.value.organizationId).toBe('id-2')
    }
  })

  it('falha com InvalidCredentials para senha errada', async () => {
    const { sut } = await makeSut()
    const result = await sut.execute({ email: 'ana@example.com', password: 'errada' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidCredentialsError)
  })

  it('falha com InvalidCredentials (genérico) para e-mail inexistente', async () => {
    const { sut } = await makeSut()
    const result = await sut.execute({ email: 'ninguem@example.com', password: 'Str0ng!Pass' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidCredentialsError)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- authenticate-user`
Expected: FAIL — `authenticate-user.ts` não existe.

- [ ] **Step 3: Implementar `authenticate-user.ts`**

```ts
import type { UseCase } from '@/core/shared/application/use-case'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { Email } from '../../domain/value-objects/email'
import type { UserRepository } from '../../domain/ports/user-repository'
import type { MembershipRepository } from '../../domain/ports/membership-repository'
import type { PasswordHasher } from '../../domain/ports/password-hasher'
import type { SessionData } from '../../domain/ports/session-service'
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error'

export interface AuthenticateUserInput {
  email: string
  password: string
}

export class AuthenticateUser
  implements UseCase<AuthenticateUserInput, Result<SessionData, InvalidCredentialsError>>
{
  constructor(
    private readonly users: UserRepository,
    private readonly memberships: MembershipRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<Result<SessionData, InvalidCredentialsError>> {
    const emailResult = Email.create(input.email)
    if (!emailResult.ok) return err(new InvalidCredentialsError())

    const user = await this.users.findByEmail(emailResult.value)
    if (!user) return err(new InvalidCredentialsError())

    const valid = await this.hasher.verify(input.password, user.passwordHash)
    if (!valid) return err(new InvalidCredentialsError())

    const memberships = await this.memberships.findByUser(user.id)
    const membership = memberships[0]
    if (!membership) return err(new InvalidCredentialsError())

    return ok({ userId: user.id, organizationId: membership.organizationId })
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- authenticate-user`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/core/identity/application/commands/authenticate-user.ts src/core/identity/application/commands/authenticate-user.test.ts
git commit -m "feat(identity): caso de uso AuthenticateUser (retorna SessionData)"
```

### Task 3.4: `GetCurrentUser` (query)

**Files:**
- Create: `src/core/identity/application/queries/get-current-user.ts`
- Test: `src/core/identity/application/queries/get-current-user.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`get-current-user.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { GetCurrentUser } from './get-current-user'
import { RegisterUser } from '../commands/register-user'
import { InMemoryUserRepository } from '@/infrastructure/persistence/in-memory/in-memory-user.repository'
import { InMemoryOrganizationRepository } from '@/infrastructure/persistence/in-memory/in-memory-organization.repository'
import { InMemoryMembershipRepository } from '@/infrastructure/persistence/in-memory/in-memory-membership.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'

class StubHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`
  }
  async verify(): Promise<boolean> {
    return true
  }
}

describe('GetCurrentUser', () => {
  it('retorna UserDTO para um id existente', async () => {
    const users = new InMemoryUserRepository()
    const register = new RegisterUser(
      users,
      new InMemoryOrganizationRepository(),
      new InMemoryMembershipRepository(),
      new StubHasher(),
      new SequentialIdGenerator(),
      new FixedClock(),
    )
    await register.execute({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' })

    const dto = await new GetCurrentUser(users).execute({ userId: 'id-1' })
    expect(dto).toEqual({ id: 'id-1', name: 'Ana', email: 'ana@example.com' })
  })

  it('retorna null para id inexistente', async () => {
    const dto = await new GetCurrentUser(new InMemoryUserRepository()).execute({ userId: 'nao-existe' })
    expect(dto).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- get-current-user`
Expected: FAIL — `get-current-user.ts` não existe.

- [ ] **Step 3: Implementar `get-current-user.ts`**

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- get-current-user`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/core/identity/application/queries/get-current-user.ts src/core/identity/application/queries/get-current-user.test.ts
git commit -m "feat(identity): query GetCurrentUser"
```

---

## Fase 4 — Domínio Projects (`src/core/projects/domain`)

### Task 4.1: Erros de domínio do Projects

**Files:**
- Create: `src/core/projects/domain/errors/invalid-project-name.error.ts`
- Create: `src/core/projects/domain/errors/invalid-project-key.error.ts`
- Create: `src/core/projects/domain/errors/duplicate-project-key.error.ts`
- Create: `src/core/projects/domain/errors/project-not-found.error.ts`

- [ ] **Step 1: Criar `invalid-project-name.error.ts`**

```ts
import { DomainError } from '@/core/shared/domain/domain-error'

export class InvalidProjectNameError extends DomainError {
  readonly code = 'PROJECTS.INVALID_NAME'
  constructor() {
    super('Nome de projeto inválido (1 a 120 caracteres).')
  }
}
```

- [ ] **Step 2: Criar `invalid-project-key.error.ts`**

```ts
import { DomainError } from '@/core/shared/domain/domain-error'

export class InvalidProjectKeyError extends DomainError {
  readonly code = 'PROJECTS.INVALID_KEY'
  constructor() {
    super('Chave inválida. Use 2 a 10 caracteres: letra inicial e A–Z/0–9 (ex.: GES).')
  }
}
```

- [ ] **Step 3: Criar `duplicate-project-key.error.ts`**

```ts
import { DomainError } from '@/core/shared/domain/domain-error'

export class DuplicateProjectKeyError extends DomainError {
  readonly code = 'PROJECTS.DUPLICATE_KEY'
  constructor() {
    super('Já existe um projeto com esta chave nesta organização.')
  }
}
```

- [ ] **Step 4: Criar `project-not-found.error.ts`**

```ts
import { DomainError } from '@/core/shared/domain/domain-error'

export class ProjectNotFoundError extends DomainError {
  readonly code = 'PROJECTS.NOT_FOUND'
  constructor() {
    super('Projeto não encontrado.')
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/core/projects/domain/errors
git commit -m "feat(projects): erros de domínio (nome/chave inválidos, duplicada, não encontrado)"
```

### Task 4.2: `ProjectName` value object

**Files:**
- Create: `src/core/projects/domain/value-objects/project-name.ts`
- Test: `src/core/projects/domain/value-objects/project-name.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`project-name.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { ProjectName } from './project-name'
import { InvalidProjectNameError } from '../errors/invalid-project-name.error'

describe('ProjectName', () => {
  it('aceita e faz trim de um nome válido', () => {
    const r = ProjectName.create('  Gestrô Core  ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.value).toBe('Gestrô Core')
  })

  it('rejeita nome vazio', () => {
    const r = ProjectName.create('   ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidProjectNameError)
  })

  it('rejeita nome com mais de 120 caracteres', () => {
    expect(ProjectName.create('a'.repeat(121)).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- project-name`
Expected: FAIL — arquivo não existe.

- [ ] **Step 3: Implementar `project-name.ts`**

```ts
import { ValueObject } from '@/core/shared/domain/value-object'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { InvalidProjectNameError } from '../errors/invalid-project-name.error'

export class ProjectName extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value })
  }

  get value(): string {
    return this.props.value
  }

  static create(raw: string): Result<ProjectName, InvalidProjectNameError> {
    const trimmed = raw.trim()
    if (trimmed.length < 1 || trimmed.length > 120) {
      return err(new InvalidProjectNameError())
    }
    return ok(new ProjectName(trimmed))
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- project-name`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/core/projects/domain/value-objects/project-name.ts src/core/projects/domain/value-objects/project-name.test.ts
git commit -m "feat(projects): ProjectName value object"
```

### Task 4.3: `ProjectKey` value object

**Files:**
- Create: `src/core/projects/domain/value-objects/project-key.ts`
- Test: `src/core/projects/domain/value-objects/project-key.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`project-key.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { ProjectKey } from './project-key'
import { InvalidProjectKeyError } from '../errors/invalid-project-key.error'

describe('ProjectKey', () => {
  it('normaliza para maiúsculas', () => {
    const r = ProjectKey.create('ges')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.value).toBe('GES')
  })

  it('rejeita chave que começa com número', () => {
    const r = ProjectKey.create('1AB')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidProjectKeyError)
  })

  it('rejeita chave de 1 caractere e com mais de 10', () => {
    expect(ProjectKey.create('A').ok).toBe(false)
    expect(ProjectKey.create('A'.repeat(11)).ok).toBe(false)
  })

  it('rejeita caracteres especiais', () => {
    expect(ProjectKey.create('GE-S').ok).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- project-key`
Expected: FAIL — arquivo não existe.

- [ ] **Step 3: Implementar `project-key.ts`**

```ts
import { ValueObject } from '@/core/shared/domain/value-object'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { InvalidProjectKeyError } from '../errors/invalid-project-key.error'

export class ProjectKey extends ValueObject<{ value: string }> {
  private static readonly PATTERN = /^[A-Z][A-Z0-9]{1,9}$/

  private constructor(value: string) {
    super({ value })
  }

  get value(): string {
    return this.props.value
  }

  static create(raw: string): Result<ProjectKey, InvalidProjectKeyError> {
    const normalized = raw.trim().toUpperCase()
    if (!ProjectKey.PATTERN.test(normalized)) {
      return err(new InvalidProjectKeyError())
    }
    return ok(new ProjectKey(normalized))
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- project-key`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/core/projects/domain/value-objects/project-key.ts src/core/projects/domain/value-objects/project-key.test.ts
git commit -m "feat(projects): ProjectKey value object com normalização"
```

### Task 4.4: `ProjectStatus` value object

**Files:** Create: `src/core/projects/domain/value-objects/project-status.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import { ValueObject } from '@/core/shared/domain/value-object'

export type ProjectStatusValue = 'ACTIVE'

export class ProjectStatus extends ValueObject<{ value: ProjectStatusValue }> {
  static readonly ACTIVE = new ProjectStatus('ACTIVE')

  private constructor(value: ProjectStatusValue) {
    super({ value })
  }

  get value(): ProjectStatusValue {
    return this.props.value
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/projects/domain/value-objects/project-status.ts
git commit -m "feat(projects): ProjectStatus value object (ACTIVE) — costura p/ ARCHIVED"
```

### Task 4.5: Entidade `Project`

**Files:** Create: `src/core/projects/domain/entities/project.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import { Entity } from '@/core/shared/domain/entity'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'
import type { ProjectName } from '../value-objects/project-name'
import type { ProjectKey } from '../value-objects/project-key'
import { ProjectStatus } from '../value-objects/project-status'

interface ProjectProps {
  organizationId: string
  key: ProjectKey
  name: ProjectName
  description: string
  status: ProjectStatus
  createdBy: string
  createdAt: Date
}

export class Project extends Entity<string> {
  private readonly props: ProjectProps

  private constructor(id: string, props: ProjectProps) {
    super(id)
    this.props = props
  }

  get organizationId(): string {
    return this.props.organizationId
  }
  get key(): ProjectKey {
    return this.props.key
  }
  get name(): ProjectName {
    return this.props.name
  }
  get description(): string {
    return this.props.description
  }
  get status(): ProjectStatus {
    return this.props.status
  }
  get createdBy(): string {
    return this.props.createdBy
  }
  get createdAt(): Date {
    return this.props.createdAt
  }

  static create(
    input: {
      organizationId: string
      key: ProjectKey
      name: ProjectName
      description: string
      createdBy: string
    },
    deps: { idGenerator: IdGenerator; clock: Clock },
  ): Project {
    return new Project(deps.idGenerator.generate(), {
      organizationId: input.organizationId,
      key: input.key,
      name: input.name,
      description: input.description,
      status: ProjectStatus.ACTIVE,
      createdBy: input.createdBy,
      createdAt: deps.clock.now(),
    })
  }

  static restore(id: string, props: ProjectProps): Project {
    return new Project(id, props)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/projects/domain/entities/project.ts
git commit -m "feat(projects): entidade Project"
```

### Task 4.6: Porta `ProjectRepository`

**Files:** Create: `src/core/projects/domain/ports/project-repository.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import type { Project } from '../entities/project'
import type { ProjectKey } from '../value-objects/project-key'

export interface ProjectRepository {
  save(project: Project): Promise<void>
  findByKeyInOrg(organizationId: string, key: ProjectKey): Promise<Project | null>
  listByOrg(organizationId: string): Promise<Project[]>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/projects/domain/ports/project-repository.ts
git commit -m "feat(projects): porta ProjectRepository (sempre escopada por org)"
```

---

## Fase 5 — Aplicação Projects (`src/core/projects/application`)

### Task 5.1: `ProjectDTO` + mapper

**Files:** Create: `src/core/projects/application/dtos/project.dto.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import type { Project } from '../../domain/entities/project'

export interface ProjectDTO {
  id: string
  key: string
  name: string
  description: string
  status: string
  createdAt: string
}

export function toProjectDTO(project: Project): ProjectDTO {
  return {
    id: project.id,
    key: project.key.value,
    name: project.name.value,
    description: project.description,
    status: project.status.value,
    createdAt: project.createdAt.toISOString(),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/projects/application/dtos/project.dto.ts
git commit -m "feat(projects): ProjectDTO + mapper"
```

### Task 5.2: `CreateProject` (command)

**Files:**
- Create: `src/core/projects/application/commands/create-project.ts`
- Test: `src/core/projects/application/commands/create-project.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`create-project.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { CreateProject } from './create-project'
import { InMemoryProjectRepository } from '@/infrastructure/persistence/in-memory/in-memory-project.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'
import { DuplicateProjectKeyError } from '../../domain/errors/duplicate-project-key.error'
import { InvalidProjectKeyError } from '../../domain/errors/invalid-project-key.error'

const ORG = 'org-1'
const USER = 'user-1'

function makeSut() {
  const projects = new InMemoryProjectRepository()
  const sut = new CreateProject(projects, new SequentialIdGenerator('proj'), new FixedClock())
  return { sut, projects }
}

describe('CreateProject', () => {
  it('cria um projeto ACTIVE escopado na organização', async () => {
    const { sut } = makeSut()
    const r = await sut.execute({
      organizationId: ORG,
      createdBy: USER,
      name: 'Gestrô Core',
      key: 'ges',
      description: 'Núcleo',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.key).toBe('GES')
      expect(r.value.status).toBe('ACTIVE')
      expect(r.value.id).toBe('proj-1')
    }
  })

  it('rejeita chave duplicada na mesma organização', async () => {
    const { sut } = makeSut()
    await sut.execute({ organizationId: ORG, createdBy: USER, name: 'A', key: 'GES', description: '' })
    const r = await sut.execute({ organizationId: ORG, createdBy: USER, name: 'B', key: 'ges', description: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(DuplicateProjectKeyError)
  })

  it('permite a mesma chave em organizações diferentes', async () => {
    const { sut } = makeSut()
    await sut.execute({ organizationId: 'org-1', createdBy: USER, name: 'A', key: 'GES', description: '' })
    const r = await sut.execute({ organizationId: 'org-2', createdBy: USER, name: 'B', key: 'GES', description: '' })
    expect(r.ok).toBe(true)
  })

  it('rejeita chave inválida', async () => {
    const { sut } = makeSut()
    const r = await sut.execute({ organizationId: ORG, createdBy: USER, name: 'A', key: '1', description: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(InvalidProjectKeyError)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- create-project`
Expected: FAIL — `create-project.ts` / repo in-memory ainda não existem (repo na Fase 6).

- [ ] **Step 3: Implementar `create-project.ts`**

```ts
import type { UseCase } from '@/core/shared/application/use-case'
import type { Clock } from '@/core/shared/application/clock'
import type { IdGenerator } from '@/core/shared/application/id-generator'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { ProjectName } from '../../domain/value-objects/project-name'
import { ProjectKey } from '../../domain/value-objects/project-key'
import { Project } from '../../domain/entities/project'
import type { ProjectRepository } from '../../domain/ports/project-repository'
import { InvalidProjectNameError } from '../../domain/errors/invalid-project-name.error'
import { InvalidProjectKeyError } from '../../domain/errors/invalid-project-key.error'
import { DuplicateProjectKeyError } from '../../domain/errors/duplicate-project-key.error'
import { type ProjectDTO, toProjectDTO } from '../dtos/project.dto'

export interface CreateProjectInput {
  organizationId: string
  createdBy: string
  name: string
  key: string
  description: string
}

type CreateProjectError =
  | InvalidProjectNameError
  | InvalidProjectKeyError
  | DuplicateProjectKeyError

export class CreateProject
  implements UseCase<CreateProjectInput, Result<ProjectDTO, CreateProjectError>>
{
  constructor(
    private readonly projects: ProjectRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateProjectInput): Promise<Result<ProjectDTO, CreateProjectError>> {
    const nameResult = ProjectName.create(input.name)
    if (!nameResult.ok) return err(nameResult.error)

    const keyResult = ProjectKey.create(input.key)
    if (!keyResult.ok) return err(keyResult.error)

    const existing = await this.projects.findByKeyInOrg(input.organizationId, keyResult.value)
    if (existing) return err(new DuplicateProjectKeyError())

    const project = Project.create(
      {
        organizationId: input.organizationId,
        key: keyResult.value,
        name: nameResult.value,
        description: input.description,
        createdBy: input.createdBy,
      },
      { idGenerator: this.idGenerator, clock: this.clock },
    )

    await this.projects.save(project)
    return ok(toProjectDTO(project))
  }
}
```

- [ ] **Step 4: Rodar e ver passar** (após Fase 6)

Run: `npm test -- create-project`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/core/projects/application/commands/create-project.ts src/core/projects/application/commands/create-project.test.ts
git commit -m "feat(projects): caso de uso CreateProject (chave única por org)"
```

### Task 5.3: `ListProjects` (query)

**Files:**
- Create: `src/core/projects/application/queries/list-projects.ts`
- Test: `src/core/projects/application/queries/list-projects.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`list-projects.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { ListProjects } from './list-projects'
import { CreateProject } from '../commands/create-project'
import { InMemoryProjectRepository } from '@/infrastructure/persistence/in-memory/in-memory-project.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'

describe('ListProjects', () => {
  it('retorna apenas os projetos da organização informada', async () => {
    const projects = new InMemoryProjectRepository()
    const create = new CreateProject(projects, new SequentialIdGenerator('p'), new FixedClock())
    await create.execute({ organizationId: 'org-1', createdBy: 'u', name: 'A', key: 'AAA', description: '' })
    await create.execute({ organizationId: 'org-1', createdBy: 'u', name: 'B', key: 'BBB', description: '' })
    await create.execute({ organizationId: 'org-2', createdBy: 'u', name: 'C', key: 'CCC', description: '' })

    const list = await new ListProjects(projects).execute({ organizationId: 'org-1' })
    expect(list.map((p) => p.key).sort()).toEqual(['AAA', 'BBB'])
  })

  it('retorna lista vazia quando não há projetos', async () => {
    const list = await new ListProjects(new InMemoryProjectRepository()).execute({ organizationId: 'org-x' })
    expect(list).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- list-projects`
Expected: FAIL — arquivo não existe.

- [ ] **Step 3: Implementar `list-projects.ts`**

```ts
import type { UseCase } from '@/core/shared/application/use-case'
import type { ProjectRepository } from '../../domain/ports/project-repository'
import { type ProjectDTO, toProjectDTO } from '../dtos/project.dto'

export interface ListProjectsInput {
  organizationId: string
}

export class ListProjects implements UseCase<ListProjectsInput, ProjectDTO[]> {
  constructor(private readonly projects: ProjectRepository) {}

  async execute(input: ListProjectsInput): Promise<ProjectDTO[]> {
    const projects = await this.projects.listByOrg(input.organizationId)
    return projects.map(toProjectDTO)
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- list-projects`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/core/projects/application/queries/list-projects.ts src/core/projects/application/queries/list-projects.test.ts
git commit -m "feat(projects): query ListProjects (escopada por org)"
```

### Task 5.4: `GetProject` (query)

**Files:**
- Create: `src/core/projects/application/queries/get-project.ts`
- Test: `src/core/projects/application/queries/get-project.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`get-project.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { GetProject } from './get-project'
import { CreateProject } from '../commands/create-project'
import { InMemoryProjectRepository } from '@/infrastructure/persistence/in-memory/in-memory-project.repository'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'
import { ProjectNotFoundError } from '../../domain/errors/project-not-found.error'

async function seed() {
  const projects = new InMemoryProjectRepository()
  const create = new CreateProject(projects, new SequentialIdGenerator('p'), new FixedClock())
  await create.execute({ organizationId: 'org-1', createdBy: 'u', name: 'Core', key: 'GES', description: 'x' })
  return projects
}

describe('GetProject', () => {
  it('retorna o projeto pela chave dentro da organização', async () => {
    const r = await new GetProject(await seed()).execute({ organizationId: 'org-1', key: 'ges' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.key).toBe('GES')
  })

  it('retorna NotFound para projeto de outra organização (anti-enumeração)', async () => {
    const r = await new GetProject(await seed()).execute({ organizationId: 'org-2', key: 'GES' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(ProjectNotFoundError)
  })

  it('retorna NotFound (não erro de validação) para chave malformada', async () => {
    const r = await new GetProject(await seed()).execute({ organizationId: 'org-1', key: '!' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(ProjectNotFoundError)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- get-project`
Expected: FAIL — arquivo não existe.

- [ ] **Step 3: Implementar `get-project.ts`**

```ts
import type { UseCase } from '@/core/shared/application/use-case'
import { type Result, ok, err } from '@/core/shared/domain/result'
import { ProjectKey } from '../../domain/value-objects/project-key'
import type { ProjectRepository } from '../../domain/ports/project-repository'
import { ProjectNotFoundError } from '../../domain/errors/project-not-found.error'
import { type ProjectDTO, toProjectDTO } from '../dtos/project.dto'

export interface GetProjectInput {
  organizationId: string
  key: string
}

export class GetProject implements UseCase<GetProjectInput, Result<ProjectDTO, ProjectNotFoundError>> {
  constructor(private readonly projects: ProjectRepository) {}

  async execute(input: GetProjectInput): Promise<Result<ProjectDTO, ProjectNotFoundError>> {
    // Chave malformada não pode existir → 404 (não vaza diferença entre "inválida" e "inexistente").
    const keyResult = ProjectKey.create(input.key)
    if (!keyResult.ok) return err(new ProjectNotFoundError())

    const project = await this.projects.findByKeyInOrg(input.organizationId, keyResult.value)
    if (!project) return err(new ProjectNotFoundError())

    return ok(toProjectDTO(project))
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- get-project`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/core/projects/application/queries/get-project.ts src/core/projects/application/queries/get-project.test.ts
git commit -m "feat(projects): query GetProject (404 cross-tenant e chave malformada)"
```

---

## Fase 6 — Infraestrutura (`src/infrastructure`)

### Task 6.1: Repositórios in-memory do Identity

**Files:**
- Create: `src/infrastructure/persistence/in-memory/in-memory-user.repository.ts`
- Create: `src/infrastructure/persistence/in-memory/in-memory-organization.repository.ts`
- Create: `src/infrastructure/persistence/in-memory/in-memory-membership.repository.ts`

> As entidades são imutáveis (props privadas, sem setters), então devolver a instância armazenada é seguro — não há mutação compartilhada acidental.

- [ ] **Step 1: Criar `in-memory-user.repository.ts`**

```ts
import type { UserRepository } from '@/core/identity/domain/ports/user-repository'
import type { User } from '@/core/identity/domain/entities/user'
import type { Email } from '@/core/identity/domain/value-objects/email'

export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>()

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.byId.values()) {
      if (user.email.value === email.value) return user
    }
    return null
  }

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null
  }

  async save(user: User): Promise<void> {
    this.byId.set(user.id, user)
  }
}
```

- [ ] **Step 2: Criar `in-memory-organization.repository.ts`**

```ts
import type { OrganizationRepository } from '@/core/identity/domain/ports/organization-repository'
import type { Organization } from '@/core/identity/domain/entities/organization'

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private readonly byId = new Map<string, Organization>()

  async save(organization: Organization): Promise<void> {
    this.byId.set(organization.id, organization)
  }
}
```

- [ ] **Step 3: Criar `in-memory-membership.repository.ts`**

```ts
import type { MembershipRepository } from '@/core/identity/domain/ports/membership-repository'
import type { Membership } from '@/core/identity/domain/entities/membership'

export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly all: Membership[] = []

  async save(membership: Membership): Promise<void> {
    this.all.push(membership)
  }

  async findByUser(userId: string): Promise<Membership[]> {
    return this.all.filter((m) => m.userId === userId)
  }
}
```

- [ ] **Step 4: Rodar os testes de caso de uso do Identity (agora ficam verdes)**

Run: `npm test -- register-user authenticate-user get-current-user`
Expected: PASS (todos os testes das Tasks 3.2–3.4).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/persistence/in-memory/in-memory-user.repository.ts src/infrastructure/persistence/in-memory/in-memory-organization.repository.ts src/infrastructure/persistence/in-memory/in-memory-membership.repository.ts
git commit -m "feat(infra): repositórios in-memory do Identity"
```

### Task 6.2: Repositório in-memory de Projects + contract test reutilizável

**Files:**
- Create: `src/core/projects/domain/ports/project-repository.contract.ts` (suíte reutilizável)
- Create: `src/infrastructure/persistence/in-memory/in-memory-project.repository.ts`
- Test: `src/infrastructure/persistence/in-memory/in-memory-project.repository.test.ts`

- [ ] **Step 1: Criar a suíte de contrato `project-repository.contract.ts`**

> Não tem sufixo `.test.ts` de propósito — é importada por testes concretos (in-memory hoje, Postgres amanhã).

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import type { ProjectRepository } from './project-repository'
import { Project } from '../entities/project'
import { ProjectName } from '../value-objects/project-name'
import { ProjectKey } from '../value-objects/project-key'
import { FixedClock, SequentialIdGenerator } from '@/test-support/fakes'

function buildProject(organizationId: string, key: string): Project {
  const name = ProjectName.create(`Projeto ${key}`)
  const projectKey = ProjectKey.create(key)
  if (!name.ok || !projectKey.ok) throw new Error('fixture inválida')
  return Project.create(
    { organizationId, key: projectKey.value, name: name.value, description: '', createdBy: 'u' },
    { idGenerator: new SequentialIdGenerator('p'), clock: new FixedClock() },
  )
}

function key(value: string): ProjectKey {
  const k = ProjectKey.create(value)
  if (!k.ok) throw new Error('chave inválida no contrato')
  return k.value
}

export function runProjectRepositoryContract(makeRepository: () => ProjectRepository): void {
  describe('ProjectRepository (contrato)', () => {
    let repo: ProjectRepository

    beforeEach(() => {
      repo = makeRepository()
    })

    it('salva e recupera por chave dentro da organização', async () => {
      await repo.save(buildProject('org-1', 'GES'))
      const found = await repo.findByKeyInOrg('org-1', key('GES'))
      expect(found?.key.value).toBe('GES')
    })

    it('não encontra projeto de outra organização', async () => {
      await repo.save(buildProject('org-1', 'GES'))
      expect(await repo.findByKeyInOrg('org-2', key('GES'))).toBeNull()
    })

    it('lista apenas projetos da organização', async () => {
      await repo.save(buildProject('org-1', 'AAA'))
      await repo.save(buildProject('org-1', 'BBB'))
      await repo.save(buildProject('org-2', 'CCC'))
      const list = await repo.listByOrg('org-1')
      expect(list.map((p) => p.key.value).sort()).toEqual(['AAA', 'BBB'])
    })
  })
}
```

- [ ] **Step 2: Escrever o teste concreto que falha**

`in-memory-project.repository.test.ts`:
```ts
import { runProjectRepositoryContract } from '@/core/projects/domain/ports/project-repository.contract'
import { InMemoryProjectRepository } from './in-memory-project.repository'

runProjectRepositoryContract(() => new InMemoryProjectRepository())
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- in-memory-project`
Expected: FAIL — `in-memory-project.repository.ts` não existe.

- [ ] **Step 4: Implementar `in-memory-project.repository.ts`**

```ts
import type { ProjectRepository } from '@/core/projects/domain/ports/project-repository'
import type { Project } from '@/core/projects/domain/entities/project'
import type { ProjectKey } from '@/core/projects/domain/value-objects/project-key'

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly byId = new Map<string, Project>()

  async save(project: Project): Promise<void> {
    this.byId.set(project.id, project)
  }

  async findByKeyInOrg(organizationId: string, key: ProjectKey): Promise<Project | null> {
    for (const project of this.byId.values()) {
      if (project.organizationId === organizationId && project.key.value === key.value) {
        return project
      }
    }
    return null
  }

  async listByOrg(organizationId: string): Promise<Project[]> {
    return [...this.byId.values()].filter((p) => p.organizationId === organizationId)
  }
}
```

- [ ] **Step 5: Rodar e ver passar (contrato + casos de uso de Projects)**

Run: `npm test -- in-memory-project create-project list-projects get-project`
Expected: PASS (contrato com 3 testes + casos de uso das Tasks 5.2–5.4).

- [ ] **Step 6: Commit**

```bash
git add src/core/projects/domain/ports/project-repository.contract.ts src/infrastructure/persistence/in-memory/in-memory-project.repository.ts src/infrastructure/persistence/in-memory/in-memory-project.repository.test.ts
git commit -m "feat(infra): repo in-memory de Projects + contract test reutilizável"
```

### Task 6.3: `Argon2PasswordHasher`

**Files:**
- Create: `src/infrastructure/security/argon2-password-hasher.ts`
- Test: `src/infrastructure/security/argon2-password-hasher.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`argon2-password-hasher.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { Argon2PasswordHasher } from './argon2-password-hasher'

describe('Argon2PasswordHasher', () => {
  it('gera hash diferente do texto e verifica corretamente', async () => {
    const hasher = new Argon2PasswordHasher()
    const hash = await hasher.hash('Str0ng!Pass')
    expect(hash).not.toBe('Str0ng!Pass')
    expect(await hasher.verify('Str0ng!Pass', hash)).toBe(true)
  })

  it('retorna false para senha errada (sem lançar)', async () => {
    const hasher = new Argon2PasswordHasher()
    const hash = await hasher.hash('Str0ng!Pass')
    expect(await hasher.verify('errada', hash)).toBe(false)
  })

  it('retorna false para hash malformado (sem lançar)', async () => {
    const hasher = new Argon2PasswordHasher()
    expect(await hasher.verify('x', 'nao-e-um-hash')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- argon2`
Expected: FAIL — arquivo não existe.

- [ ] **Step 3: Implementar `argon2-password-hasher.ts`**

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- argon2`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/security/argon2-password-hasher.ts src/infrastructure/security/argon2-password-hasher.test.ts
git commit -m "feat(infra): Argon2PasswordHasher (argon2id)"
```

### Task 6.4: `SystemClock` e `CryptoIdGenerator`

**Files:**
- Create: `src/infrastructure/system/system-clock.ts`
- Create: `src/infrastructure/system/crypto-id-generator.ts`
- Test: `src/infrastructure/system/crypto-id-generator.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`crypto-id-generator.test.ts`:
```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- crypto-id-generator`
Expected: FAIL — arquivo não existe.

- [ ] **Step 3: Implementar `system-clock.ts`**

```ts
import type { Clock } from '@/core/shared/application/clock'

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}
```

- [ ] **Step 4: Implementar `crypto-id-generator.ts`**

```ts
import type { IdGenerator } from '@/core/shared/application/id-generator'

export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    return crypto.randomUUID()
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- crypto-id-generator`
Expected: PASS (1 teste).

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/system
git commit -m "feat(infra): SystemClock e CryptoIdGenerator"
```

### Task 6.5: Validação de ambiente (`env.ts`)

**Files:** Create: `src/infrastructure/config/env.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import { z } from 'zod'

const schema = z.object({
  SESSION_SECRET: z
    .string()
    .min(32, { error: 'SESSION_SECRET deve ter ao menos 32 caracteres.' }),
})

export const env = schema.parse({
  SESSION_SECRET: process.env.SESSION_SECRET,
})
```

- [ ] **Step 2: Commit**

```bash
git add src/infrastructure/config/env.ts
git commit -m "feat(infra): validação fail-fast de variáveis de ambiente (zod)"
```

### Task 6.6: `JoseSessionService`

**Files:** Create: `src/infrastructure/security/jose-session-service.ts`

> Sem teste unitário: depende de `cookies()` (escopo de request). Coberto pelo E2E (Fase 10).

- [ ] **Step 1: Criar o arquivo**

```ts
import 'server-only'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { SessionData, SessionService } from '@/core/identity/domain/ports/session-service'

const COOKIE_NAME = 'gestro_session'

export class JoseSessionService implements SessionService {
  constructor(
    private readonly secret: Uint8Array,
    private readonly maxAgeSeconds: number = 60 * 60 * 24 * 7,
  ) {}

  async issue(userId: string, organizationId: string): Promise<void> {
    const token = await new SignJWT({ userId, organizationId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${this.maxAgeSeconds}s`)
      .sign(this.secret)

    const store = await cookies()
    store.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.maxAgeSeconds,
    })
  }

  async read(): Promise<SessionData | null> {
    const store = await cookies()
    const token = store.get(COOKIE_NAME)?.value
    if (!token) return null
    try {
      const { payload } = await jwtVerify(token, this.secret, { algorithms: ['HS256'] })
      const userId = payload.userId
      const organizationId = payload.organizationId
      if (typeof userId !== 'string' || typeof organizationId !== 'string') return null
      return { userId, organizationId }
    } catch {
      return null
    }
  }

  async revoke(): Promise<void> {
    const store = await cookies()
    store.delete(COOKIE_NAME)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/infrastructure/security/jose-session-service.ts
git commit -m "feat(infra): JoseSessionService (JWT HS256 + cookie httpOnly)"
```

---

## Fase 7 — Composição e adaptadores de apresentação

### Task 7.1: Composition root (`container.ts`) + factories

**Files:**
- Create: `src/composition/container.ts`
- Create: `src/composition/factories.ts`

- [ ] **Step 1: Criar `container.ts`**

```ts
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
```

- [ ] **Step 2: Criar `factories.ts`**

```ts
import { getContainer } from './container'
import { RegisterUser } from '@/core/identity/application/commands/register-user'
import { AuthenticateUser } from '@/core/identity/application/commands/authenticate-user'
import { GetCurrentUser } from '@/core/identity/application/queries/get-current-user'
import { CreateProject } from '@/core/projects/application/commands/create-project'
import { ListProjects } from '@/core/projects/application/queries/list-projects'
import { GetProject } from '@/core/projects/application/queries/get-project'

export function makeRegisterUser(): RegisterUser {
  const c = getContainer()
  return new RegisterUser(c.users, c.organizations, c.memberships, c.hasher, c.idGenerator, c.clock)
}

export function makeAuthenticateUser(): AuthenticateUser {
  const c = getContainer()
  return new AuthenticateUser(c.users, c.memberships, c.hasher)
}

export function makeGetCurrentUser(): GetCurrentUser {
  return new GetCurrentUser(getContainer().users)
}

export function makeCreateProject(): CreateProject {
  const c = getContainer()
  return new CreateProject(c.projects, c.idGenerator, c.clock)
}

export function makeListProjects(): ListProjects {
  return new ListProjects(getContainer().projects)
}

export function makeGetProject(): GetProject {
  return new GetProject(getContainer().projects)
}
```

- [ ] **Step 3: Verificar que tudo compila e os testes seguem verdes**

Run: `npx tsc --noEmit && npm test`
Expected: sem erros de tipo; todos os testes existentes PASS.

- [ ] **Step 4: Commit**

```bash
git add src/composition
git commit -m "feat(composition): composition root (DI) e factories de casos de uso"
```

### Task 7.2: Helpers HTTP e autenticação de API

**Files:**
- Create: `src/app/lib/http.ts`
- Create: `src/app/lib/api-auth.ts`

- [ ] **Step 1: Criar `http.ts`**

```ts
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function error(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status)
}

export function noContent(): Response {
  return new Response(null, { status: 204 })
}
```

- [ ] **Step 2: Criar `api-auth.ts`**

```ts
import { getContainer } from '@/composition/container'
import type { SessionData } from '@/core/identity/domain/ports/session-service'

export async function readApiSession(): Promise<SessionData | null> {
  return getContainer().sessionService.read()
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/lib/http.ts src/app/lib/api-auth.ts
git commit -m "feat(app): helpers de resposta HTTP e leitura de sessão da API"
```

### Task 7.3: Data Access Layer (`dal.ts`) para páginas

**Files:** Create: `src/app/lib/dal.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getContainer } from '@/composition/container'
import { makeGetCurrentUser } from '@/composition/factories'
import type { SessionData } from '@/core/identity/domain/ports/session-service'
import type { UserDTO } from '@/core/identity/application/dtos/user.dto'

export const getSession = cache(async (): Promise<SessionData | null> => {
  return getContainer().sessionService.read()
})

export const verifySession = cache(async (): Promise<SessionData> => {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
})

export const getCurrentUser = cache(async (): Promise<UserDTO | null> => {
  const session = await verifySession()
  return makeGetCurrentUser().execute({ userId: session.userId })
})
```

- [ ] **Step 2: Commit**

```bash
git add src/app/lib/dal.ts
git commit -m "feat(app): DAL com verifySession/getCurrentUser memoizados (cache)"
```

---

## Fase 8 — API REST (`src/app/api/v1`)

> Controllers finos: sessão → Zod → caso de uso → mapeia `Result`/erro para status. Sessão da API via `readApiSession()` (retorna 401, não redireciona). `params` é assíncrono (Next 16); tipamos explicitamente para não depender de tipos gerados.

### Task 8.1: `POST /api/v1/auth/register`

**Files:**
- Create: `src/app/api/v1/auth/register/route.ts`
- Test: `src/app/api/v1/auth/register/route.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`route.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { POST } from './route'
import { resetContainer } from '@/composition/container'

beforeEach(() => resetContainer())

function req(body: unknown): Request {
  return new Request('http://localhost/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/v1/auth/register', () => {
  it('201 com UserDTO (sem passwordHash)', async () => {
    const res = await POST(req({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.email).toBe('ana@example.com')
    expect(data.passwordHash).toBeUndefined()
  })

  it('409 e-mail duplicado', async () => {
    await POST(req({ name: 'Ana', email: 'ana@example.com', password: 'Str0ng!Pass' }))
    const res = await POST(req({ name: 'Bia', email: 'ana@example.com', password: 'Str0ng!Pass' }))
    expect(res.status).toBe(409)
  })

  it('400 payload inválido', async () => {
    const res = await POST(req({ name: 'A', email: 'x', password: '123' }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- api/v1/auth/register`
Expected: FAIL — `route.ts` não existe.

- [ ] **Step 3: Implementar `route.ts`**

```ts
import { z } from 'zod'
import { makeRegisterUser } from '@/composition/factories'
import { EmailAlreadyInUseError } from '@/core/identity/domain/errors/email-already-in-use.error'
import { json, error } from '@/app/lib/http'

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(200),
})

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('BAD_REQUEST', 'JSON inválido.', 400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('VALIDATION', 'Dados inválidos.', 400)

  const result = await makeRegisterUser().execute(parsed.data)
  if (!result.ok) {
    if (result.error instanceof EmailAlreadyInUseError) {
      return error(result.error.code, result.error.message, 409)
    }
    return error(result.error.code, result.error.message, 400)
  }
  return json(result.value, 201)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- api/v1/auth/register`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/auth/register/route.ts src/app/api/v1/auth/register/route.test.ts
git commit -m "feat(api): POST /api/v1/auth/register"
```

### Task 8.2: `POST` e `DELETE /api/v1/auth/session`

**Files:** Create: `src/app/api/v1/auth/session/route.ts`

> Login/logout dependem de `cookies()` (escopo de request) → cobertos por E2E (Fase 10), não por vitest.

- [ ] **Step 1: Criar `route.ts`**

```ts
import { z } from 'zod'
import { makeAuthenticateUser } from '@/composition/factories'
import { getContainer } from '@/composition/container'
import { error, noContent } from '@/app/lib/http'

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('BAD_REQUEST', 'JSON inválido.', 400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('VALIDATION', 'Dados inválidos.', 400)

  const result = await makeAuthenticateUser().execute(parsed.data)
  if (!result.ok) return error(result.error.code, result.error.message, 401)

  await getContainer().sessionService.issue(result.value.userId, result.value.organizationId)
  return noContent()
}

export async function DELETE(): Promise<Response> {
  await getContainer().sessionService.revoke()
  return noContent()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/auth/session/route.ts
git commit -m "feat(api): POST/DELETE /api/v1/auth/session (login/logout)"
```

### Task 8.3: `GET` e `POST /api/v1/projects`

**Files:**
- Create: `src/app/api/v1/projects/route.ts`
- Test: `src/app/api/v1/projects/route.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`route.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetContainer } from '@/composition/container'

vi.mock('@/app/lib/api-auth', () => ({ readApiSession: vi.fn() }))
import { readApiSession } from '@/app/lib/api-auth'
import { GET, POST } from './route'

const session = { userId: 'u1', organizationId: 'org-1' }

beforeEach(() => {
  resetContainer()
  vi.mocked(readApiSession).mockReset()
})

function postReq(body: unknown): Request {
  return new Request('http://localhost/api/v1/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/v1/projects', () => {
  it('GET 401 sem sessão', async () => {
    vi.mocked(readApiSession).mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it('POST 201 e GET 200 listando o criado', async () => {
    vi.mocked(readApiSession).mockResolvedValue(session)
    const created = await POST(postReq({ name: 'Core', key: 'GES', description: 'x' }))
    expect(created.status).toBe(201)

    const list = await GET()
    expect(list.status).toBe(200)
    const data = await list.json()
    expect(data).toHaveLength(1)
    expect(data[0].key).toBe('GES')
  })

  it('POST 409 chave duplicada', async () => {
    vi.mocked(readApiSession).mockResolvedValue(session)
    await POST(postReq({ name: 'A', key: 'GES', description: '' }))
    const dup = await POST(postReq({ name: 'B', key: 'GES', description: '' }))
    expect(dup.status).toBe(409)
  })

  it('POST 400 payload inválido', async () => {
    vi.mocked(readApiSession).mockResolvedValue(session)
    const res = await POST(postReq({ name: '', key: '', description: '' }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- api/v1/projects/route`
Expected: FAIL — `route.ts` não existe.

- [ ] **Step 3: Implementar `route.ts`**

```ts
import { z } from 'zod'
import { readApiSession } from '@/app/lib/api-auth'
import { makeListProjects, makeCreateProject } from '@/composition/factories'
import { DuplicateProjectKeyError } from '@/core/projects/domain/errors/duplicate-project-key.error'
import { json, error } from '@/app/lib/http'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  key: z.string().min(2).max(10),
  description: z.string().max(500).optional().default(''),
})

export async function GET(): Promise<Response> {
  const session = await readApiSession()
  if (!session) return error('UNAUTHORIZED', 'Não autenticado.', 401)
  const projects = await makeListProjects().execute({ organizationId: session.organizationId })
  return json(projects, 200)
}

export async function POST(request: Request): Promise<Response> {
  const session = await readApiSession()
  if (!session) return error('UNAUTHORIZED', 'Não autenticado.', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('BAD_REQUEST', 'JSON inválido.', 400)
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return error('VALIDATION', 'Dados inválidos.', 400)

  const result = await makeCreateProject().execute({
    organizationId: session.organizationId,
    createdBy: session.userId,
    name: parsed.data.name,
    key: parsed.data.key,
    description: parsed.data.description,
  })
  if (!result.ok) {
    if (result.error instanceof DuplicateProjectKeyError) {
      return error(result.error.code, result.error.message, 409)
    }
    return error(result.error.code, result.error.message, 400)
  }
  return json(result.value, 201)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- api/v1/projects/route`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/projects/route.ts src/app/api/v1/projects/route.test.ts
git commit -m "feat(api): GET/POST /api/v1/projects"
```

### Task 8.4: `GET /api/v1/projects/[key]`

**Files:**
- Create: `src/app/api/v1/projects/[key]/route.ts`
- Test: `src/app/api/v1/projects/[key]/route.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`route.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetContainer } from '@/composition/container'

vi.mock('@/app/lib/api-auth', () => ({ readApiSession: vi.fn() }))
import { readApiSession } from '@/app/lib/api-auth'
import { GET } from './route'
import { POST as createProject } from '../route'

const session = { userId: 'u1', organizationId: 'org-1' }

beforeEach(() => {
  resetContainer()
  vi.mocked(readApiSession).mockReset()
  vi.mocked(readApiSession).mockResolvedValue(session)
})

function seedReq(): Request {
  return new Request('http://localhost/api/v1/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Core', key: 'GES', description: '' }),
  })
}

describe('GET /api/v1/projects/[key]', () => {
  it('200 quando existe na organização', async () => {
    await createProject(seedReq())
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ key: 'GES' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.key).toBe('GES')
  })

  it('404 quando não existe (ou outra org)', async () => {
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ key: 'NOPE' }) })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- "api/v1/projects/\[key\]"`
Expected: FAIL — `route.ts` não existe.

- [ ] **Step 3: Implementar `route.ts`**

```ts
import { readApiSession } from '@/app/lib/api-auth'
import { makeGetProject } from '@/composition/factories'
import { json, error } from '@/app/lib/http'

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
): Promise<Response> {
  const session = await readApiSession()
  if (!session) return error('UNAUTHORIZED', 'Não autenticado.', 401)

  const { key } = await context.params
  const result = await makeGetProject().execute({ organizationId: session.organizationId, key })
  if (!result.ok) return error(result.error.code, result.error.message, 404)

  return json(result.value, 200)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- "api/v1/projects/\[key\]"`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/v1/projects/[key]/route.ts" "src/app/api/v1/projects/[key]/route.test.ts"
git commit -m "feat(api): GET /api/v1/projects/[key] (404 não-encontrado/cross-tenant)"
```

---

## Fase 9 — Apresentação UI (Server Actions, páginas, proxy)

> A UI é coberta por E2E (Fase 10), conforme a estratégia de testes (Vitest não testa async Server Components). Estas tasks criam arquivos + commit; a validação visual/funcional vem no E2E e no smoke manual da Task 9.10.

### Task 9.1: Atualizar layout raiz (idioma + metadata)

**Files:** Modify: `src/app/layout.tsx`

- [ ] **Step 1: Substituir `lang` e `metadata`**

Em `src/app/layout.tsx`, troque `lang="en"` por `lang="pt-BR"` e o bloco `metadata` por:
```tsx
export const metadata: Metadata = {
  title: 'Gestrô',
  description: 'Smart management, projects that take off!',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "chore(app): layout em pt-BR e metadata da Gestrô"
```

### Task 9.2: Server Actions de autenticação

**Files:** Create: `src/app/lib/actions/auth.actions.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { makeRegisterUser, makeAuthenticateUser } from '@/composition/factories'
import { getContainer } from '@/composition/container'
import { EmailAlreadyInUseError } from '@/core/identity/domain/errors/email-already-in-use.error'

export interface AuthFormState {
  error?: string
}

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(200),
})

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: 'Verifique os campos: nome (2+), e-mail válido e senha (8+ caracteres).' }
  }

  const result = await makeRegisterUser().execute(parsed.data)
  if (!result.ok) {
    if (result.error instanceof EmailAlreadyInUseError) {
      return { error: 'Este e-mail já está em uso.' }
    }
    return { error: 'Não foi possível concluir o cadastro.' }
  }

  redirect('/login?registered=1')
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: 'Informe e-mail e senha.' }
  }

  const result = await makeAuthenticateUser().execute(parsed.data)
  if (!result.ok) {
    return { error: 'Credenciais inválidas.' }
  }

  await getContainer().sessionService.issue(result.value.userId, result.value.organizationId)
  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  await getContainer().sessionService.revoke()
  redirect('/login')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/lib/actions/auth.actions.ts
git commit -m "feat(app): Server Actions de signup/login/logout"
```

### Task 9.3: Formulário de auth (client component)

**Files:** Create: `src/app/(auth)/_components/auth-form.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
'use client'

import { useActionState } from 'react'
import type { AuthFormState } from '@/app/lib/actions/auth.actions'

interface AuthFormProps {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>
  mode: 'signup' | 'login'
  submitLabel: string
}

export function AuthForm({ action, mode, submitLabel }: AuthFormProps) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {})

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {mode === 'signup' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="name">Nome</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={mode === 'signup' ? 8 : 1}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </div>

      {state.error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {pending ? 'Enviando…' : submitLabel}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(auth)/_components/auth-form.tsx"
git commit -m "feat(app): AuthForm client com useActionState e estados acessíveis"
```

### Task 9.4: Páginas de signup e login

**Files:**
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Criar `signup/page.tsx`**

```tsx
import Link from 'next/link'
import { AuthForm } from '../_components/auth-form'
import { signupAction } from '@/app/lib/actions/auth.actions'

export default function SignupPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Criar conta na Gestrô</h1>
      <AuthForm action={signupAction} mode="signup" submitLabel="Cadastrar" />
      <p className="text-sm">
        Já tem conta?{' '}
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </p>
    </main>
  )
}
```

- [ ] **Step 2: Criar `login/page.tsx`**

```tsx
import Link from 'next/link'
import { AuthForm } from '../_components/auth-form'
import { loginAction } from '@/app/lib/actions/auth.actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>
}) {
  const { registered } = await searchParams

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Entrar na Gestrô</h1>
      {registered && (
        <p role="status" className="text-sm text-green-700">
          Conta criada! Faça login para continuar.
        </p>
      )}
      <AuthForm action={loginAction} mode="login" submitLabel="Entrar" />
      <p className="text-sm">
        Não tem conta?{' '}
        <Link href="/signup" className="underline">
          Cadastre-se
        </Link>
      </p>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/signup/page.tsx" "src/app/(auth)/login/page.tsx"
git commit -m "feat(app): páginas de signup e login"
```

### Task 9.5: Página raiz e dashboard

**Files:**
- Modify: `src/app/page.tsx` (substituir conteúdo)
- Create: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Substituir `src/app/page.tsx`**

Substitua TODO o conteúdo de `src/app/page.tsx` por:
```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 2: Criar `dashboard/page.tsx`**

```tsx
import Link from 'next/link'
import { getCurrentUser } from '@/app/lib/dal'
import { logoutAction } from '@/app/lib/actions/auth.actions'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Olá, {user?.name ?? 'usuário'}</h1>
        <form action={logoutAction}>
          <button type="submit" className="text-sm underline">
            Sair
          </button>
        </form>
      </header>
      <nav>
        <Link href="/projects" className="underline">
          Ver projetos
        </Link>
      </nav>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx "src/app/(app)/dashboard/page.tsx"
git commit -m "feat(app): raiz redireciona p/ dashboard; dashboard com saudação e logout"
```

### Task 9.6: Lista de projetos + estados (loading/error)

**Files:**
- Create: `src/app/(app)/projects/page.tsx`
- Create: `src/app/(app)/projects/loading.tsx`
- Create: `src/app/(app)/projects/error.tsx`

- [ ] **Step 1: Criar `projects/page.tsx`**

```tsx
import Link from 'next/link'
import { verifySession } from '@/app/lib/dal'
import { makeListProjects } from '@/composition/factories'

export default async function ProjectsPage() {
  const session = await verifySession()
  const projects = await makeListProjects().execute({ organizationId: session.organizationId })

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projetos</h1>
        <Link href="/projects/new" className="rounded bg-black px-3 py-2 text-sm text-white">
          Novo projeto
        </Link>
      </header>

      {projects.length === 0 ? (
        <p className="text-gray-600">Nenhum projeto ainda — crie o primeiro.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id} className="rounded border border-gray-200 p-3">
              <Link href={`/projects/${project.key}`} className="font-medium underline">
                {project.key} — {project.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Criar `projects/loading.tsx`**

```tsx
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12" aria-busy="true">
      <p className="text-gray-600">Carregando projetos…</p>
    </main>
  )
}
```

- [ ] **Step 3: Criar `projects/error.tsx`**

```tsx
'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p role="alert" className="text-red-600">
        Não foi possível carregar os projetos.
      </p>
      <button type="button" onClick={reset} className="mt-3 underline">
        Tentar novamente
      </button>
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/projects/page.tsx" "src/app/(app)/projects/loading.tsx" "src/app/(app)/projects/error.tsx"
git commit -m "feat(app): lista de projetos com estados vazio/carregando/erro"
```

### Task 9.7: Server Action e página de criação de projeto

**Files:**
- Create: `src/app/lib/actions/project.actions.ts`
- Create: `src/app/(app)/projects/new/_components/new-project-form.tsx`
- Create: `src/app/(app)/projects/new/page.tsx`

- [ ] **Step 1: Criar `project.actions.ts`**

```ts
'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { verifySession } from '@/app/lib/dal'
import { makeCreateProject } from '@/composition/factories'
import { DuplicateProjectKeyError } from '@/core/projects/domain/errors/duplicate-project-key.error'

export interface ProjectFormState {
  error?: string
}

const schema = z.object({
  name: z.string().min(1).max(120),
  key: z.string().min(2).max(10),
  description: z.string().max(500),
})

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const session = await verifySession()

  const parsed = schema.safeParse({
    name: formData.get('name'),
    key: formData.get('key'),
    description: formData.get('description') ?? '',
  })
  if (!parsed.success) {
    return { error: 'Verifique nome (1+), chave (2–10) e descrição (até 500).' }
  }

  const result = await makeCreateProject().execute({
    organizationId: session.organizationId,
    createdBy: session.userId,
    name: parsed.data.name,
    key: parsed.data.key,
    description: parsed.data.description,
  })
  if (!result.ok) {
    if (result.error instanceof DuplicateProjectKeyError) {
      return { error: 'Já existe um projeto com esta chave.' }
    }
    return { error: 'Não foi possível criar o projeto. Verifique a chave (ex.: GES).' }
  }

  redirect(`/projects/${result.value.key}`)
}
```

- [ ] **Step 2: Criar `new-project-form.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import { createProjectAction, type ProjectFormState } from '@/app/lib/actions/project.actions'

export function NewProjectForm() {
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(
    createProjectAction,
    {},
  )

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="name">Nome</label>
        <input id="name" name="name" required maxLength={120} className="rounded border border-gray-300 px-3 py-2" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="key">Chave</label>
        <input
          id="key"
          name="key"
          required
          minLength={2}
          maxLength={10}
          placeholder="GES"
          aria-describedby="key-hint"
          className="rounded border border-gray-300 px-3 py-2 uppercase"
        />
        <span id="key-hint" className="text-xs text-gray-500">
          2 a 10 caracteres, começando por letra (ex.: GES).
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description">Descrição</label>
        <textarea id="description" name="description" maxLength={500} rows={3} className="rounded border border-gray-300 px-3 py-2" />
      </div>

      {state.error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-60">
        {pending ? 'Criando…' : 'Criar projeto'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Criar `new/page.tsx`**

```tsx
import Link from 'next/link'
import { verifySession } from '@/app/lib/dal'
import { NewProjectForm } from './_components/new-project-form'

export default async function NewProjectPage() {
  await verifySession()

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">Novo projeto</h1>
      <NewProjectForm />
      <Link href="/projects" className="text-sm underline">
        Voltar para a lista
      </Link>
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/actions/project.actions.ts "src/app/(app)/projects/new/_components/new-project-form.tsx" "src/app/(app)/projects/new/page.tsx"
git commit -m "feat(app): criação de projeto (Server Action + formulário acessível)"
```

### Task 9.8: Detalhe do projeto + not-found

**Files:**
- Create: `src/app/(app)/projects/[key]/page.tsx`
- Create: `src/app/(app)/projects/[key]/not-found.tsx`

- [ ] **Step 1: Criar `[key]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { verifySession } from '@/app/lib/dal'
import { makeGetProject } from '@/composition/factories'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const session = await verifySession()
  const { key } = await params

  const result = await makeGetProject().execute({ organizationId: session.organizationId, key })
  if (!result.ok) notFound()

  const project = result.value

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="font-medium">Chave</dt>
        <dd>{project.key}</dd>
        <dt className="font-medium">Status</dt>
        <dd>{project.status}</dd>
        <dt className="font-medium">Descrição</dt>
        <dd>{project.description || '—'}</dd>
      </dl>
      <Link href="/projects" className="text-sm underline">
        Voltar para a lista
      </Link>
    </main>
  )
}
```

- [ ] **Step 2: Criar `[key]/not-found.tsx`**

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Projeto não encontrado</h1>
      <Link href="/projects" className="mt-3 inline-block underline">
        Voltar para a lista
      </Link>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/projects/[key]/page.tsx" "src/app/(app)/projects/[key]/not-found.tsx"
git commit -m "feat(app): detalhe do projeto e página not-found"
```

### Task 9.9: Proxy (checagem otimista)

**Files:** Create: `src/proxy.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup']
const SESSION_COOKIE = 'gestro_session'

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value)

  const isPublic = PUBLIC_ROUTES.includes(pathname)
  const isProtected = pathname === '/dashboard' || pathname.startsWith('/projects')

  // Checagem OTIMISTA (só presença do cookie). A validação real é na DAL.
  if (isProtected && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isPublic && hasSessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
}
```

- [ ] **Step 2: Verificar tipos e testes**

Run: `npx tsc --noEmit && npm test`
Expected: sem erros de tipo; todos os testes Vitest PASS.

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(app): proxy de checagem otimista de sessão"
```

### Task 9.10: Smoke manual + build

**Files:** (nenhum)

- [ ] **Step 1: Criar `.env.local` com um segredo de desenvolvimento**

Run:
```bash
printf 'SESSION_SECRET=%s\n' "$(openssl rand -base64 32)" > .env.local
```
(`.env.local` é ignorado pelo git por padrão no scaffold do Next.)

- [ ] **Step 2: Build de produção (valida App Router, tipos e RSC)**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 3: (Opcional) Smoke manual**

Run: `npm run dev` e no navegador: `/signup` → cadastrar → redireciona para `/login?registered=1` → entrar → `/dashboard` → `/projects` (vazio) → `/projects/new` → criar `GES` → vê o detalhe → `/projects` lista `GES`. Logout volta para `/login`.

---

## Fase 10 — E2E com Cypress

### Task 10.1: Configurar Cypress e escopo de TypeScript

**Files:**
- Create: `cypress.config.ts`
- Create: `cypress/tsconfig.json`
- Modify: `tsconfig.json` (excluir `cypress`)

- [ ] **Step 1: Criar `cypress.config.ts`**

```ts
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: false,
  },
})
```

- [ ] **Step 2: Criar `cypress/tsconfig.json`**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["cypress", "node"]
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 3: Excluir `cypress` do tsconfig raiz**

Em `tsconfig.json`, altere o array `"exclude"` para:
```json
  "exclude": ["node_modules", "cypress", "cypress.config.ts"]
```

- [ ] **Step 4: Commit**

```bash
git add cypress.config.ts cypress/tsconfig.json tsconfig.json
git commit -m "build(e2e): configura Cypress e escopo de TS"
```

### Task 10.2: Jornada E2E completa

**Files:** Create: `cypress/e2e/walking-skeleton.cy.ts`

- [ ] **Step 1: Criar o teste de jornada**

```ts
describe('Walking skeleton: Identidade + Projetos', () => {
  const email = 'ana@example.com'
  const password = 'Str0ng!Pass'

  it('cadastra, entra, cria e vê um projeto', () => {
    // Cadastro
    cy.visit('/signup')
    cy.get('#name').type('Ana')
    cy.get('#email').type(email)
    cy.get('#password').type(password)
    cy.contains('button', 'Cadastrar').click()

    // Redireciona para login com aviso
    cy.url().should('include', '/login')
    cy.contains('Conta criada!')

    // Login
    cy.get('#email').type(email)
    cy.get('#password').type(password)
    cy.contains('button', 'Entrar').click()

    // Dashboard
    cy.url().should('include', '/dashboard')
    cy.contains('Olá, Ana')

    // Lista vazia
    cy.contains('Ver projetos').click()
    cy.url().should('include', '/projects')
    cy.contains('Nenhum projeto ainda')

    // Cria projeto
    cy.contains('Novo projeto').click()
    cy.get('#name').type('Gestrô Core')
    cy.get('#key').type('GES')
    cy.get('#description').type('Núcleo da plataforma')
    cy.contains('button', 'Criar projeto').click()

    // Detalhe
    cy.url().should('include', '/projects/GES')
    cy.contains('Gestrô Core')
    cy.contains('GES')

    // Aparece na lista
    cy.visit('/projects')
    cy.contains('GES — Gestrô Core')

    // Logout volta para login
    cy.visit('/dashboard')
    cy.contains('button', 'Sair').click()
    cy.url().should('include', '/login')
  })

  it('bloqueia rota protegida sem sessão (proxy)', () => {
    cy.clearCookies()
    cy.visit('/projects')
    cy.url().should('include', '/login')
  })
})
```

- [ ] **Step 2: Rodar o E2E (sobe o dev server automaticamente)**

Run: `npm run e2e`
Expected: ambos os specs PASS. (Requer `.env.local` com `SESSION_SECRET` — Task 9.10 Step 1.)

- [ ] **Step 3: Commit**

```bash
git add cypress/e2e/walking-skeleton.cy.ts
git commit -m "test(e2e): jornada signup→login→criar→ver projeto + proxy"
```

---

## Verificação final (DoD)

- [ ] `npm test` — todos os testes Vitest verdes (domínio, casos de uso, contract, route handlers).
- [ ] `npm run e2e` — jornada Cypress verde.
- [ ] `npm run build` — build de produção sem erros.
- [ ] `npx tsc --noEmit` — sem erros de tipo.
- [ ] `npm run lint` — sem erros de lint.
- [ ] Conferir que nenhum arquivo em `src/core/**` importa `next`, `react`, `jose` ou `@node-rs/argon2`:
  Run: `! grep -rEn "from '(next|react|jose|@node-rs/argon2)'" src/core`
  Expected: nenhuma ocorrência (comando retorna sucesso).

---

## Autorrevisão do plano (executada)

**1. Cobertura do spec:**
- Identidade (registro/login/logout, org pessoal, membership OWNER): Tasks 2.x, 3.x, 8.1–8.2, 9.2–9.5 ✓
- Projetos (criar/listar/ver, chave única por org, 404 cross-tenant): Tasks 4.x, 5.x, 8.3–8.4, 9.6–9.8 ✓
- Clean Arch / núcleo isolado / CQRS / DI: Fases 1–7 + verificação final do `grep` ✓
- Segurança (argon2id, sessão JWT httpOnly, secure gated, isolamento de tenant, anti-enumeração, validação dupla): Tasks 6.3, 6.6, 9.x, casos de uso ✓
- Testes (domínio, casos de uso, contract, route handlers, E2E): Fases 1–10 ✓
- Dependências justificadas: Task 0.1 ✓

**2. Placeholders:** nenhum "TBD/TODO"; todo passo de código traz o código completo.

**3. Consistência de tipos:** `Result/ok/err`, `Email.value`, `ProjectKey.value`, factories `make*`, `readApiSession`, `getContainer/resetContainer`, `SessionData {userId, organizationId}`, params assíncronos `{ params: Promise<{ key }> }`, e portas conferidas entre tarefas.

**Nota de ordenação (importante para execução):** os testes das Fases 3 e 5 (casos de uso) importam os repositórios in-memory criados na **Fase 6**. Ao executar, ou implemente a Fase 6 logo após a 2/4, ou aceite o "ver falhar" por import inexistente e rode o "ver passar" desses casos de uso após a Fase 6 (as Tasks 6.1 Step 4 e 6.2 Step 5 já reexecutam esses testes para fechá-los).

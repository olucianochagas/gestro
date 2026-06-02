# Spec — Walking Skeleton: Identidade + Projetos (Gestrô)

- **Data:** 2026-06-01
- **Status:** Aprovado para planejamento (design)
- **Contexto-pai:** Plataforma Gestrô — *"Smart management, projects that take off!"*
- **Incremento:** Primeira fatia vertical (esqueleto ambulante) que estabelece a arquitetura reutilizável por todos os contextos delimitados.

---

## 1. Entendimento do problema

A Gestrô é uma **plataforma** de gestão, governança, auditoria e acompanhamento em tempo real do ciclo de vida de desenvolvimento de software, **agnóstica a metodologias** (ágil, tradicional, híbrida). Por ser uma plataforma (múltiplos subsistemas independentes), não cabe num único spec.

Este spec cobre **apenas** a primeira fatia vertical: **Identidade mínima + Projetos (Criar / Listar / Ver detalhe)**, atravessando todas as camadas arquiteturais (domínio → aplicação → infraestrutura → API → apresentação). O objetivo é **provar e fixar a arquitetura limpa** com baixo risco, antes de investir nos contextos mais complexos.

### Decomposição da plataforma (contextos delimitados — DDD)

Cada contexto terá seu próprio ciclo `spec → plano → implementação`:

| # | Contexto | Papel | Status |
|---|----------|-------|--------|
| **A** | Identidade & Acesso | Fundação (auth, org, equipes, papéis) | **Esta fatia (parcial)** |
| **B** | Projetos & Portfólio | Container de trabalho | **Esta fatia (parcial)** |
| C | Motor de Workflow agnóstico | Diferencial central (estados/transições configuráveis) | Futuro |
| D | Itens de Trabalho | Operação diária (backlog, tarefas) | Futuro |
| E | Acompanhamento & Tempo Real | Eventos, atividade, telemetria do processo | Futuro |
| F | Governança & Auditoria | Políticas, trilha de auditoria, compliance | Futuro |
| G | Analytics & Insights | Métricas, dashboards lúdicos/analíticos | Futuro |

---

## 2. Premissas adotadas

1. Persistência inicial **in-memory**; domínio isolado dela via portas. Postgres é incremento seguinte.
2. Aplicação web-first, **multi-tenant** (organizações). `organizationId` sempre derivado da sessão no servidor.
3. **Autenticação mínima real e própria** (e-mail + senha), com segurança por design. Sem libs de auth.
4. Sessão **stateless** via JWT (jose) nesta fatia; sessão server-side revogável entra com o Postgres.
5. Stack confirmada no projeto: **Next.js 16.2.6**, **React 19.2.4**, **React Compiler**, **Tailwind 4**, **TypeScript estrito**.

---

## 3. Riscos e pontos de atenção

| Risco | Mitigação |
|-------|-----------|
| Escopo de plataforma tratado como spec único | Decomposição em contextos; este spec é só a fatia A+B parcial |
| "Agnóstico a metodologias" exige motor de workflow complexo | Adiado para o contexto C; não antecipado aqui |
| Stack nova (Next 16) com breaking changes vs. conhecimento de treino | Docs lidos em `node_modules/next/dist/docs/` antes de codar (ver §9) |
| Repositório in-memory "trapacear" (referências mutáveis compartilhadas) | **Contract tests** + reconstituição/clone de entidades na leitura |
| Vazamento de tenant (Broken Object Level Authorization) | `organizationId` sempre da sessão; cross-tenant → 404 |
| Enumeração de usuários no login | Mensagem de erro genérica `InvalidCredentials` |

---

## 4. Decisões técnicas

- **Arquitetura:** Clean Architecture com **núcleo isolado por contexto** (`src/core/<contexto>` em TS puro, sem `next`/`react`/`jose`/`argon2`).
- **Princípios:** DDD, CQRS (comandos vs. consultas separados), SOLID, inversão e injeção de dependência (composition root).
- **Tratamento de erro:** `Result<T,E>` para falhas de **domínio esperadas**; `throw` apenas para o **excepcional** (infra).
- **Determinismo:** portas `Clock` e `IdGenerator` injetadas (testes determinísticos).
- **Validação dupla proposital:** Zod na borda (forma/formato) + Value Objects no núcleo (invariante de domínio).
- **API-first sem duplicar lógica:** caso de uso é a única fonte de verdade; Route Handlers REST e Server Actions são adaptadores finos que o chamam via composition root.
- **Next.js 16 confirmado nos docs:** `middleware` → `proxy.ts` (só checagens otimistas); DAL com `verifySession()` memoizado por `cache()` + `server-only`; defesa em profundidade obrigatória em cada handler/action.

### Abordagens consideradas

- 🅰 **Núcleo isolado por contexto** — *escolhida*. Máxima fidelidade a DDD/CQRS/DI; domínio testável sem framework.
- 🅱 Módulos colocalizados — meio-termo; risco de infra vazar para o domínio.
- 🅲 Idiomático Next (DAL-centric) — rápido, mas viola separação de camadas e CQRS exigidos. Rejeitada.

---

## 5. Estrutura de arquivos

```
src/
├── core/                              # TS PURO — núcleo de negócio
│   ├── shared/domain/                 # Entity, ValueObject, Result<T,E>, DomainError, UniqueId
│   ├── shared/application/            # UseCase<Input,Output>, portas Clock, IdGenerator
│   ├── identity/
│   │   ├── domain/
│   │   │   ├── entities/              # User, Organization, Membership
│   │   │   ├── value-objects/         # Email, OrganizationSlug, Role
│   │   │   ├── errors/                # InvalidEmail, EmailAlreadyInUse, InvalidCredentials...
│   │   │   └── ports/                 # UserRepository, OrganizationRepository, MembershipRepository,
│   │   │       │                      #   PasswordHasher (casos de uso), SessionService (transporte)
│   │   └── application/
│   │       ├── commands/              # RegisterUser, AuthenticateUser
│   │       ├── queries/               # GetCurrentUser
│   │       └── dtos/                  # UserDTO (sem passwordHash)
│   └── projects/
│       ├── domain/
│       │   ├── entities/              # Project
│       │   ├── value-objects/         # ProjectKey, ProjectName, ProjectStatus
│       │   ├── errors/                # DuplicateProjectKey, ProjectNotFound, InvalidProject*
│       │   └── ports/                 # ProjectRepository
│       └── application/
│           ├── commands/              # CreateProject
│           ├── queries/               # ListProjects, GetProject
│           └── dtos/                  # ProjectDTO
├── infrastructure/
│   ├── persistence/in-memory/         # *Repository in-memory + store (Map) + reconstituição
│   ├── security/                      # Argon2PasswordHasher, JoseSessionService
│   ├── system/                        # SystemClock, CryptoIdGenerator
│   └── config/env.ts                  # validação de env com zod
├── composition/                       # container.ts — composition root (DI) + factories
└── app/                               # Next.js (apresentação)
    ├── (auth)/login|signup/page.tsx
    ├── (app)/dashboard/page.tsx
    ├── (app)/projects/page.tsx        # lista (+ loading.tsx, error.tsx)
    ├── (app)/projects/new/page.tsx    # criar (form + server action)
    ├── (app)/projects/[key]/page.tsx  # detalhe (+ not-found.tsx)
    ├── api/v1/auth/register/route.ts
    ├── api/v1/auth/session/route.ts   # POST login, DELETE logout
    ├── api/v1/projects/route.ts       # GET list, POST create
    ├── api/v1/projects/[key]/route.ts # GET detail
    ├── lib/dal.ts                     # verifySession()/getCurrentUser()
    ├── lib/actions/                   # 'use server' — auth.actions, project.actions
    └── ui/                            # componentes
proxy.ts                               # checagens otimistas (redirect)
.env.example                           # SESSION_SECRET=
```

---

## 6. Modelo de domínio (contratos)

### 6.1 Shared Kernel

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
abstract class Entity<TId> { readonly id: TId; equals(o): boolean }
abstract class ValueObject<T> { protected props: T; equals(o): boolean }
abstract class DomainError extends Error { abstract readonly code: string }
interface UseCase<TInput, TOutput> { execute(input: TInput): Promise<TOutput> }
interface Clock { now(): Date }
interface IdGenerator { generate(): string } // UUID v4
```

### 6.2 Identity

```ts
// Value Objects (validam na construção)
Email.create(raw): Result<Email, InvalidEmailError>            // trim + lowercase + validação
OrganizationSlug.create(raw): Result<OrganizationSlug, InvalidSlugError>
Role.OWNER                                                     // enum VO (só OWNER nesta fatia)

// Entidades
User         { id, name, email: Email, passwordHash: string, createdAt }
Organization { id, name, slug: OrganizationSlug, ownerId, createdAt }
Membership   { userId, organizationId, role: Role }

// Portas
interface UserRepository         { findByEmail(email): Promise<User|null>; findById(id): Promise<User|null>; save(u): Promise<void> }
interface OrganizationRepository { save(o): Promise<void> }                  // só escrita nesta fatia (YAGNI)
interface MembershipRepository   { save(m): Promise<void>; findByUser(userId): Promise<Membership[]> }
interface PasswordHasher         { hash(plain): Promise<string>; verify(plain, hash): Promise<boolean> }
// SessionService é porta de TRANSPORTE (interface no core, framework-agnóstica), consumida
// pela apresentação (DAL + Server Actions), NÃO pelos casos de uso puros:
interface SessionService         { issue(userId, orgId): Promise<void>; read(): Promise<SessionData|null>; revoke(): Promise<void> }
```

### 6.3 Projects

```ts
ProjectName.create(raw): Result<ProjectName, InvalidProjectNameError>   // 1..120 chars
ProjectKey.create(raw):  Result<ProjectKey,  InvalidProjectKeyError>    // ^[A-Z][A-Z0-9]{1,9}$
ProjectStatus.ACTIVE                                                    // enum VO (só ACTIVE)

Project { id, organizationId, key: ProjectKey, name: ProjectName,
          description: string, status: ProjectStatus, createdBy, createdAt }

interface ProjectRepository {
  save(p): Promise<void>
  findByKeyInOrg(orgId, key): Promise<Project|null>   // unicidade da chave + busca de detalhe (sempre escopado por org)
  listByOrg(orgId): Promise<Project[]>
}
```

### 6.4 DTOs

```ts
UserDTO    = { id: string; name: string; email: string }                  // SEM passwordHash
ProjectDTO = { id; key; name; description; status; createdAt: string }
```

---

## 7. Casos de uso (CQRS)

| Tipo | Caso de uso | Entrada (validada) | Saída | Regras-chave |
|------|-------------|--------------------|-------|--------------|
| Command | `RegisterUser` | name, email, password | UserDTO | E-mail único; hash via porta; cria **User + Organização pessoal + Membership(OWNER)** |
| Command | `AuthenticateUser` | email, password | SessionData | `verify` no hash; falha genérica `InvalidCredentials` |
| Query | `GetCurrentUser` | userId (sessão) | UserDTO \| null | Nunca retorna passwordHash |
| Command | `CreateProject` | name, key, description + (orgId, userId da sessão) | ProjectDTO | Chave única por org (`DuplicateProjectKey`); orgId da sessão |
| Query | `ListProjects` | orgId (sessão) | ProjectDTO[] | Filtra estritamente pela org |
| Query | `GetProject` | orgId (sessão), key | ProjectDTO | Não pertence à org → `ProjectNotFound` (404) |

**Decisão de modelagem:** no `RegisterUser`, cria-se automaticamente uma **organização pessoal + Membership(OWNER)**, garantindo que todo usuário nasce com tenant válido (sem tela extra no esqueleto; costura para convites/múltiplas orgs depois).

**Sessão (separação de responsabilidades):** `AuthenticateUser` é um caso de uso **puro** — verifica credenciais (via `PasswordHasher`), resolve a organização do usuário (via `MembershipRepository.findByUser`) e **retorna `SessionData`**, sem tocar em cookies. Emitir o cookie é responsabilidade de **transporte**: o adaptador de apresentação (Server Action / Route Handler) chama `SessionService.issue(...)`. Assim o caso de uso permanece testável sem contexto HTTP. `GetCurrentUser` recebe o `userId` lido de `SessionService.read()` (na DAL) e carrega o usuário via `UserRepository.findById`.

---

## 8. Apresentação (Next.js 16)

### 8.1 API REST (`/api/v1`)

Cada controller: `verifySession` → Zod parse → caso de uso → mapeia erro p/ status.

| Método + rota | Caso de uso | Sucesso | Falhas |
|---|---|---|---|
| `POST /api/v1/auth/register` | RegisterUser | 201 + UserDTO | 400, 409 |
| `POST /api/v1/auth/session` | AuthenticateUser | 204 + cookie | 400, 401 |
| `DELETE /api/v1/auth/session` | logout | 204 | — |
| `GET /api/v1/projects` | ListProjects | 200 + ProjectDTO[] | 401 |
| `POST /api/v1/projects` | CreateProject | 201 + ProjectDTO | 400, 401, 409 |
| `GET /api/v1/projects/[key]` | GetProject | 200 + ProjectDTO | 401, 404 |

### 8.2 UI (App Router)

- `(auth)/signup`, `(auth)/login`: form + `useActionState`; chamam Server Actions.
- `(app)/projects`: lista (Server Component async → `ListProjects`). Estados: carregando, vazio, erro, populado.
- `(app)/projects/new`: form → `CreateProject`; erro de chave duplicada inline.
- `(app)/projects/[key]`: detalhe → `GetProject`; 404 → `not-found.tsx`.
- `proxy.ts`: checagem otimista (redirect), **não** defesa principal.

### 8.3 Acessibilidade
`<label>` em todo input; erros com `aria-live="polite"`; foco no primeiro erro; navegação por teclado; contraste AA; estados não dependentes só de cor.

---

## 9. Notas de compatibilidade Next.js 16 (lidas dos docs)

- **`middleware` → `proxy`**: arquivo `proxy.ts` na raiz de `src/`; só checagens otimistas (não gerenciar sessão/autorização ali).
- **Route Handlers**: `route.ts` com exports nomeados (`GET`, `POST`, ...); `params` é assíncrono (`await ctx.params`); tipar com `RouteContext<'/...'>`.
- **`cookies()` é assíncrono**: `await cookies()`.
- **DAL**: `verifySession()` memoizado por `cache()` do React + pacote `server-only`.
- **Vitest não suporta async Server Components** → cobertura desses via **Cypress (E2E)**. (O Cypress também não faz *component testing* de async Server Components — docs recomendam E2E.)
- **Cypress ≥ 13.6.3** é requisito para TypeScript 5 com `moduleResolution: "bundler"`.

---

## 10. Segurança (DevSecOps / Zero Trust)

- Senha: argon2id (`@node-rs/argon2`); nunca logada/serializada.
- Sessão: JWT HS256 (jose), payload mínimo (`userId`, `organizationId`, `exp`); cookie `httpOnly`, `secure`, `sameSite=lax`, `path=/`; segredo em `SESSION_SECRET` (env validada).
- Defesa em profundidade: proxy (otimista) + `verifySession` em todo handler/action/query.
- Isolamento de tenant: `organizationId` da sessão; cross-tenant → 404 (evita enumeração).
- Anti-enumeração no login (erro genérico).
- CSRF: mutações do browser via Server Actions (proteção nativa do Next); API REST documentada como token-authenticated para clientes externos (incremento futuro).
- Validação: Zod na borda + Value Objects no núcleo.
- Observabilidade: logs estruturados sem segredos/PII (porta `Logger` como costura; OpenTelemetry futuro).

---

## 11. Estratégia de testes

| Camada | Ferramenta | Cobre |
|--------|-----------|-------|
| Domínio (VOs, entidades) | Vitest | Invariantes, transições, `Result` de erro |
| Casos de uso | Vitest + fakes (Clock/IdGenerator determinísticos) | Sucesso, falha, borda |
| Repositórios (contract test) | Vitest | Suíte única: in-memory hoje, Postgres amanhã |
| Route Handlers | Vitest (integração) | Status/payload, 401/404/409, sessão mockada |
| Fluxos de UI | Cypress (E2E) | signup → criar → listar → detalhe |

---

## 12. Critérios de aceite (Definition of Done)

1. Registro cria User + Org pessoal + Membership(OWNER); login e logout funcionam.
2. Autenticado, cria projeto (nome+chave+descrição), chave única por org.
3. Lista só projetos da própria org; detalhe por chave; cross-tenant → 404.
4. Endpoints REST respondem com os status da §8.1.
5. `src/core` sem import de `next`/`react`/`jose`/`argon2`.
6. Testes verdes: domínio, casos de uso, contract dos repos, integração dos handlers, 1 E2E (Cypress).
7. Sem segredos no código; `.env.example` documenta `SESSION_SECRET`.
8. Acessibilidade básica nos formulários.

---

## 13. Fora de escopo / adiado (governança)

Postgres · RBAC granular · arquivar/editar projeto · sessão server-side revogável · social/reset/MFA · CSRF token na API REST · OpenTelemetry · motor de workflow (contexto C) e contextos D–G.

> Cada item acima fica **adiado atrás de uma costura** (porta/VO já existente), de modo que sua adição futura seja **aditiva, não invasiva**.

---

## 14. Dependências a adicionar (justificadas)

- **Runtime:** `zod` (validação de entrada), `jose` (sessão JWT, Edge-compatível), `@node-rs/argon2` (hash argon2id com binários pré-compilados, evita `node-gyp`), `server-only` (impede vazar código servidor ao cliente).
- **Dev/teste:** `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `vite-tsconfig-paths`, `cypress` (≥ 13.6.3), `start-server-and-test` (sobe o servidor e roda o E2E em CI/local).

---

## 15. Próximos passos

1. Gerar o **plano de implementação** (skill `writing-plans`) em incrementos pequenos, testáveis e versionáveis.
2. Implementar de dentro para fora: shared kernel → domínio → casos de uso (com testes) → infra → composição → apresentação → E2E.
3. Incremento seguinte: adaptador **Postgres** validado pelos *contract tests* já existentes.

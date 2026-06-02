# Adaptador de Persistência PostgreSQL — Design

- **Data:** 2026-06-02
- **Status:** Aprovado (aguardando revisão da spec escrita)
- **Incremento:** substituir os repositórios in-memory por implementações PostgreSQL, validadas por contract tests, sem alterar o núcleo.
- **Branch:** `feat/persistencia-postgres`
- **Spec anterior:** [walking skeleton Identidade + Projetos](2026-06-01-identidade-projetos-walking-skeleton-design.md)

## 1. Contexto e objetivo

O walking skeleton (Identidade + Projetos) roda com repositórios in-memory por trás de ports de domínio puros. Este incremento entrega o passo "in-memory agora, Postgres depois": implementações PostgreSQL dos quatro repositórios, com paridade comportamental garantida pelos mesmos contract tests usados pelo in-memory.

Princípio condutor: **o núcleo (`src/core`) não muda**. Os ports já são a fronteira; todo o trabalho fica em infraestrutura, composição e testes.

## 2. Decisões (tomadas no brainstorming)

| # | Decisão | Escolha |
|---|---|---|
| D1 | Escopo | **Cutover completo** dos 4 repositórios (User, Organization, Membership, Project) + escrever contracts para os 3 de Identity (hoje só Project tem) |
| D2 | Runtime de produção | **Servidor Node de longa duração**; `Pool` singleton no processo |
| D3 | Testes contra DB real | **Testcontainers (Docker)**, em suíte separada; `npm test` (unit) segue sem DB |
| D4 | Isolamento multi-tenant | **App-level** (`organization_id` em todo `WHERE`); RLS é endurecimento futuro |
| D5 | Atomicidade do `RegisterUser` | **Unit of Work atômico** via port `TransactionRunner` |
| D6 | Acesso a dados + migrações | **Raw SQL com `pg`** + migrações `.sql` versionadas |
| D6a | Mecanismo de transação | **`AsyncLocalStorage` (transação ambiente)** contido na infra (em vez de `uow.run(repos => …)` explícito) |
| D6b | `organizations.slug` | **Sem `UNIQUE`** — preserva o comportamento atual (slug não deduplicado) |
| D6c | `memberships.save` | **Idempotente** por `(user_id, organization_id)`; o in-memory é corrigido para bater com o contrato |

## 3. Arquitetura e fronteiras

Nenhuma alteração em `src/core`. Estrutura nova:

```
src/infrastructure/persistence/postgres/
  pg-pool.ts                 # cria/retém o Pool (singleton via globalThis), lê DATABASE_URL
  pg-executor.ts             # resolve o "executor corrente": tx client (ALS) ou Pool
  pg-transaction-runner.ts   # TransactionRunner: BEGIN/COMMIT/ROLLBACK + AsyncLocalStorage
  pg-user.repository.ts
  pg-organization.repository.ts
  pg-membership.repository.ts
  pg-project.repository.ts
  mappers/
    user.mapper.ts           # row → User / User → params
    organization.mapper.ts
    membership.mapper.ts
    project.mapper.ts
  migrations/
    0001_init.sql
  migrate.ts                 # runner forward-only (CLI + setup de testes)
```

### Executor corrente via AsyncLocalStorage

Os repositórios **não recebem client por parâmetro** (manteria os ports puros e as assinaturas limpas). Cada query pede o executor corrente ao `pg-executor`:

- Fora de transação → o `Pool` (auto-commit por statement).
- Dentro de `TransactionRunner.run(work)` → o `client` transacional, propagado via `AsyncLocalStorage`.

A "mágica" do ambiente transacional fica inteiramente contida na infraestrutura. O port exposto à aplicação é puro e ignora SQL/conexões.

## 4. Novo port: `TransactionRunner`

```ts
// src/core/shared/application/transaction-runner.ts
export interface TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T>
}
```

- **`PgTransactionRunner`:** adquire client do pool, `BEGIN`, executa `work()` com o client ligado ao ALS, `COMMIT`; em qualquer erro, `ROLLBACK` e relança; sempre libera o client (`finally`).
- **`InMemoryTransactionRunner`:** apenas `return work()` (no-op transacional) — mantém a suíte unit rápida e sem DB.
- **`RegisterUser`** passa a receber `TransactionRunner` e envolve os três saves:
  ```ts
  return tx.run(async () => {
    await users.save(user)
    await organizations.save(organization)
    await memberships.save(membership)
    return ok(toUserDTO(user))
  })
  ```
  Atomicidade real (tudo-ou-nada); o restante da lógica permanece idêntico.

> Os demais use cases (`AuthenticateUser`, `CreateProject`, `GetProject`, etc.) são leitura ou escrita única — não usam `TransactionRunner`.

## 5. Schema — `0001_init.sql`

Cada coluna deriva de um getter de entidade + `restore()`. **Onde o in-memory não impõe unicidade, o Postgres também não impõe**, para não mudar comportamento observável.

| Tabela | Colunas | Restrições / Índices |
|---|---|---|
| `users` | `id text PK`, `name text`, `email text`, `password_hash text`, `created_at timestamptz` | `UNIQUE(email)` |
| `organizations` | `id text PK`, `name text`, `slug text`, `owner_id text`, `created_at timestamptz` | slug **sem UNIQUE** (D6b) |
| `memberships` | `user_id text`, `organization_id text`, `role text` | **PK(user_id, organization_id)** |
| `projects` | `id text PK`, `organization_id text`, `key text`, `name text`, `description text`, `status text`, `created_by text`, `created_at timestamptz` | `UNIQUE(organization_id, key)`; índice em `organization_id` |

- **IDs são `text`** (o `IdGenerator` atual produz strings opacas; manter assim evita acoplar o domínio a tipos do DB).
- **`created_at timestamptz`** — armazenar em UTC; o mapper reconstrói `Date`.
- Sem FKs explícitas neste incremento (YAGNI; as relações são garantidas pela aplicação). FKs podem entrar com o endurecimento futuro.

### Notas comportamentais

- **Slug sem UNIQUE (D6b):** `RegisterUser` gera `OrganizationSlug.fromText(name)` sem deduplicar; dois usuários "Ana" produzem slug `ana`. Um `UNIQUE` quebraria o segundo cadastro. Comportamento atual preservado; "unicidade/colisão de slug" fica como trabalho futuro.
- **`memberships.save` idempotente (D6c):** o in-memory atual faz `array.push` (duplica ao salvar a mesma membership). O Postgres usará `INSERT … ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role`. O **contrato canoniza save como idempotente**, e o **in-memory é corrigido** (substituir-ou-inserir por chave composta) para satisfazê-lo.

## 6. Reconstituição linha → entidade

As entidades expõem `restore(id, props)` com Value Objects. Os mappers reconstroem os VOs a partir das strings da linha. Como os valores **já foram validados na escrita**, uma falha de parsing na leitura indica **corrupção de dados → exceção** (não é falha de domínio esperada).

Decisão de design: adicionar um método estático `fromTrusted(value): VO` (lança em valor inválido) a cada VO usado na leitura — `Email`, `OrganizationSlug`, `ProjectKey`, `ProjectName`, `Role`, `ProjectStatus` —, mais limpo que desempacotar `Result` dentro do mapper. (Membership reconstrói via `Membership.create`, que é puro e dispensa `restore`.)

## 7. Composição e seleção de implementação

`container.build()` escolhe a implementação por ambiente, **sem tocar nos call sites**:

- **`DATABASE_URL` presente** → repositórios Postgres + `PgTransactionRunner`; `Pool` singleton em `globalThis` (sobrevive ao HMR, como o container atual).
- **`DATABASE_URL` ausente** → repositórios in-memory + `InMemoryTransactionRunner` (no-op).
- **Defensivo:** em `NODE_ENV === 'production'`, `DATABASE_URL` é **obrigatória** — `env.ts` falha-rápido se faltar, evitando subir produção caindo silenciosamente em memória (perda de dados).

Consequência: os **testes de route-handler existentes** (que usam `resetContainer` + in-memory) seguem **sem DB**, rápidos e determinísticos. `env.ts` ganha `DATABASE_URL` opcional, validada se presente.

`Container` ganha o campo `transactionRunner`; `factories.ts` injeta-o no `makeRegisterUser`.

## 8. Estratégia de testes (dois níveis isolados)

| Suíte | Comando | Engine | Conteúdo |
|---|---|---|---|
| Unit/integração (atual) | `npm test` | sem DB | tudo de hoje + 4 contratos contra in-memory |
| DB (nova) | `npm run test:db` | **Testcontainers** | 4 contratos contra Postgres real |

- **Quatro contracts factory-parametrizados** em `src/core/**/ports/*-repository.contract.ts` (Project já existe; criar User, Organization, Membership). Cada contrato roda contra **as duas** implementações → prova de equivalência.
- **Separação mecânica das suítes:** os arquivos que rodam contratos contra Postgres usam o sufixo **`*.pg.test.ts`** (ex.: `pg-user.repository.pg.test.ts`). O `vitest.config.mts` atual passa a **excluir `**/*.pg.test.ts`** (mantendo `npm test` sem Docker); um novo `vitest.db.config.mts` **inclui apenas `**/*.pg.test.ts`** e é executado por `npm run test:db`. Os arquivos in-memory continuam `*.test.ts` normais.
- **Testcontainers:** 1 container reusado por run (`beforeAll` sobe e migra); `TRUNCATE … RESTART IDENTITY CASCADE` entre casos para isolamento; `afterAll` derruba.
- Os contratos cobrem **isolamento multi-tenant** (consulta cross-org retorna `null`/lista filtrada) — a garantia de tenancy vira teste executável.
- A suíte `test:db` exige Docker; é separada para não impor Docker ao `npm test`.

### Contratos — comportamentos canônicos

- **User:** `save` faz upsert por `id`; `findById` e `findByEmail` recuperam; e-mail inexistente → `null`.
- **Organization:** `save` faz upsert por `id`; (sem unicidade de slug — dois orgs com mesmo slug coexistem).
- **Membership:** `save` idempotente por `(userId, organizationId)`; `findByUser` lista as do usuário; usuário sem membership → `[]`.
- **Project:** (existente) salva/recupera por chave na org; não encontra de outra org; lista só da org.

## 9. Migrações

Runner forward-only mínimo (`migrate.ts`):

1. Garante a tabela `schema_migrations(filename text PK, applied_at timestamptz)`.
2. Lê `migrations/NNNN_*.sql` em ordem lexicográfica.
3. Aplica as pendentes, **cada uma em sua transação**, registrando o filename.

Exposto como `npm run db:migrate` (executado via `tsx`) e reutilizado pelo setup do Testcontainers.

## 10. Dependências novas (enxutas)

- **produção:** `pg`
- **desenvolvimento:** `@types/pg`, `testcontainers` (+ `@testcontainers/postgresql`), `tsx`

## 11. Tratamento de erros

- Falhas esperadas de domínio seguem via `Result` (inalterado).
- Violações de constraint (ex.: `UNIQUE(email)` numa corrida) e falhas de conexão → **exceções** (excepcionais), tratadas na borda HTTP como **500 genérico**.
- **Sem vazar SQL/segredos** em respostas ou logs (mandato de não-exposição). `DATABASE_URL` nunca é logada.

## 12. Fora de escopo (YAGNI — futuro documentado)

RLS (Row-Level Security), unicidade/colisão de slug, pooler serverless / driver HTTP, read replicas, soft-delete/archive, paginação de `listByOrg`, FKs e cascatas, auditoria/observabilidade de queries, retry/circuit-breaker, seeds.

## 13. Definition of Done

- [ ] 4 repositórios Postgres implementados por trás dos ports existentes (núcleo intacto).
- [ ] Port `TransactionRunner` + `PgTransactionRunner` (ALS) + `InMemoryTransactionRunner`; `RegisterUser` atômico.
- [ ] Migração `0001_init.sql` + runner `migrate.ts` + `npm run db:migrate`.
- [ ] 4 contracts; rodando verdes contra in-memory (`npm test`) **e** contra Postgres (`npm run test:db`).
- [ ] In-memory `MembershipRepository` corrigido (save idempotente) sob o novo contrato.
- [ ] `container.build()` seleciona por `DATABASE_URL`; obrigatória em produção; `env.ts` atualizado.
- [ ] `npm test` permanece sem Docker, determinístico e verde (55+ testes).
- [ ] `tsc` limpo, `lint` limpo, `next build` OK.
- [ ] `.env.example` documenta `DATABASE_URL`; README/nota de como subir Postgres local e migrar.

## 14. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| ALS mal propagado em caminhos async → query fora da transação | Cobrir com teste do `PgTransactionRunner` (rollback desfaz os 3 saves do `RegisterUser`) |
| Divergência in-memory ⇄ Postgres | Mesmo contrato roda nas duas implementações |
| `npm test` passar a exigir Docker por engano | Container só é construído quando `DATABASE_URL` presente; contratos de DB ficam em arquivos próprios da suíte `test:db` |
| Mapper reconstruindo VO de dado corrompido | `fromTrusted` lança (falha-rápido), nunca retorna VO inválido silenciosamente |

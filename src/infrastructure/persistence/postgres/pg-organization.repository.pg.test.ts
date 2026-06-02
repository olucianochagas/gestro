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

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

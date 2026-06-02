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

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

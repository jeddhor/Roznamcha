import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { applyMigrations } from './database'

describe('database persistence', () => {
  it('creates schema and persists an entry', () => {
    const db = new Database(':memory:')
    applyMigrations(db)

    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO entries(
        id, title, content, tags, is_encrypted, encryption_scope, salt, iv, auth_tag, created_at, updated_at, entry_date
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('id-1', 'My title', '<p>Body</p>', '[]', 0, 'none', null, null, null, now, now, '2026-04-24')

    const row = db.prepare('SELECT title, content FROM entries WHERE id = ?').get('id-1') as {
      title: string
      content: string
    }

    expect(row.title).toBe('My title')
    expect(row.content).toContain('Body')
  })
})

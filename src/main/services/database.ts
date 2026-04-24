import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

interface EntryRow {
  id: string
  title: string
  content: string
  tags: string
  is_encrypted: number
  encryption_scope: 'none' | 'entry' | 'global'
  salt: string | null
  iv: string | null
  auth_tag: string | null
  created_at: string
  updated_at: string
  entry_date: string
}

let db: Database.Database | null = null

export function applyMigrations(targetDb: Database.Database): void {
  targetDb.pragma('journal_mode = WAL')
  targetDb.pragma('foreign_keys = ON')

  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      is_encrypted INTEGER NOT NULL DEFAULT 0,
      encryption_scope TEXT NOT NULL DEFAULT 'none',
      salt TEXT,
      iv TEXT,
      auth_tag TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      entry_date TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(entry_date);
    CREATE INDEX IF NOT EXISTS idx_entries_updated ON entries(updated_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      config TEXT NOT NULL,
      is_preset INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `)
}

export function getDatabase(): Database.Database {
  if (db) {
    return db
  }

  const userData = app.getPath('userData')
  mkdirSync(userData, { recursive: true })
  const dbPath = join(userData, 'journal.db')

  db = new Database(dbPath)
  applyMigrations(db)

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function toEntryRow(value: unknown): EntryRow {
  return value as EntryRow
}

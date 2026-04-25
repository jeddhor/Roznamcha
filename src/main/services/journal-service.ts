import { randomUUID } from 'crypto'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { app, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { marked } from 'marked'
import TurndownService from 'turndown'
import {
  AppSettings,
  EntrySearchResult,
  ExportInput,
  GlobalEncryptionState,
  JournalEntry,
  JournalEntryMeta,
  LlmRequestInput,
  LlmResponse,
  SaveEntryInput,
  ThemeConfig,
  UnlockEntryInput
} from '../../shared/models'
import { getDatabase, toEntryRow } from './database'
import {
  createPasswordVerifier,
  decryptWithKey,
  decryptWithPassword,
  deriveSessionKey,
  encryptWithKey,
  encryptWithPassword,
  verifyPassword
} from './crypto'

const DEFAULT_SETTINGS: AppSettings = {
  activeThemeId: 'preset-muted',
  fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
  fontSize: 16,
  autoSaveSeconds: 6,
  defaultEditorMode: 'split',
  defaultEncryptionScope: 'none',
  globalEncryptionEnabled: false,
  llmProvider: 'ollama',
  llmBaseUrl: 'http://127.0.0.1:11434',
  llmModel: 'llama3.1',
  llmContextWindow: 4096,
  llmApiKey: ''
}

const PRESET_THEMES: ThemeConfig[] = [
  {
    id: 'preset-muted',
    name: 'Muted Neutral',
    mode: 'muted',
    colors: {
      background: '#f2efe8',
      surface: '#f9f6f2',
      panel: '#e7e1d8',
      text: '#28221b',
      mutedText: '#6b6257',
      accent: '#b46f3d',
      accentSoft: '#ead4c2',
      border: '#cfbca9',
      danger: '#8c3e31'
    }
  },
  {
    id: 'preset-dark',
    name: 'Dark Ink',
    mode: 'dark',
    colors: {
      background: '#121417',
      surface: '#1a1f25',
      panel: '#242b33',
      text: '#f4f6f8',
      mutedText: '#a6b0bc',
      accent: '#4cc9f0',
      accentSoft: '#203b45',
      border: '#2f3740',
      danger: '#f97066'
    }
  },
  {
    id: 'preset-pastel',
    name: 'Pastel Paper',
    mode: 'pastel',
    colors: {
      background: '#fff7f2',
      surface: '#fffdf9',
      panel: '#fce9dc',
      text: '#3d2d3b',
      mutedText: '#7b6378',
      accent: '#ff8e72',
      accentSoft: '#ffd8cc',
      border: '#f0c9bb',
      danger: '#d9435f'
    }
  },
  {
    id: 'preset-neon',
    name: 'Neon Grid',
    mode: 'neon',
    colors: {
      background: '#101225',
      surface: '#171a34',
      panel: '#20254a',
      text: '#e7f8ff',
      mutedText: '#97b7c8',
      accent: '#6bffea',
      accentSoft: '#193f48',
      border: '#2d3364',
      danger: '#ff5d8f'
    }
  },
  {
    id: 'preset-contrast',
    name: 'High Contrast',
    mode: 'high-contrast',
    colors: {
      background: '#ffffff',
      surface: '#ffffff',
      panel: '#f0f0f0',
      text: '#000000',
      mutedText: '#1e1e1e',
      accent: '#003bff',
      accentSoft: '#c7d8ff',
      border: '#000000',
      danger: '#c00000'
    }
  },
  {
    id: 'preset-gothic-crimson',
    name: 'Gothic Crimson',
    mode: 'dark',
    colors: {
      background: '#0f0a0d',
      surface: '#171014',
      panel: '#22141b',
      text: '#f4e9ee',
      mutedText: '#b09aa5',
      accent: '#a3122f',
      accentSoft: '#3f1824',
      border: '#3a232d',
      danger: '#df3359'
    }
  },
  {
    id: 'preset-sapphire-ledger',
    name: 'Sapphire Ledger',
    mode: 'dark',
    colors: {
      background: '#0f1a28',
      surface: '#162437',
      panel: '#1d2f46',
      text: '#eaf4ff',
      mutedText: '#9fb6ce',
      accent: '#2f8fff',
      accentSoft: '#1d3f66',
      border: '#2e4661',
      danger: '#ff6a7f'
    }
  },
  {
    id: 'preset-amethyst-nocturne',
    name: 'Amethyst Nocturne',
    mode: 'dark',
    colors: {
      background: '#171024',
      surface: '#211835',
      panel: '#2a2145',
      text: '#f2ebff',
      mutedText: '#b5a8d2',
      accent: '#9c6bff',
      accentSoft: '#3a2b63',
      border: '#3e325d',
      danger: '#ff5d9b'
    }
  },
  {
    id: 'preset-mercury-metallic',
    name: 'Mercury Metallic',
    mode: 'muted',
    colors: {
      background: '#dde2e8',
      surface: '#f3f6fa',
      panel: '#cfd6df',
      text: '#1f2a36',
      mutedText: '#5e6c7d',
      accent: '#6b7f96',
      accentSoft: '#c6d0dc',
      border: '#aab6c4',
      danger: '#b4475a'
    }
  },
  {
    id: 'preset-royal-violet',
    name: 'Royal Violet',
    mode: 'pastel',
    colors: {
      background: '#f5efff',
      surface: '#fcf8ff',
      panel: '#ebe0ff',
      text: '#332647',
      mutedText: '#6e5f86',
      accent: '#7f52d9',
      accentSoft: '#d8c8ff',
      border: '#c8b4f0',
      danger: '#bb3f6a'
    }
  }
]

const unlockedEntryCache = new Map<string, string>()
let globalSessionKey: Buffer | null = null

function nowIso(): string {
  return new Date().toISOString()
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function getSetting<T>(key: string, fallback: T): T {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value?: string } | undefined
  if (!row?.value) {
    return fallback
  }
  return parseJson<T>(row.value, fallback)
}

function setSetting<T>(key: string, value: T): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO settings(key, value)
     VALUES(?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, JSON.stringify(value))
}

function entryToMeta(rowValue: unknown): JournalEntryMeta {
  const row = toEntryRow(rowValue)
  const tags = parseJson<string[]>(row.tags, [])
  const isEncrypted = Boolean(row.is_encrypted)

  return {
    id: row.id,
    title: row.title,
    preview: isEncrypted ? '[Encrypted entry]' : row.content.replace(/<[^>]+>/g, '').slice(0, 120),
    tags,
    isEncrypted,
    isLocked: isEncrypted && !unlockedEntryCache.has(row.id),
    encryptionScope: row.encryption_scope,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entryDate: row.entry_date
  }
}

function ensurePresetThemes(): void {
  const db = getDatabase()
  const insert = db.prepare(
    `INSERT INTO themes(id, name, config, is_preset, created_at)
     VALUES(?, ?, ?, 1, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, config = excluded.config`
  )

  for (const theme of PRESET_THEMES) {
    insert.run(theme.id, theme.name, JSON.stringify(theme), nowIso())
  }
}

export function initializeJournalStore(): void {
  getDatabase()
  ensurePresetThemes()

  const currentSettings = getSettings()
  if (!currentSettings) {
    saveSettings(DEFAULT_SETTINGS)
  }
}

export function getSettings(): AppSettings {
  const saved = getSetting<Partial<AppSettings>>('app-settings', {})
  return { ...DEFAULT_SETTINGS, ...saved }
}

export function saveSettings(settings: AppSettings): AppSettings {
  setSetting('app-settings', settings)
  return getSettings()
}

function buildContextExcerpt(entryContent: string, contextWindow: number): string {
  const plain = entryContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!plain) {
    return '(Entry is currently empty.)'
  }

  const maxChars = Math.max(400, contextWindow * 4)
  if (plain.length <= maxChars) {
    return plain
  }

  return plain.slice(plain.length - maxChars)
}

function ensureNoTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

export async function askLlm(input: LlmRequestInput): Promise<LlmResponse> {
  const settings = getSettings()
  const prompt = input.prompt.trim()
  if (!prompt) {
    throw new Error('Prompt is required')
  }

  const baseUrl = ensureNoTrailingSlash(settings.llmBaseUrl)
  if (!baseUrl) {
    throw new Error('LLM base URL is required in Settings')
  }
  if (!settings.llmModel.trim()) {
    throw new Error('LLM model is required in Settings')
  }

  const contextExcerpt = buildContextExcerpt(input.entryContent, settings.llmContextWindow)
  const userMessage = `Entry context:\n${contextExcerpt}\n\nUser request:\n${prompt}`

  if (settings.llmProvider === 'ollama') {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.llmModel,
        stream: false,
        options: {
          num_ctx: settings.llmContextWindow
        },
        messages: [
          {
            role: 'system',
            content:
              'You are assisting with a journal entry. Return clean markdown only, with no surrounding commentary about formatting.'
          },
          {
            role: 'user',
            content: userMessage
          }
        ]
      })
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Ollama request failed (${response.status}): ${body || response.statusText}`)
    }

    const data = (await response.json()) as { message?: { content?: string } }
    return { content: data.message?.content?.trim() ?? '' }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (settings.llmApiKey.trim()) {
    headers.Authorization = `Bearer ${settings.llmApiKey.trim()}`
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: settings.llmModel,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are assisting with a journal entry. Return clean markdown only, with no surrounding commentary about formatting.'
        },
        {
          role: 'user',
          content: userMessage
        }
      ]
    })
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`LLM request failed (${response.status}): ${body || response.statusText}`)
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return { content: data.choices?.[0]?.message?.content?.trim() ?? '' }
}

export function getThemes(): ThemeConfig[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT config FROM themes ORDER BY is_preset DESC, created_at ASC').all() as {
    config: string
  }[]

  if (!rows.length) {
    ensurePresetThemes()
    return getThemes()
  }

  return rows.map((row) => parseJson<ThemeConfig>(row.config, PRESET_THEMES[0]))
}

export function saveCustomTheme(theme: ThemeConfig): ThemeConfig[] {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO themes(id, name, config, is_preset, created_at)
     VALUES(?, ?, ?, 0, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, config = excluded.config`
  ).run(theme.id, theme.name, JSON.stringify(theme), nowIso())

  return getThemes()
}

export function deleteCustomTheme(id: string): ThemeConfig[] {
  const db = getDatabase()
  db.prepare('DELETE FROM themes WHERE id = ? AND is_preset = 0').run(id)
  return getThemes()
}

export function listEntriesByDate(entryDate: string): JournalEntryMeta[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM entries WHERE entry_date = ? ORDER BY updated_at DESC')
    .all(entryDate)

  return rows.map(entryToMeta)
}

export function createEntry(entryDate: string): JournalEntry {
  const db = getDatabase()
  const id = randomUUID()
  const timestamp = nowIso()
  db.prepare(
    `INSERT INTO entries(
      id, title, content, tags, is_encrypted, encryption_scope, salt, iv, auth_tag, created_at, updated_at, entry_date
    ) VALUES (?, ?, ?, '[]', 0, 'none', NULL, NULL, NULL, ?, ?, ?)`
  ).run(id, 'Untitled Entry', '', timestamp, timestamp, entryDate)

  return getEntry({ id })
}

export function getEntry(input: UnlockEntryInput): JournalEntry {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(input.id)
  if (!row) {
    throw new Error('Entry not found')
  }

  const mapped = entryToMeta(row)
  const raw = toEntryRow(row)

  if (!mapped.isEncrypted) {
    return { ...mapped, content: raw.content }
  }

  if (unlockedEntryCache.has(raw.id)) {
    return { ...mapped, isLocked: false, content: unlockedEntryCache.get(raw.id) ?? '' }
  }

  if (raw.encryption_scope === 'global' && globalSessionKey) {
    const plain = decryptWithKey(
      {
        cipherText: raw.content,
        iv: raw.iv ?? '',
        authTag: raw.auth_tag ?? ''
      },
      globalSessionKey
    )
    unlockedEntryCache.set(raw.id, plain)
    return { ...mapped, isLocked: false, content: plain }
  }

  if (raw.encryption_scope === 'entry' && input.password) {
    const plain = decryptWithPassword(
      {
        cipherText: raw.content,
        iv: raw.iv ?? '',
        authTag: raw.auth_tag ?? '',
        salt: raw.salt ?? ''
      },
      input.password
    )
    unlockedEntryCache.set(raw.id, plain)
    return { ...mapped, isLocked: false, content: plain }
  }

  return { ...mapped, content: '' }
}

export function saveEntry(input: SaveEntryInput): JournalEntry {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(input.id)
  if (!row) {
    throw new Error('Entry not found')
  }

  const nextScope = input.encryptionScope
  let content = input.content
  let isEncrypted = 0
  let iv: string | null = null
  let authTag: string | null = null
  let salt: string | null = null

  if (nextScope === 'entry') {
    if (!input.password) {
      throw new Error('Password is required for entry-level encryption')
    }
    const encrypted = encryptWithPassword(input.content, input.password)
    content = encrypted.cipherText
    iv = encrypted.iv
    authTag = encrypted.authTag
    salt = encrypted.salt ?? null
    isEncrypted = 1
  }

  if (nextScope === 'global') {
    if (!globalSessionKey) {
      throw new Error('Global journal is locked')
    }
    const encrypted = encryptWithKey(input.content, globalSessionKey)
    content = encrypted.cipherText
    iv = encrypted.iv
    authTag = encrypted.authTag
    salt = null
    isEncrypted = 1
  }

  const updatedAt = nowIso()
  db.prepare(
    `UPDATE entries
     SET title = ?,
         content = ?,
         tags = ?,
         is_encrypted = ?,
         encryption_scope = ?,
         salt = ?,
         iv = ?,
         auth_tag = ?,
         updated_at = ?,
         entry_date = ?
     WHERE id = ?`
  ).run(
    input.title || 'Untitled Entry',
    content,
    JSON.stringify(input.tags),
    isEncrypted,
    nextScope,
    salt,
    iv,
    authTag,
    updatedAt,
    input.entryDate,
    input.id
  )

  if (nextScope === 'none') {
    unlockedEntryCache.delete(input.id)
  } else {
    unlockedEntryCache.set(input.id, input.content)
  }

  return getEntry({ id: input.id })
}

export function deleteEntry(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM entries WHERE id = ?').run(id)
  unlockedEntryCache.delete(id)
}

export function lockEntry(id: string): void {
  unlockedEntryCache.delete(id)
}

export function searchEntries(query: string): EntrySearchResult[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM entries
       WHERE title LIKE ?
          OR (is_encrypted = 0 AND content LIKE ?)
          OR tags LIKE ?
       ORDER BY updated_at DESC`
    )
    .all(`%${query}%`, `%${query}%`, `%${query}%`)

  const base = rows.map((row) => ({
    ...entryToMeta(row),
    matchesContent: !toEntryRow(row).is_encrypted
  }))

  const unlockedMatches = Array.from(unlockedEntryCache.entries())
    .filter(([_, content]) => content.toLowerCase().includes(query.toLowerCase()))
    .map(([id]) => {
      const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(id)
      return row
    })
    .filter((row): row is object => Boolean(row))
    .map((row) => ({
      ...entryToMeta(row),
      isLocked: false,
      matchesContent: true
    }))

  const seen = new Set<string>()
  return [...base, ...unlockedMatches].filter((entry) => {
    if (seen.has(entry.id)) {
      return false
    }
    seen.add(entry.id)
    return true
  })
}

export function setGlobalPassword(password: string): GlobalEncryptionState {
  const verifier = createPasswordVerifier(password)
  setSetting('global-encryption', {
    enabled: true,
    salt: verifier.salt,
    verifier: verifier.verifier
  })
  const settings = getSettings()
  saveSettings({ ...settings, globalEncryptionEnabled: true, defaultEncryptionScope: 'global' })
  globalSessionKey = deriveSessionKey(password, verifier.salt)
  return { enabled: true, unlocked: true }
}

export function unlockGlobalPassword(password: string): GlobalEncryptionState {
  const config = getSetting<{ enabled: boolean; salt: string; verifier: string }>('global-encryption', {
    enabled: false,
    salt: '',
    verifier: ''
  })

  if (!config.enabled) {
    throw new Error('Global encryption has not been configured')
  }

  const ok = verifyPassword(password, config.salt, config.verifier)
  if (!ok) {
    throw new Error('Incorrect password')
  }

  globalSessionKey = deriveSessionKey(password, config.salt)
  return { enabled: true, unlocked: true }
}

export function disableGlobalEncryption(): GlobalEncryptionState {
  setSetting('global-encryption', { enabled: false, salt: '', verifier: '' })
  globalSessionKey = null
  const settings = getSettings()
  saveSettings({ ...settings, globalEncryptionEnabled: false, defaultEncryptionScope: 'none' })
  return { enabled: false, unlocked: false }
}

export function getGlobalEncryptionState(): GlobalEncryptionState {
  const config = getSetting<{ enabled: boolean }>('global-encryption', { enabled: false })
  return {
    enabled: config.enabled,
    unlocked: config.enabled ? Boolean(globalSessionKey) : false
  }
}

export function lockGlobal(): GlobalEncryptionState {
  globalSessionKey = null
  unlockedEntryCache.clear()
  return getGlobalEncryptionState()
}

export async function exportEntry(input: ExportInput): Promise<string> {
  const entry = getEntry({ id: input.id, password: input.password })
  if (entry.isEncrypted && entry.isLocked) {
    throw new Error('Entry is locked')
  }

  const extensionMap = {
    markdown: 'md',
    html: 'html',
    pdf: 'pdf'
  } as const

  const savePath = dialog.showSaveDialogSync({
    title: 'Export Entry',
    defaultPath: `${entry.title || 'journal-entry'}.${extensionMap[input.format]}`,
    filters: [
      { name: input.format.toUpperCase(), extensions: [extensionMap[input.format]] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (!savePath) {
    throw new Error('Export cancelled')
  }

  if (input.format === 'html') {
    const html = `<html><body>${entry.content}</body></html>`
    writeFileSync(savePath, html, 'utf8')
    return savePath
  }

  if (input.format === 'markdown') {
    const turndown = new TurndownService()
    writeFileSync(savePath, turndown.turndown(entry.content), 'utf8')
    return savePath
  }

  const win = new BrowserWindow({ show: false })
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(entry.content)}`)
  const pdf = await win.webContents.printToPDF({ printBackground: true })
  writeFileSync(savePath, pdf)
  win.destroy()

  return savePath
}

export function importMarkdownFile(targetDate: string): JournalEntry {
  const filePaths = dialog.showOpenDialogSync({
    title: 'Import Markdown',
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
  })

  if (!filePaths?.length) {
    throw new Error('Import cancelled')
  }

  const filePath = filePaths[0]
  const markdown = readFileSync(filePath, 'utf8')
  const html = marked.parse(markdown) as string
  const title = markdown.split('\n').find((line) => line.trim())?.replace(/^#+\s*/, '').trim() || 'Imported'

  const created = createEntry(targetDate)
  return saveEntry({
    id: created.id,
    title,
    content: html,
    tags: ['imported'],
    entryDate: targetDate,
    encryptionScope: 'none'
  })
}

export function createBackup(): string {
  const dbPath = join(app.getPath('userData'), 'journal.db')
  if (!existsSync(dbPath)) {
    throw new Error('No database file found')
  }

  const backupDir = join(app.getPath('documents'), 'JournalBackups')
  mkdirSync(backupDir, { recursive: true })
  const target = join(backupDir, `journal-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`)
  writeFileSync(target, readFileSync(dbPath))
  return target
}

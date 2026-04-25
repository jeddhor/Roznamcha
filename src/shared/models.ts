export type EncryptionScope = 'none' | 'entry' | 'global'
export type LlmProvider = 'ollama' | 'openai-compatible'

export type ThemePreset = 'muted' | 'dark' | 'pastel' | 'neon' | 'high-contrast'

export interface ThemeConfig {
  id: string
  name: string
  mode: ThemePreset | 'custom'
  colors: {
    background: string
    surface: string
    panel: string
    text: string
    mutedText: string
    accent: string
    accentSoft: string
    border: string
    danger: string
  }
}

export interface JournalEntryMeta {
  id: string
  title: string
  preview: string
  tags: string[]
  isEncrypted: boolean
  isLocked: boolean
  encryptionScope: EncryptionScope
  createdAt: string
  updatedAt: string
  entryDate: string
}

export interface JournalEntry extends JournalEntryMeta {
  content: string
}

export interface AppSettings {
  activeThemeId: string
  fontFamily: string
  fontSize: number
  autoSaveSeconds: number
  defaultEditorMode: 'rich' | 'split' | 'markdown'
  defaultEncryptionScope: EncryptionScope
  globalEncryptionEnabled: boolean
  llmProvider: LlmProvider
  llmBaseUrl: string
  llmModel: string
  llmContextWindow: number
  llmApiKey: string
}

export interface LlmRequestInput {
  prompt: string
  entryContent: string
}

export interface LlmResponse {
  content: string
}

export interface GlobalEncryptionState {
  enabled: boolean
  unlocked: boolean
}

export interface SaveEntryInput {
  id: string
  title: string
  content: string
  tags: string[]
  entryDate: string
  encryptionScope: EncryptionScope
  password?: string
}

export interface UnlockEntryInput {
  id: string
  password?: string
}

export interface EntrySearchResult extends JournalEntryMeta {
  matchesContent: boolean
}

export interface ExportInput {
  id: string
  format: 'markdown' | 'html' | 'pdf'
  password?: string
}

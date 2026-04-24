import {
  AppSettings,
  EntrySearchResult,
  ExportInput,
  GlobalEncryptionState,
  JournalEntry,
  JournalEntryMeta,
  SaveEntryInput,
  ThemeConfig
} from '../../../shared/models'

export interface JournalApi {
  listByDate(date: string): Promise<JournalEntryMeta[]>
  createEntry(date: string): Promise<JournalEntry>
  getEntry(id: string, password?: string): Promise<JournalEntry>
  saveEntry(input: SaveEntryInput): Promise<JournalEntry>
  deleteEntry(id: string): Promise<void>
  lockEntry(id: string): Promise<void>
  search(query: string): Promise<EntrySearchResult[]>
}

export interface SettingsApi {
  get(): Promise<AppSettings>
  save(settings: AppSettings): Promise<AppSettings>
}

export interface ThemesApi {
  list(): Promise<ThemeConfig[]>
  save(theme: ThemeConfig): Promise<ThemeConfig[]>
  delete(id: string): Promise<ThemeConfig[]>
}

export interface SecurityApi {
  getGlobalState(): Promise<GlobalEncryptionState>
  setGlobalPassword(password: string): Promise<GlobalEncryptionState>
  unlockGlobal(password: string): Promise<GlobalEncryptionState>
  disableGlobal(): Promise<GlobalEncryptionState>
  lockGlobal(): Promise<GlobalEncryptionState>
}

export interface FileApi {
  exportEntry(input: ExportInput): Promise<string>
  importMarkdown(targetDate: string): Promise<JournalEntry>
  createBackup(): Promise<string>
}

export interface SystemApi {
  listFonts(): Promise<string[]>
}

export interface AppInfo {
  name: string
  version: string
  license: string
  repository: string
}

export interface AppMetaApi {
  getInfo(): Promise<AppInfo>
}

export interface AppApi {
  journal: JournalApi
  settings: SettingsApi
  themes: ThemesApi
  security: SecurityApi
  file: FileApi
  system: SystemApi
  appMeta: AppMetaApi
}

import { app, ipcMain } from 'electron'
import { SaveEntryInput, ThemeConfig } from '../../shared/models'
import {
  createBackup,
  createEntry,
  deleteCustomTheme,
  deleteEntry,
  disableGlobalEncryption,
  exportEntry,
  getEntry,
  getGlobalEncryptionState,
  getSettings,
  getThemes,
  importMarkdownFile,
  initializeJournalStore,
  askLlm,
  listEntriesByDate,
  lockEntry,
  lockGlobal,
  saveCustomTheme,
  saveEntry,
  saveSettings,
  searchEntries,
  setGlobalPassword,
  unlockGlobalPassword
} from '../services/journal-service'
import { listSystemFonts } from '../services/system-service'

export function registerJournalIpc(): void {
  initializeJournalStore()

  ipcMain.handle('journal:listByDate', (_, date: string) => listEntriesByDate(date))
  ipcMain.handle('journal:createEntry', (_, date: string) => createEntry(date))
  ipcMain.handle('journal:getEntry', (_, id: string, password?: string) => getEntry({ id, password }))
  ipcMain.handle('journal:saveEntry', (_, payload: SaveEntryInput) => saveEntry(payload))
  ipcMain.handle('journal:deleteEntry', (_, id: string) => deleteEntry(id))
  ipcMain.handle('journal:lockEntry', (_, id: string) => lockEntry(id))
  ipcMain.handle('journal:search', (_, query: string) => searchEntries(query))

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:save', (_, settings) => saveSettings(settings))

  ipcMain.handle('themes:list', () => getThemes())
  ipcMain.handle('themes:save', (_, theme: ThemeConfig) => saveCustomTheme(theme))
  ipcMain.handle('themes:delete', (_, id: string) => deleteCustomTheme(id))

  ipcMain.handle('security:getGlobalState', () => getGlobalEncryptionState())
  ipcMain.handle('security:setGlobalPassword', (_, password: string) => setGlobalPassword(password))
  ipcMain.handle('security:unlockGlobal', (_, password: string) => unlockGlobalPassword(password))
  ipcMain.handle('security:disableGlobal', () => disableGlobalEncryption())
  ipcMain.handle('security:lockGlobal', () => lockGlobal())

  ipcMain.handle('file:exportEntry', (_, payload) => exportEntry(payload))
  ipcMain.handle('file:importMarkdown', (_, targetDate: string) => importMarkdownFile(targetDate))
  ipcMain.handle('file:createBackup', () => createBackup())

  ipcMain.handle('system:listFonts', () => listSystemFonts())
  ipcMain.handle('llm:ask', (_, payload) => askLlm(payload))
  ipcMain.handle('app:getInfo', () => ({
    name: 'Roznamcha',
    version: app.getVersion(),
    license: 'MIT',
    repository: 'https://github.com/jeddhor/Roznamcha'
  }))
}

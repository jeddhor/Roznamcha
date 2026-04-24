import { create } from 'zustand'
import { format } from 'date-fns'
import { AppSettings, EncryptionScope, JournalEntry, JournalEntryMeta, ThemeConfig } from '../../../shared/models'

interface JournalState {
  selectedDate: string
  entries: JournalEntryMeta[]
  selectedEntryId: string | null
  activeEntry: JournalEntry | null
  settings: AppSettings | null
  themes: ThemeConfig[]
  globalEncryption: { enabled: boolean; unlocked: boolean }
  searchQuery: string
  searchResults: JournalEntryMeta[]
  isSaving: boolean
  error: string | null
  init: () => Promise<void>
  setDate: (date: Date) => Promise<void>
  refreshEntries: () => Promise<void>
  setSelectedEntry: (id: string | null, password?: string) => Promise<void>
  createEntry: () => Promise<void>
  saveEntry: (input: {
    title: string
    content: string
    tags: string[]
    encryptionScope: EncryptionScope
    password?: string
  }) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  search: (query: string) => Promise<void>
  setSettings: (settings: AppSettings) => Promise<void>
  setThemes: (themes: ThemeConfig[]) => void
  setError: (error: string | null) => void
}

const today = format(new Date(), 'yyyy-MM-dd')

export const useJournalStore = create<JournalState>((set, get) => ({
  selectedDate: today,
  entries: [],
  selectedEntryId: null,
  activeEntry: null,
  settings: null,
  themes: [],
  globalEncryption: { enabled: false, unlocked: false },
  searchQuery: '',
  searchResults: [],
  isSaving: false,
  error: null,

  init: async () => {
    const [settings, themes, globalEncryption] = await Promise.all([
      window.api.settings.get(),
      window.api.themes.list(),
      window.api.security.getGlobalState()
    ])

    set({ settings, themes, globalEncryption })
    await get().refreshEntries()
  },

  setDate: async (date) => {
    const selectedDate = format(date, 'yyyy-MM-dd')
    set({ selectedDate })
    await get().refreshEntries()
  },

  refreshEntries: async () => {
    const { selectedDate, selectedEntryId } = get()
    const entries = await window.api.journal.listByDate(selectedDate)
    const nextSelected = selectedEntryId && entries.some((entry) => entry.id === selectedEntryId)
      ? selectedEntryId
      : null

    set({ entries, selectedEntryId: nextSelected })

    if (nextSelected) {
      await get().setSelectedEntry(nextSelected)
    } else {
      set({ activeEntry: null })
    }
  },

  setSelectedEntry: async (id, password) => {
    if (!id) {
      set({ selectedEntryId: null, activeEntry: null })
      return
    }

    try {
      const activeEntry = await window.api.journal.getEntry(id, password)
      set({ selectedEntryId: id, activeEntry, error: null })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  createEntry: async () => {
    const created = await window.api.journal.createEntry(get().selectedDate)
    await get().refreshEntries()
    await get().setSelectedEntry(created.id)
  },

  saveEntry: async (input) => {
    const state = get()
    if (!state.selectedEntryId || !state.activeEntry) {
      return
    }

    const saveStartedAt = Date.now()
    set({ isSaving: true, error: null })

    try {
      await window.api.journal.saveEntry({
        id: state.selectedEntryId,
        title: input.title,
        content: input.content,
        tags: input.tags,
        encryptionScope: input.encryptionScope,
        password: input.password,
        entryDate: state.selectedDate
      })
      await get().refreshEntries()
      await get().setSelectedEntry(state.selectedEntryId)
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      const elapsed = Date.now() - saveStartedAt
      const minimumVisibleMs = 1000
      if (elapsed < minimumVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minimumVisibleMs - elapsed))
      }
      set({ isSaving: false })
    }
  },

  deleteEntry: async (id) => {
    await window.api.journal.deleteEntry(id)
    await get().refreshEntries()
  },

  search: async (query) => {
    if (!query.trim()) {
      set({ searchQuery: '', searchResults: [] })
      return
    }

    const searchResults = await window.api.journal.search(query)
    set({ searchQuery: query, searchResults })
  },

  setSettings: async (settings) => {
    const saved = await window.api.settings.save(settings)
    const globalEncryption = await window.api.security.getGlobalState()
    set({ settings: saved, globalEncryption })
  },

  setThemes: (themes) => set({ themes }),

  setError: (error) => set({ error })
}))

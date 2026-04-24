import { useEffect, useMemo, useRef, useState } from 'react'
import { parseISO } from 'date-fns'
import { CalendarWidget } from './components/CalendarWidget'
import { EditorPane } from './components/EditorPane'
import { EntryList } from './components/EntryList'
import { SettingsPanel } from './components/SettingsPanel'
import { useJournalStore } from './store/journal-store'
import { applyTheme } from './lib/theme'
import titleGraphic from './assets/roznamcha.png'
import darkTitleGraphic from '../../../roznomcha-dark.png'
import { AppInfo } from './types/api'
import { ThemeConfig } from '../../shared/models'

function isDarkTheme(theme: ThemeConfig | null): boolean {
  if (!theme) {
    return false
  }
  if (theme.mode === 'dark') {
    return true
  }

  const value = theme.colors.background.trim()
  const hex = value.startsWith('#') ? value.slice(1) : value
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) {
    return false
  }

  const normalized = hex.length === 3 ? hex.split('').map((c) => `${c}${c}`).join('') : hex
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance < 0.45
}

function normalizeRichTextHtml(html: string): string {
  const cleaned = html
    .replace(/<p><\/p>/g, '')
    .replace(/<p>\s*<br\s*\/?\s*>\s*<\/p>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

  return cleaned ? html : ''
}

function App(): React.JSX.Element {
  const {
    selectedDate,
    entries,
    selectedEntryId,
    activeEntry,
    settings,
    themes,
    globalEncryption,
    searchQuery,
    searchResults,
    isSaving,
    error,
    init,
    setDate,
    setSelectedEntry,
    createEntry,
    saveEntry,
    deleteEntry,
    search,
    setSettings,
    setThemes,
    setError,
    refreshEntries
  } = useJournalStore()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const lastAutoSaveSnapshot = useRef<{
    entryId: string
    title: string
    content: string
    tagsKey: string
    encryptionScope: string
  } | null>(null)

  useEffect(() => {
    init()
  }, [init])

  const activeTheme = useMemo(() => {
    if (!settings) return null
    return themes.find((theme) => theme.id === settings.activeThemeId) ?? themes[0] ?? null
  }, [themes, settings])

  const titleLogo = useMemo(() => (isDarkTheme(activeTheme) ? darkTitleGraphic : titleGraphic), [activeTheme])

  useEffect(() => {
    if (activeTheme && settings) {
      applyTheme(activeTheme, settings.fontFamily, settings.fontSize)
    }
  }, [activeTheme, settings])

  useEffect(() => {
    if (!aboutOpen) {
      return
    }

    let mounted = true
    const loadAppInfo = async (): Promise<void> => {
      const info = await window.api.appMeta.getInfo()
      if (!mounted) {
        return
      }
      setAppInfo(info)
    }

    loadAppInfo()
    return () => {
      mounted = false
    }
  }, [aboutOpen])

  useEffect(() => {
    if (!aboutOpen) {
      return
    }

    const onEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setAboutOpen(false)
      }
    }

    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [aboutOpen])

  useEffect(() => {
    if (!activeEntry || activeEntry.isLocked) {
      lastAutoSaveSnapshot.current = null
      return
    }

    lastAutoSaveSnapshot.current = {
      entryId: activeEntry.id,
      title: activeEntry.title,
      content: activeEntry.content,
      tagsKey: activeEntry.tags.join('|'),
      encryptionScope: activeEntry.encryptionScope
    }
  }, [activeEntry])

  useEffect(() => {
    if (!settings || !activeEntry || activeEntry.isLocked) return

    const id = window.setInterval(() => {
      if (isSaving) {
        return
      }

      const focused = document.activeElement as Element | null
      if (focused?.matches('[data-entry-password]')) {
        return
      }

      const editor = document.querySelector('.tiptap') as HTMLElement | null
      const content = normalizeRichTextHtml(editor?.innerHTML ?? activeEntry.content)
      const title =
        (document.querySelector('[data-entry-title]') as HTMLInputElement | null)?.value || activeEntry.title
      const tagsInput = (document.querySelector('[data-entry-tags]') as HTMLInputElement | null)?.value ?? ''
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
      const selectedScope =
        (document.querySelector('[data-entry-encryption-scope]') as HTMLSelectElement | null)?.value ??
        activeEntry.encryptionScope
      const encryptionScope = selectedScope as 'none' | 'entry' | 'global'
      const entryPassword =
        (document.querySelector('[data-entry-password]') as HTMLInputElement | null)?.value?.trim() ?? ''

      if (encryptionScope === 'entry' && !entryPassword) {
        return
      }

      const snapshot = {
        entryId: activeEntry.id,
        title,
        content,
        tagsKey: tags.join('|'),
        encryptionScope
      }

      const last = lastAutoSaveSnapshot.current
      if (
        last &&
        last.entryId === snapshot.entryId &&
        last.title === snapshot.title &&
        last.content === snapshot.content &&
        last.tagsKey === snapshot.tagsKey &&
        last.encryptionScope === snapshot.encryptionScope
      ) {
        return
      }

      lastAutoSaveSnapshot.current = snapshot
      saveEntry({
        title: snapshot.title,
        content: snapshot.content,
        tags,
        encryptionScope,
        password: encryptionScope === 'entry' ? entryPassword : undefined
      })
    }, Math.max(2, settings.autoSaveSeconds) * 1000)

    return () => window.clearInterval(id)
  }, [activeEntry, settings, saveEntry, isSaving])

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        createEntry()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        const input = document.getElementById('search-input') as HTMLInputElement | null
        input?.focus()
      }
    }

    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [createEntry])

  if (!settings) {
    return <div className="app-shell">Loading journal...</div>
  }

  const leftEntries = searchQuery ? searchResults : entries

  return (
    <div className="app-shell">
      <div className="app-bg" />
      <div className="layout">
        <aside className="left-panel">
          <div className="panel-header">
            <button className="title title-button" aria-label="Open About" onClick={() => setAboutOpen(true)}>
              <img className="title-logo" src={titleLogo} alt="Roznamcha" />
            </button>
            <button className="ghost-btn" onClick={() => setSettingsOpen(true)}>
              ⚙
            </button>
          </div>

          <input
            id="search-input"
            className="field"
            placeholder="Search titles, tags, and unlocked text..."
            onChange={(event) => search(event.target.value)}
          />

          <CalendarWidget selectedDate={parseISO(`${selectedDate}T00:00:00`)} onSelectDate={setDate} />

          <div className="entry-actions-row">
            <button className="primary-btn" onClick={createEntry}>
              New Entry
            </button>
            <button
              className="ghost-btn"
              onClick={async () => {
                await window.api.file.importMarkdown(selectedDate)
                await refreshEntries()
              }}
            >
              Import .md
            </button>
          </div>

          <EntryList
            entries={leftEntries}
            selectedEntryId={selectedEntryId}
            onSelect={(id) => {
              setSelectedEntry(id)
            }}
            onDelete={async (id, bypassConfirmation) => {
              if (!bypassConfirmation) {
                const targetEntry = leftEntries.find((entry) => entry.id === id)
                const label = targetEntry?.title?.trim() ? `"${targetEntry.title.trim()}"` : 'this entry'
                const confirmed = window.confirm(`Delete ${label}? This cannot be undone.`)
                if (!confirmed) {
                  return
                }
              }
              await deleteEntry(id)
            }}
          />
        </aside>

        <main className="right-panel">
          {error ? <div className="error-banner">{error}</div> : null}
          <div className="editor-topbar">
            <div className="text-sm text-[var(--muted-text)]">
              Global vault: {globalEncryption.enabled ? (globalEncryption.unlocked ? 'Unlocked' : 'Locked') : 'Disabled'}
            </div>
            {activeEntry ? (
              <div className="export-actions">
                <button
                  className="export-btn"
                  onClick={() => window.api.file.exportEntry({ id: activeEntry.id, format: 'markdown' })}
                >
                  Export MD
                </button>
                <button
                  className="export-btn"
                  onClick={() => window.api.file.exportEntry({ id: activeEntry.id, format: 'html' })}
                >
                  Export HTML
                </button>
                <button
                  className="export-btn"
                  onClick={() => window.api.file.exportEntry({ id: activeEntry.id, format: 'pdf' })}
                >
                  Export PDF
                </button>
              </div>
            ) : null}
          </div>

          <div className="editor-host">
            <EditorPane
              entry={activeEntry}
              settings={settings}
              isSaving={isSaving}
              onSave={saveEntry}
              onLock={async () => {
                if (activeEntry) {
                  await window.api.journal.lockEntry(activeEntry.id)
                  await setSelectedEntry(activeEntry.id)
                }
              }}
              onUnlock={async (password) => {
                if (activeEntry) {
                  await setSelectedEntry(activeEntry.id, password)
                }
              }}
            />
          </div>
        </main>
      </div>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        themes={themes}
        globalEncryption={globalEncryption}
        onClose={() => setSettingsOpen(false)}
        onSaveSettings={setSettings}
        onSaveTheme={async (theme) => {
          const updated = await window.api.themes.save(theme)
          setThemes(updated)
        }}
        onDeleteTheme={async (id) => {
          const updated = await window.api.themes.delete(id)
          setThemes(updated)
        }}
        onSetGlobalPassword={async (password) => {
          await window.api.security.setGlobalPassword(password)
          await setSettings({ ...settings, globalEncryptionEnabled: true, defaultEncryptionScope: 'global' })
        }}
        onUnlockGlobalPassword={async (password) => {
          await window.api.security.unlockGlobal(password)
          setError(null)
        }}
        onDisableGlobalEncryption={async () => {
          await window.api.security.disableGlobal()
          await setSettings({ ...settings, globalEncryptionEnabled: false, defaultEncryptionScope: 'none' })
        }}
        onBackup={async () => {
          await window.api.file.createBackup()
        }}
      />

      {aboutOpen ? (
        <div className="about-overlay" onClick={() => setAboutOpen(false)}>
          <section
            className="about-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="about-header">
              <h2 id="about-title">About Roznamcha</h2>
              <button
                className="ghost-btn about-close-icon"
                onClick={() => setAboutOpen(false)}
                aria-label="Close About dialog"
                data-tooltip="Close (Esc)"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" />
                </svg>
              </button>
            </div>
            <p className="about-lead">A private writing space, designed for long-form thought and daily clarity.</p>
            <img className="about-logo" src={titleLogo} alt="Roznamcha Logo" draggable={false} />
            <div className="about-tech-strip" aria-label="Technology stack">
              <span>Electron</span>
              <span>React</span>
              <span>TypeScript</span>
              <span>SQLite</span>
              <span>AES-256-GCM</span>
            </div>
            <div className="about-chips" aria-hidden="true">
              <span className="about-chip">Desktop First</span>
              <span className="about-chip">Encrypted Journal</span>
              <span className="about-chip">Local Data</span>
            </div>
            <div className="about-details">
              <div className="about-row">
                <span className="about-label">Name</span>
                <span>{appInfo?.name ?? 'Roznamcha'}</span>
              </div>
              <div className="about-row">
                <span className="about-label">Version</span>
                <span>{appInfo?.version ?? '...'}</span>
              </div>
              <div className="about-row">
                <span className="about-label">License</span>
                <span>{appInfo?.license ?? 'MIT'}</span>
              </div>
              <div className="about-row">
                <span className="about-label">Repository</span>
                <a href={appInfo?.repository ?? 'https://github.com/jeddhor/Roznamcha'} target="_blank" rel="noreferrer">
                  Open GitHub Repository
                </a>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App

import { useEffect, useMemo, useState } from 'react'
import { AppSettings, ThemeConfig } from '../../../shared/models'

function getThemeBadges(theme: ThemeConfig): string[] {
  const id = theme.id.toLowerCase()
  const name = theme.name.toLowerCase()
  const badges: string[] = []

  if (theme.mode === 'dark') badges.push('Dark')
  if (theme.mode === 'pastel') badges.push('Pastel')
  if (theme.mode === 'neon') badges.push('Neon')
  if (theme.mode === 'high-contrast') badges.push('High Contrast')
  if (theme.mode === 'custom') badges.push('Custom')

  if (id.includes('metal') || name.includes('metal')) badges.push('Metallic')
  if (id.includes('gothic') || name.includes('gothic')) badges.push('Gothic')
  if (id.includes('violet') || id.includes('amethyst') || name.includes('violet')) badges.push('Purple')
  if (id.includes('sapphire') || name.includes('blue')) badges.push('Blue')
  if (id.includes('crimson') || name.includes('crimson')) badges.push('Red')

  return Array.from(new Set(badges)).slice(0, 3)
}

interface SettingsPanelProps {
  open: boolean
  settings: AppSettings
  themes: ThemeConfig[]
  globalEncryption: { enabled: boolean; unlocked: boolean }
  onClose: () => void
  onSaveSettings: (settings: AppSettings) => Promise<void>
  onSaveTheme: (theme: ThemeConfig) => Promise<void>
  onDeleteTheme: (id: string) => Promise<void>
  onSetGlobalPassword: (password: string) => Promise<void>
  onUnlockGlobalPassword: (password: string) => Promise<void>
  onDisableGlobalEncryption: () => Promise<void>
  onBackup: () => Promise<void>
}

export function SettingsPanel({
  open,
  settings,
  themes,
  globalEncryption,
  onClose,
  onSaveSettings,
  onSaveTheme,
  onDeleteTheme,
  onSetGlobalPassword,
  onUnlockGlobalPassword,
  onDisableGlobalEncryption,
  onBackup
}: SettingsPanelProps): React.JSX.Element | null {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings)
  const [passwordInput, setPasswordInput] = useState('')
  const [themeName, setThemeName] = useState('My Custom Theme')
  const [fontSearch, setFontSearch] = useState('')
  const [availableFonts, setAvailableFonts] = useState<string[]>([])

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  useEffect(() => {
    let mounted = true

    const loadFonts = async (): Promise<void> => {
      const fonts = await window.api.system.listFonts()
      if (!mounted) {
        return
      }
      setAvailableFonts(fonts)
    }

    loadFonts()

    return () => {
      mounted = false
    }
  }, [])

  const activeTheme = useMemo(
    () => themes.find((theme) => theme.id === localSettings.activeThemeId) ?? themes[0],
    [themes, localSettings.activeThemeId]
  )

  const filteredFonts = useMemo(() => {
    const query = fontSearch.trim().toLowerCase()
    if (!query) {
      return availableFonts.slice(0, 120)
    }
    return availableFonts.filter((font) => font.toLowerCase().includes(query)).slice(0, 120)
  }, [availableFonts, fontSearch])

  if (!open) {
    return null
  }

  return (
    <aside className="settings-panel">
      <div className="settings-header">
        <h2 className="text-xl font-semibold">Settings</h2>
        <button className="ghost-btn panel-close-icon" onClick={onClose} aria-label="Close settings">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" />
          </svg>
        </button>
      </div>

      <section className="settings-section">
        <h3>Theme</h3>
        {activeTheme ? (
          <div className="theme-badge-row" aria-label="Selected theme tags">
            {getThemeBadges(activeTheme).map((badge) => (
              <span key={badge} className="theme-badge">
                {badge}
              </span>
            ))}
          </div>
        ) : null}
        <select
          className="field"
          value={localSettings.activeThemeId}
          onChange={(event) => setLocalSettings({ ...localSettings, activeThemeId: event.target.value })}
        >
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>

        {activeTheme ? (
          <div className="settings-color-grid">
            {Object.entries(activeTheme.colors).map(([key, value]) => (
              <label key={key} className="color-field">
                <span>{key}</span>
                <input
                  type="color"
                  value={value}
                  onChange={(event) => {
                    const updated: ThemeConfig = {
                      ...activeTheme,
                      colors: {
                        ...activeTheme.colors,
                        [key]: event.target.value
                      }
                    }
                    onSaveTheme(updated)
                  }}
                />
              </label>
            ))}
          </div>
        ) : null}

        <div className="settings-action-row">
          <input
            className="field"
            value={themeName}
            onChange={(event) => setThemeName(event.target.value)}
            placeholder="Custom theme name"
          />
          <button
            className="primary-btn"
            onClick={() => {
              if (!activeTheme) return
              onSaveTheme({ ...activeTheme, id: `custom-${crypto.randomUUID()}`, name: themeName, mode: 'custom' })
            }}
          >
            Save As Custom
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Editor</h3>
        <label className="field-row">
          Font family
          <input
            className="field"
            placeholder="Filter fonts"
            value={fontSearch}
            onChange={(event) => setFontSearch(event.target.value)}
          />
          <select
            className="field font-select"
            size={Math.min(8, Math.max(4, filteredFonts.length || 4))}
            value={localSettings.fontFamily}
            onChange={(event) => setLocalSettings({ ...localSettings, fontFamily: event.target.value })}
          >
            {filteredFonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <div className="font-preview" style={{ fontFamily: localSettings.fontFamily }}>
            The quick brown fox jumps over the lazy dog
          </div>
        </label>
        <label className="field-row">
          Font size
          <input
            className="field"
            type="number"
            min={12}
            max={30}
            value={localSettings.fontSize}
            onChange={(event) => setLocalSettings({ ...localSettings, fontSize: Number(event.target.value) })}
          />
        </label>
        <label className="field-row">
          Auto-save interval (seconds)
          <input
            className="field"
            type="number"
            min={2}
            max={90}
            value={localSettings.autoSaveSeconds}
            onChange={(event) =>
              setLocalSettings({ ...localSettings, autoSaveSeconds: Number(event.target.value) })
            }
          />
        </label>
      </section>

      <section className="settings-section">
        <h3>LLM</h3>
        <label className="field-row">
          Provider
          <select
            className="field"
            value={localSettings.llmProvider}
            onChange={(event) =>
              setLocalSettings({
                ...localSettings,
                llmProvider: event.target.value as AppSettings['llmProvider']
              })
            }
          >
            <option value="ollama">Ollama</option>
            <option value="openai-compatible">OpenAI API Compatible</option>
          </select>
        </label>
        <label className="field-row">
          Base URL
          <input
            className="field"
            value={localSettings.llmBaseUrl}
            placeholder={localSettings.llmProvider === 'ollama' ? 'http://127.0.0.1:11434' : 'http://localhost:8000'}
            onChange={(event) => setLocalSettings({ ...localSettings, llmBaseUrl: event.target.value })}
          />
        </label>
        <label className="field-row">
          Model
          <input
            className="field"
            value={localSettings.llmModel}
            placeholder="llama3.1"
            onChange={(event) => setLocalSettings({ ...localSettings, llmModel: event.target.value })}
          />
        </label>
        <label className="field-row">
          Context window (tokens)
          <input
            className="field"
            type="number"
            min={256}
            max={65536}
            step={256}
            value={localSettings.llmContextWindow}
            onChange={(event) => setLocalSettings({ ...localSettings, llmContextWindow: Number(event.target.value) })}
          />
        </label>
        <label className="field-row">
          API key (for OpenAI-compatible)
          <input
            className="field"
            type="password"
            value={localSettings.llmApiKey}
            placeholder="Optional for local servers"
            onChange={(event) => setLocalSettings({ ...localSettings, llmApiKey: event.target.value })}
          />
        </label>
      </section>

      <section className="settings-section">
        <h3>Encryption</h3>
        <p className="text-sm text-[var(--muted-text)]">
          Global encryption is {globalEncryption.enabled ? 'enabled' : 'disabled'} and{' '}
          {globalEncryption.unlocked ? 'unlocked' : 'locked'}.
        </p>
        <input
          className="field"
          type="password"
          placeholder="Global password"
          value={passwordInput}
          onChange={(event) => setPasswordInput(event.target.value)}
        />
        <div className="settings-action-row wrap">
          <button className="primary-btn" onClick={() => onSetGlobalPassword(passwordInput)}>
            Set Password
          </button>
          <button className="ghost-btn" onClick={() => onUnlockGlobalPassword(passwordInput)}>
            Unlock
          </button>
          <button className="ghost-btn" onClick={onDisableGlobalEncryption}>
            Disable Global Encryption
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Backup & Export</h3>
        <button className="primary-btn" onClick={onBackup}>
          Create Database Backup
        </button>
      </section>

      <div className="settings-footer-actions">
        <button className="primary-btn" onClick={() => onSaveSettings(localSettings)}>
          Save Settings
        </button>
        <button
          className="ghost-btn"
          onClick={() => {
            const customThemes = themes.filter((theme) => theme.id.startsWith('custom-'))
            const last = customThemes[customThemes.length - 1]
            if (last) {
              onDeleteTheme(last.id)
            }
          }}
        >
          Delete Last Custom Theme
        </button>
      </div>
    </aside>
  )
}

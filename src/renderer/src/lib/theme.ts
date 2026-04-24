import { ThemeConfig } from '../../../shared/models'

export function applyTheme(theme: ThemeConfig, fontFamily: string, fontSize: number): void {
  const root = document.documentElement
  const { colors } = theme

  root.style.setProperty('--bg', colors.background)
  root.style.setProperty('--surface', colors.surface)
  root.style.setProperty('--panel', colors.panel)
  root.style.setProperty('--text', colors.text)
  root.style.setProperty('--muted-text', colors.mutedText)
  root.style.setProperty('--accent', colors.accent)
  root.style.setProperty('--accent-soft', colors.accentSoft)
  root.style.setProperty('--border', colors.border)
  root.style.setProperty('--danger', colors.danger)
  root.style.setProperty('--app-font', fontFamily)
  root.style.setProperty('--editor-font-size', `${fontSize}px`)
}

import fontList from 'font-list'

const FALLBACK_FONTS = [
  'Segoe UI',
  'Arial',
  'Helvetica',
  'Tahoma',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Trebuchet MS',
  'Roboto',
  'Noto Sans',
  'Inter'
]

function normalizeFontName(font: string): string {
  return font.replace(/^['"]+|['"]+$/g, '').trim()
}

export async function listSystemFonts(): Promise<string[]> {
  try {
    const fonts = await fontList.getFonts({ disableQuoting: true })
    const unique = Array.from(new Set(fonts.map(normalizeFontName).filter(Boolean)))
    return unique.sort((a, b) => a.localeCompare(b))
  } catch {
    return FALLBACK_FONTS
  }
}

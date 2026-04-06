type LocaleField = {
  en?: string
  ko?: string
  ja?: string
  zh?: string
  th?: string
  vi?: string
  [key: string]: string | undefined
}

export function localise(field: LocaleField | undefined, lang: string): string {
  if (!field) return ''
  return field[lang] || field['en'] || ''
}

export function localiseBlock(field: any, lang: string): any[] {
  if (!field) return []
  return field[lang] || field['en'] || []
}

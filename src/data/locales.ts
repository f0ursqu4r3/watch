export type Dir = 'ltr' | 'rtl'

export interface Language {
  code: string      // app/i18n locale key
  endonym: string   // name in its own language
  tmdb: string      // TMDB `language` param, e.g. 'es-ES'
  dir: Dir
}

export interface Region {
  code: string      // ISO 3166-1, TMDB `watch_region`
  nameKey: string   // i18n key under "regions"
  flag: string      // emoji flag
}

export const LANGUAGES: Language[] = [
  { code: 'en', endonym: 'English',  tmdb: 'en-US', dir: 'ltr' },
  { code: 'es', endonym: 'Español',  tmdb: 'es-ES', dir: 'ltr' },
  { code: 'fr', endonym: 'Français', tmdb: 'fr-FR', dir: 'ltr' },
  { code: 'de', endonym: 'Deutsch',  tmdb: 'de-DE', dir: 'ltr' },
  { code: 'ja', endonym: '日本語',    tmdb: 'ja-JP', dir: 'ltr' },
  { code: 'ar', endonym: 'العربية',  tmdb: 'ar-SA', dir: 'rtl' },
]

export const SUPPORTED_LANG_CODES = LANGUAGES.map(l => l.code)

export const REGIONS: Region[] = [
  { code: 'US', nameKey: 'regions.US', flag: '🇺🇸' },
  { code: 'GB', nameKey: 'regions.GB', flag: '🇬🇧' },
  { code: 'ES', nameKey: 'regions.ES', flag: '🇪🇸' },
  { code: 'FR', nameKey: 'regions.FR', flag: '🇫🇷' },
  { code: 'DE', nameKey: 'regions.DE', flag: '🇩🇪' },
  { code: 'JP', nameKey: 'regions.JP', flag: '🇯🇵' },
  { code: 'MX', nameKey: 'regions.MX', flag: '🇲🇽' },
  { code: 'BR', nameKey: 'regions.BR', flag: '🇧🇷' },
  { code: 'CA', nameKey: 'regions.CA', flag: '🇨🇦' },
  { code: 'AU', nameKey: 'regions.AU', flag: '🇦🇺' },
  { code: 'IN', nameKey: 'regions.IN', flag: '🇮🇳' },
  { code: 'SA', nameKey: 'regions.SA', flag: '🇸🇦' },
]

export const SUPPORTED_REGION_CODES = REGIONS.map(r => r.code)

const LANG_DEFAULT_REGION: Record<string, string> = {
  en: 'US', es: 'ES', fr: 'FR', de: 'DE', ja: 'JP', ar: 'SA',
}

export function defaultRegionFor(langCode: string): string {
  return LANG_DEFAULT_REGION[langCode] ?? 'US'
}

export function langByCode(code: string): Language {
  return LANGUAGES.find(l => l.code === code) ?? LANGUAGES[0]!
}

import { ref, computed } from 'vue'
import {
  SUPPORTED_LANG_CODES, SUPPORTED_REGION_CODES, defaultRegionFor, langByCode,
} from '../data/locales'
import { setI18nLanguage } from '../i18n'

const LANG_KEY = 'watch:language'
const REGION_KEY = 'watch:region'

const language = ref<string>('en')
const region = ref<string>('US')

export function detectLanguage(browserLangs: readonly string[]): string {
  for (const tag of browserLangs) {
    const base = tag.toLowerCase().split('-')[0]!
    if (SUPPORTED_LANG_CODES.includes(base)) return base
  }
  return 'en'
}

export function detectRegion(browserLangs: readonly string[], langCode: string): string {
  for (const tag of browserLangs) {
    const parts = tag.split('-')
    const sub = parts[1]?.toUpperCase()
    if (sub && SUPPORTED_REGION_CODES.includes(sub)) return sub
  }
  return defaultRegionFor(langCode)
}

function applySideEffects() {
  const lang = langByCode(language.value)
  setI18nLanguage(language.value)
  document.documentElement.setAttribute('lang', language.value)
  document.documentElement.setAttribute('dir', lang.dir)
}

/** Run once at app startup (main.ts). Reads localStorage, else detects from the browser. */
export function initLocale(browserLangs: readonly string[] = navigator.languages ?? [navigator.language]) {
  const savedLang = localStorage.getItem(LANG_KEY)
  const savedRegion = localStorage.getItem(REGION_KEY)

  language.value = savedLang && SUPPORTED_LANG_CODES.includes(savedLang)
    ? savedLang
    : detectLanguage(browserLangs)

  region.value = savedRegion && SUPPORTED_REGION_CODES.includes(savedRegion)
    ? savedRegion
    : detectRegion(browserLangs, language.value)

  localStorage.setItem(LANG_KEY, language.value)
  localStorage.setItem(REGION_KEY, region.value)
  applySideEffects()
}

export function useLocale() {
  const tmdbLang = computed(() => langByCode(language.value).tmdb)
  const dir = computed(() => langByCode(language.value).dir)

  function setLanguage(code: string) {
    if (!SUPPORTED_LANG_CODES.includes(code)) return
    language.value = code
    localStorage.setItem(LANG_KEY, code)
    applySideEffects()
  }

  function setRegion(code: string) {
    if (!SUPPORTED_REGION_CODES.includes(code)) return
    region.value = code
    localStorage.setItem(REGION_KEY, code)
  }

  return { language, region, tmdbLang, dir, setLanguage, setRegion }
}

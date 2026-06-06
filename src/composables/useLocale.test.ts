import { describe, it, expect, beforeEach } from 'vitest'
import { detectLanguage, detectRegion, initLocale, useLocale } from './useLocale'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('lang')
  document.documentElement.removeAttribute('dir')
})

describe('detectLanguage', () => {
  it('matches a supported language from browser list', () => {
    expect(detectLanguage(['es-MX', 'es', 'en'])).toBe('es')
  })
  it('falls back to en when none supported', () => {
    expect(detectLanguage(['zz-ZZ'])).toBe('en')
  })
})

describe('detectRegion', () => {
  it('uses a supported region subtag when present', () => {
    expect(detectRegion(['es-MX'], 'es')).toBe('MX')
  })
  it('falls back to the language default when subtag unsupported', () => {
    expect(detectRegion(['es'], 'es')).toBe('ES')
  })
})

describe('initLocale + useLocale', () => {
  it('persists detected values and sets html lang/dir', () => {
    initLocale(['ar-SA'])
    const { language, region, dir } = useLocale()
    expect(language.value).toBe('ar')
    expect(region.value).toBe('SA')
    expect(dir.value).toBe('rtl')
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(document.documentElement.getAttribute('lang')).toBe('ar')
    expect(localStorage.getItem('watch:language')).toBe('ar')
    expect(localStorage.getItem('watch:region')).toBe('SA')
  })

  it('restores persisted values over browser detection', () => {
    localStorage.setItem('watch:language', 'de')
    localStorage.setItem('watch:region', 'GB')
    initLocale(['ja-JP'])
    const { language, region } = useLocale()
    expect(language.value).toBe('de')
    expect(region.value).toBe('GB')
  })

  it('setLanguage updates tmdbLang and dir', () => {
    initLocale(['en-US'])
    const { setLanguage, tmdbLang, dir } = useLocale()
    setLanguage('ja')
    expect(tmdbLang.value).toBe('ja-JP')
    expect(dir.value).toBe('ltr')
    expect(localStorage.getItem('watch:language')).toBe('ja')
  })

  it('setRegion persists and updates region', () => {
    initLocale(['en-US'])
    const { setRegion, region } = useLocale()
    setRegion('JP')
    expect(region.value).toBe('JP')
    expect(localStorage.getItem('watch:region')).toBe('JP')
  })
})

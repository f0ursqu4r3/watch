import { describe, it, expect } from 'vitest'
import { LANGUAGES, REGIONS, defaultRegionFor, SUPPORTED_LANG_CODES } from './locales'

describe('locale data', () => {
  it('exposes the six supported languages with required fields', () => {
    expect(SUPPORTED_LANG_CODES).toEqual(['en', 'es', 'fr', 'de', 'ja', 'ar'])
    for (const l of LANGUAGES) {
      expect(l.code).toBeTruthy()
      expect(l.endonym).toBeTruthy()
      expect(l.tmdb).toMatch(/^[a-z]{2}-[A-Z]{2}$/)
      expect(['ltr', 'rtl']).toContain(l.dir)
    }
  })

  it('marks Arabic as rtl and others ltr', () => {
    expect(LANGUAGES.find(l => l.code === 'ar')!.dir).toBe('rtl')
    expect(LANGUAGES.find(l => l.code === 'en')!.dir).toBe('ltr')
  })

  it('lists twelve regions with flags', () => {
    expect(REGIONS).toHaveLength(12)
    expect(REGIONS.map(r => r.code)).toContain('US')
    for (const r of REGIONS) expect(r.flag).toBeTruthy()
  })

  it('maps each language to a sensible default region', () => {
    expect(defaultRegionFor('es')).toBe('ES')
    expect(defaultRegionFor('ja')).toBe('JP')
    expect(defaultRegionFor('ar')).toBe('SA')
    expect(defaultRegionFor('en')).toBe('US')
    expect(defaultRegionFor('zz')).toBe('US') // unknown → fallback
  })
})

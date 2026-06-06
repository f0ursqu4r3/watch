import { describe, it, expect } from 'vitest'
import { i18n, setI18nLanguage } from './i18n'

describe('i18n instance', () => {
  it('defaults to en and translates a known key', () => {
    expect(i18n.global.t('nav.discover')).toBe('Discover')
  })

  it('switches active locale', () => {
    setI18nLanguage('es')
    expect(i18n.global.locale.value).toBe('es')
    expect(i18n.global.t('nav.discover')).not.toBe('')
    setI18nLanguage('en')
  })

  it('falls back to en for a missing key in another locale', () => {
    setI18nLanguage('ja')
    expect(i18n.global.t('common.loading')).toBeTruthy()
    setI18nLanguage('en')
  })

  // Guards against the dot-in-key trap: vue-i18n treats '.' as a path separator,
  // so TMDB sort values (e.g. 'popularity.desc') are looked up with dots replaced
  // by underscores. Each must resolve to a real label, not echo the key path back.
  it('resolves every sort label key (no dot-path lookup misses)', () => {
    const SORT_VALUES = [
      'popularity.desc',
      'runtime.asc',
      'runtime.desc',
      'vote_average.desc',
      'primary_release_date.desc',
      'primary_release_date.asc',
      'revenue.desc',
    ]
    for (const lang of ['en', 'es', 'fr', 'de', 'ja', 'ar']) {
      setI18nLanguage(lang)
      for (const value of SORT_VALUES) {
        const key = 'sort.' + value.replace(/\./g, '_')
        const label = i18n.global.t(key)
        expect(label, `${lang}:${key}`).toBeTruthy()
        expect(label, `${lang}:${key} echoed the key`).not.toBe(key)
      }
    }
    setI18nLanguage('en')
  })
})

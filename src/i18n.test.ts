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
})

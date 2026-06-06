import { describe, it, expect } from 'vitest'
import { fmtRuntimeFor, fmtClockFor, localizeDigits } from './useFormat'

describe('formatting helpers', () => {
  it('formats runtime in hours and minutes', () => {
    expect(fmtRuntimeFor(135, 'en')).toBe('2h 15m')
    expect(fmtRuntimeFor(45, 'en')).toBe('45m')
  })

  it('formats clock time for a locale', () => {
    const t = fmtClockFor(new Date('2026-06-05T14:30:00').getTime(), 'en')
    expect(t).toMatch(/2:30|14:30/) // 12h or 24h depending on env
  })

  it('localizes digits to Arabic-Indic for ar', () => {
    expect(localizeDigits('1:05', 'ar')).toBe('١:٠٥')
    expect(localizeDigits('1:05', 'en')).toBe('1:05')
  })
})

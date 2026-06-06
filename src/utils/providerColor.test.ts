import { describe, it, expect } from 'vitest'
import { providerColor } from './providerColor'

describe('providerColor', () => {
  it('returns the brand color for a known provider id', () => {
    expect(providerColor(8)).toBe('#E50914')   // Netflix
    expect(providerColor(337)).toBe('#1133A6')  // Disney+
  })

  it('returns a deterministic hsl for unknown ids', () => {
    const a = providerColor(99999)
    const b = providerColor(99999)
    expect(a).toBe(b)
    expect(a).toMatch(/^hsl\(\d+(\.\d+)?, \d+%, \d+%\)$/)
  })

  it('gives different unknown ids different hues (usually)', () => {
    expect(providerColor(12345)).not.toBe(providerColor(54321))
  })
})

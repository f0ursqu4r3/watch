import { describe, it, expect } from 'vitest'
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import de from './de.json'
import ja from './ja.json'
import ar from './ar.json'

const catalogs: Record<string, any> = { es, fr, de, ja, ar }

function flatten(obj: any, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') Object.assign(out, flatten(v, key))
    else out[key] = String(v)
  }
  return out
}

const enFlat = flatten(en)
const enKeys = Object.keys(enFlat).sort()
const PLACEHOLDER_RE = /\{[a-zA-Z]+\}/g

describe('locale catalogs', () => {
  for (const [lang, cat] of Object.entries(catalogs)) {
    const flat = flatten(cat)

    it(`${lang} has exactly the same keys as en`, () => {
      expect(Object.keys(flat).sort()).toEqual(enKeys)
    })

    it(`${lang} has no empty values`, () => {
      for (const [k, v] of Object.entries(flat)) {
        expect(v.trim(), `empty value for ${lang}.${k}`).not.toBe('')
      }
    })

    it(`${lang} preserves interpolation placeholders`, () => {
      for (const key of enKeys) {
        const enPh = (enFlat[key]!.match(PLACEHOLDER_RE) ?? []).sort()
        const langPh = ((flat[key] ?? '').match(PLACEHOLDER_RE) ?? []).sort()
        expect(langPh, `placeholders mismatch for ${lang}.${key}`).toEqual(enPh)
      }
    })
  }
})

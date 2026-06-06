# Regionalization + i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `watch.` fully localized — UI strings in 6 languages (en/es/fr/de/ja + RTL ar), with TMDB data (titles, overviews, genres, providers, certifications) scoped to the user's language and region, language and region chosen independently with browser auto-detect and a persisted manual override.

**Architecture:** Add `vue-i18n` for UI strings (locale JSON catalogs, `en` fallback). A `useLocale` composable owns reactive `language` + `region`, auto-detects from the browser, persists to localStorage, and drives `<html lang>`/`dir` and the active i18n locale. A `useTmdb` helper injects `language` + `watch_region` into every TMDB request. Providers and genres become dynamic per-region/per-language fetches; provider glow colors come from a brand-map-plus-hash util. A `useFormat` composable centralizes locale-aware runtime/time/number/countdown formatting. A `LocaleSwitcher` component adds the two pickers.

**Tech Stack:** Vue 3 (`<script setup>`, Composition API), TypeScript, Tailwind CSS v4, Vite, `vue-i18n` v11, Vitest + `@vue/test-utils` + jsdom (new), TMDB API.

---

## File Structure

**Create:**
- `src/i18n.ts` — vue-i18n instance, registers catalogs, `fallbackLocale: 'en'`.
- `src/locales/en.json` — English catalog (source of truth / fallback).
- `src/locales/es.json`, `fr.json`, `de.json`, `ja.json`, `ar.json` — translated catalogs.
- `src/data/locales.ts` — supported languages (code, endonym, TMDB lang, `dir`), supported regions (code, name key, flag), and language→default-region map.
- `src/composables/useLocale.ts` — reactive `language`/`region`, detect, persist, `tmdbLang`, `dir`, setters, side effects.
- `src/composables/useTmdb.ts` — `tmdb(path, params)` fetch helper injecting `language` + `watch_region`.
- `src/composables/useFormat.ts` — locale-aware `runtime`, `clockTime`, `rating`, `year`, `countdown`, `integer` (with Arabic-Indic digits).
- `src/utils/providerColor.ts` — `providerColor(id)` (brand map + hash→HSL).
- `src/components/LocaleSwitcher.vue` — language + region pickers.
- `vitest.config.ts` — test config (jsdom env).
- `*.test.ts` files co-located with the units they test.

**Modify:**
- `src/main.ts` — install i18n, run first-load locale init.
- `src/App.vue` — dynamic providers + genres, `useTmdb`, `t()` strings, `useFormat`, mount `LocaleSwitcher`.
- `src/components/MovieCard.vue` — `t()` strings, `useFormat`.
- `src/components/MovieModal.vue` — `t()` strings, `useFormat`, region-based certification + providers.
- `src/data/moods.ts` — drop English `label`, keep ids/data.
- `package.json` — deps + `test` script.

---

## Translation Authoring Note (read before Task 3)

`en.json` (Task 2) is the **contract**: it defines every key. The other five catalogs
(`es/fr/de/ja/ar`) must contain the **same key set** with **native-quality translations** of
every value — no English left in them, no missing keys. This is generation work for the executor,
gated by the key-parity + non-empty test in Task 2. The plan shows the full `en.json` and
representative translated entries per language to set the quality bar; the executor fills the rest
so the parity test passes. Interpolation placeholders (`{count}`, `{time}`, `{runtime}`, `{name}`,
`{character}`) MUST be preserved verbatim in every language.

---

## Task 1: Install dependencies and test harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/utils/__smoke__.test.ts` (temporary, deleted in Step 5)

- [ ] **Step 1: Install runtime + dev dependencies**

Run:
```bash
bun add vue-i18n@^11
bun add -d vitest@^3 @vue/test-utils@^2 jsdom@^25
```
Expected: `package.json` gains `vue-i18n` under dependencies and the three under devDependencies; `bun.lock` updates.

- [ ] **Step 2: Add the test script**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Add a smoke test to prove the runner works**

Create `src/utils/__smoke__.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `bun run test`
Expected: PASS, 1 test passed.

- [ ] **Step 5: Delete the smoke test and commit**

```bash
rm src/utils/__smoke__.test.ts
git add package.json bun.lock vitest.config.ts
git commit -m "chore: add vue-i18n and vitest test harness"
```

---

## Task 2: English catalog + key-parity test + stub catalogs

**Files:**
- Create: `src/locales/en.json`
- Create: `src/locales/es.json`, `fr.json`, `de.json`, `ja.json`, `ar.json`
- Create: `src/locales/parity.test.ts`

- [ ] **Step 1: Write the key-parity + non-empty test (failing)**

Create `src/locales/parity.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/locales/parity.test.ts`
Expected: FAIL — cannot resolve `./en.json` (files not created yet).

- [ ] **Step 3: Create `src/locales/en.json` (the full contract)**

```json
{
  "header": {
    "eyebrow": "What fits {timeOfDay}",
    "timeOfDay": {
      "morning": "this morning",
      "afternoon": "this afternoon",
      "evening": "tonight"
    },
    "titleLine1": "Set your window.",
    "titleAccent": "We'll find what fits.",
    "subtitle": "Pick a platform, set your start and end time, and only see movies you can actually finish."
  },
  "nav": {
    "discover": "Discover",
    "myList": "My List",
    "watched": "Watched"
  },
  "controls": {
    "myServices": "My services",
    "startAt": "Start at",
    "now": "Now",
    "doneBy": "Done by",
    "anyTime": "Any time",
    "maxRuntime": "{runtime} max runtime",
    "sortBy": "Sort by"
  },
  "browse": {
    "mood": "Mood",
    "genre": "Genre"
  },
  "sort": {
    "popularity.desc": "Most Popular",
    "runtime.asc": "Shortest First",
    "runtime.desc": "Longest First",
    "vote_average.desc": "Highest Rated",
    "primary_release_date.desc": "Newest",
    "primary_release_date.asc": "Oldest",
    "revenue.desc": "Highest Grossing"
  },
  "filters": {
    "hiddenGems": "Hidden Gems",
    "expiringFirst": "Expiring first"
  },
  "person": {
    "showingFilmsWith": "Showing films with",
    "clearAria": "Clear person filter"
  },
  "empty": {
    "choosePlatform": "Choose a platform above to explore"
  },
  "results": {
    "finishingBefore": "movies finishing before {time}",
    "tooLong": "({count} too long)",
    "nothingFits": "Nothing fits that window. Try a later time."
  },
  "myList": {
    "emptyTitle": "Nothing saved yet",
    "emptyBody": "Tap the bookmark on any movie to start building your list"
  },
  "watched": {
    "statLabel": "Watched",
    "emptyTitle": "Nothing watched yet",
    "emptyBody": "Rate a movie to start tracking what you've seen"
  },
  "moods": {
    "make-me-laugh": "Make Me Laugh",
    "edge-of-my-seat": "Edge of My Seat",
    "feel-good": "Feel-Good",
    "mind-bending": "Mind-Bending",
    "dark-and-twisted": "Dark & Twisted",
    "comfort-watch": "Comfort Watch",
    "background-noise": "Background Noise",
    "cry-it-out": "Cry It Out"
  },
  "card": {
    "noRuntime": "No runtime"
  },
  "modal": {
    "close": "Close",
    "startWithin": "Start within",
    "addToMyList": "Add to My List",
    "inMyList": "In My List",
    "markWatched": "Mark Watched",
    "watched": "Watched",
    "directedBy": "Directed by",
    "as": "as {character}",
    "watchTrailer": "Watch Trailer",
    "runtime": "Runtime",
    "start": "Start",
    "doneBy": "Done by"
  },
  "rating": {
    "prompt": "How was it?",
    "dialogAria": "Rate this movie",
    "awful": "Awful",
    "meh": "Meh",
    "good": "Good",
    "loved": "Loved it"
  },
  "locale": {
    "language": "Language",
    "region": "Region"
  },
  "regions": {
    "US": "United States",
    "GB": "United Kingdom",
    "ES": "Spain",
    "FR": "France",
    "DE": "Germany",
    "JP": "Japan",
    "MX": "Mexico",
    "BR": "Brazil",
    "CA": "Canada",
    "AU": "Australia",
    "IN": "India",
    "SA": "Saudi Arabia"
  },
  "common": {
    "loading": "Loading"
  }
}
```

- [ ] **Step 4: Create the five translated catalogs**

Create `es.json`, `fr.json`, `de.json`, `ja.json`, `ar.json`, each with the **identical key
structure** of `en.json` and every value translated to that language (see Translation Authoring
Note). Preserve `{timeOfDay}`, `{runtime}`, `{time}`, `{count}`, `{character}` exactly.

Quality-bar examples (the executor produces the complete files):

`es.json` excerpt:
```json
{
  "header": { "titleLine1": "Define tu ventana.", "titleAccent": "Encontraremos lo que encaja." },
  "nav": { "discover": "Descubrir", "myList": "Mi lista", "watched": "Vistas" },
  "controls": { "maxRuntime": "{runtime} de duración máx." },
  "results": { "tooLong": "({count} demasiado largas)" }
}
```

`ja.json` excerpt:
```json
{
  "header": { "titleLine1": "時間を決めよう。", "titleAccent": "ぴったりの作品を見つけます。" },
  "nav": { "discover": "見つける", "myList": "マイリスト", "watched": "視聴済み" },
  "controls": { "maxRuntime": "最長 {runtime}" },
  "results": { "finishingBefore": "{time} までに見終わる映画" }
}
```

`ar.json` excerpt (RTL — text is right-to-left, placeholders stay as `{...}`):
```json
{
  "header": { "titleLine1": "حدّد نافذتك الزمنية.", "titleAccent": "سنجد ما يناسبك." },
  "nav": { "discover": "اكتشف", "myList": "قائمتي", "watched": "تمت المشاهدة" },
  "controls": { "maxRuntime": "{runtime} كحد أقصى للمدة" },
  "results": { "tooLong": "({count} طويلة جدًا)" }
}
```

- [ ] **Step 5: Run the parity test to verify it passes**

Run: `bun run test src/locales/parity.test.ts`
Expected: PASS — all locales have identical keys, no empty values, placeholders preserved.

- [ ] **Step 6: Commit**

```bash
git add src/locales
git commit -m "feat(i18n): add en/es/fr/de/ja/ar locale catalogs with parity test"
```

---

## Task 3: Locale data definitions

**Files:**
- Create: `src/data/locales.ts`
- Create: `src/data/locales.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/data/locales.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/data/locales.test.ts`
Expected: FAIL — cannot resolve `./locales`.

- [ ] **Step 3: Implement `src/data/locales.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test src/data/locales.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/locales.ts src/data/locales.test.ts
git commit -m "feat(i18n): add supported language and region definitions"
```

---

## Task 4: i18n instance

**Files:**
- Create: `src/i18n.ts`
- Create: `src/i18n.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/i18n.test.ts`:
```ts
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
    // a key guaranteed present in en; ja must resolve (either translated or fallback)
    expect(i18n.global.t('common.loading')).toBeTruthy()
    setI18nLanguage('en')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/i18n.test.ts`
Expected: FAIL — cannot resolve `./i18n`.

- [ ] **Step 3: Implement `src/i18n.ts`**

```ts
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import ja from './locales/ja.json'
import ar from './locales/ar.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, es, fr, de, ja, ar },
})

export function setI18nLanguage(code: string) {
  i18n.global.locale.value = code as 'en'
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test src/i18n.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n.ts src/i18n.test.ts
git commit -m "feat(i18n): add vue-i18n instance with en fallback"
```

---

## Task 5: useLocale composable

**Files:**
- Create: `src/composables/useLocale.ts`
- Create: `src/composables/useLocale.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/composables/useLocale.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/composables/useLocale.test.ts`
Expected: FAIL — cannot resolve `./useLocale`.

- [ ] **Step 3: Implement `src/composables/useLocale.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test src/composables/useLocale.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useLocale.ts src/composables/useLocale.test.ts
git commit -m "feat(i18n): add useLocale composable with detect and persist"
```

---

## Task 6: Install i18n + init locale in main.ts

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Update `src/main.ts`**

Replace the entire file with:
```ts
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { i18n } from './i18n'
import { initLocale } from './composables/useLocale'

initLocale()
createApp(App).use(i18n).mount('#app')
```

- [ ] **Step 2: Verify the app builds and boots**

Run: `bun run build`
Expected: build completes with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(i18n): install vue-i18n and init locale at startup"
```

---

## Task 7: providerColor utility

**Files:**
- Create: `src/utils/providerColor.ts`
- Create: `src/utils/providerColor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/providerColor.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/utils/providerColor.test.ts`
Expected: FAIL — cannot resolve `./providerColor`.

- [ ] **Step 3: Implement `src/utils/providerColor.ts`**

```ts
// TMDB provider_id -> brand color for global majors. Anything else gets a hashed hue.
const BRAND: Record<number, string> = {
  8: '#E50914',    // Netflix
  9: '#00A8E1',    // Prime Video
  337: '#1133A6',  // Disney+
  384: '#5822B4',  // HBO Max / Max
  1899: '#5822B4', // Max (newer id)
  15: '#1CE783',   // Hulu
  386: '#FFD700',  // Peacock
  531: '#0064FF',  // Paramount+
  283: '#F47521',  // Crunchyroll
  2: '#000000',    // Apple TV
  350: '#1B1D1F',  // Apple TV+
}

function hashToHsl(id: number): string {
  // Stable hue from id; fixed saturation/lightness tuned to the neon glow palette.
  let h = id * 2654435761 // Knuth multiplicative hash
  h = (h ^ (h >>> 15)) >>> 0
  const hue = h % 360
  return `hsl(${hue}, 70%, 55%)`
}

export function providerColor(id: number): string {
  return BRAND[id] ?? hashToHsl(id)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test src/utils/providerColor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/providerColor.ts src/utils/providerColor.test.ts
git commit -m "feat: add providerColor brand-map-plus-hash utility"
```

---

## Task 8: useTmdb fetch helper

**Files:**
- Create: `src/composables/useTmdb.ts`
- Create: `src/composables/useTmdb.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/composables/useTmdb.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { buildTmdbUrl } from './useTmdb'

beforeEach(() => {
  localStorage.clear()
})

describe('buildTmdbUrl', () => {
  it('injects language on every request', () => {
    const url = buildTmdbUrl('/movie/123', {}, 'es-ES', 'ES')
    expect(url).toContain('https://api.themoviedb.org/3/movie/123')
    expect(url).toContain('language=es-ES')
  })

  it('injects watch_region only when requested', () => {
    const withRegion = buildTmdbUrl('/discover/movie', { watchRegion: true }, 'en-US', 'JP')
    expect(withRegion).toContain('watch_region=JP')
    const without = buildTmdbUrl('/movie/123', {}, 'en-US', 'JP')
    expect(without).not.toContain('watch_region')
  })

  it('preserves caller-supplied query params', () => {
    const url = buildTmdbUrl('/discover/movie', { query: { page: '2', sort_by: 'popularity.desc' } }, 'fr-FR', 'FR')
    expect(url).toContain('page=2')
    expect(url).toContain('sort_by=popularity.desc')
    expect(url).toContain('language=fr-FR')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/composables/useTmdb.test.ts`
Expected: FAIL — cannot resolve `./useTmdb`.

- [ ] **Step 3: Implement `src/composables/useTmdb.ts`**

```ts
import { useLocale } from './useLocale'

const BASE = 'https://api.themoviedb.org/3'
const TOKEN = import.meta.env.VITE_TMDB_TOKEN

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
}

export interface TmdbOpts {
  watchRegion?: boolean
  query?: Record<string, string>
}

/** Pure URL builder — testable without network. */
export function buildTmdbUrl(path: string, opts: TmdbOpts, tmdbLang: string, region: string): string {
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v)
  url.searchParams.set('language', tmdbLang)
  if (opts.watchRegion) url.searchParams.set('watch_region', region)
  return url.toString()
}

export function useTmdb() {
  const { tmdbLang, region } = useLocale()

  async function tmdb<T = any>(path: string, opts: TmdbOpts = {}): Promise<T> {
    const url = buildTmdbUrl(path, opts, tmdbLang.value, region.value)
    const res = await fetch(url, { headers })
    const data = await res.json()
    if (!res.ok) throw new Error(data.status_message || 'API error')
    return data
  }

  return { tmdb }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test src/composables/useTmdb.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useTmdb.ts src/composables/useTmdb.test.ts
git commit -m "feat: add useTmdb helper that injects language and watch_region"
```

---

## Task 9: useFormat composable (locale-aware formatting)

**Files:**
- Create: `src/composables/useFormat.ts`
- Create: `src/composables/useFormat.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/composables/useFormat.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/composables/useFormat.test.ts`
Expected: FAIL — cannot resolve `./useFormat`.

- [ ] **Step 3: Implement `src/composables/useFormat.ts`**

```ts
import { computed } from 'vue'
import { useLocale } from './useLocale'

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

export function localizeDigits(s: string, lang: string): string {
  if (lang !== 'ar') return s
  return s.replace(/[0-9]/g, d => AR_DIGITS[Number(d)]!)
}

export function fmtRuntimeFor(min: number, lang: string): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const s = h > 0 ? `${h}h ${m}m` : `${m}m`
  return localizeDigits(s, lang)
}

export function fmtClockFor(ms: number, lang: string): string {
  return new Date(ms).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
}

export function fmtCountdownFor(totalSecs: number, lang: string): string {
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const sec = totalSecs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const raw = h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
  return localizeDigits(raw, lang)
}

export function fmtRatingFor(value: number, lang: string): string {
  return new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}

export function fmtIntFor(value: number, lang: string): string {
  return new Intl.NumberFormat(lang).format(value)
}

/** Component-facing wrapper bound to the active locale. */
export function useFormat() {
  const { language } = useLocale()
  return {
    runtime: (min: number) => fmtRuntimeFor(min, language.value),
    clock: (ms: number) => fmtClockFor(ms, language.value),
    countdown: (secs: number) => fmtCountdownFor(secs, language.value),
    rating: (v: number) => fmtRatingFor(v, language.value),
    int: (v: number) => fmtIntFor(v, language.value),
    digits: (s: string) => localizeDigits(s, language.value),
    lang: computed(() => language.value),
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test src/composables/useFormat.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useFormat.ts src/composables/useFormat.test.ts
git commit -m "feat: add useFormat composable for locale-aware formatting"
```

---

## Task 10: LocaleSwitcher component

**Files:**
- Create: `src/components/LocaleSwitcher.vue`

- [ ] **Step 1: Implement `src/components/LocaleSwitcher.vue`**

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLocale } from '../composables/useLocale'
import { LANGUAGES, REGIONS } from '../data/locales'

const { t } = useI18n()
const { language, region, setLanguage, setRegion } = useLocale()
</script>

<template>
  <div class="flex items-center gap-3">
    <label class="locale-field">
      <span class="locale-label">{{ t('locale.language') }}</span>
      <select
        class="locale-select"
        :value="language"
        @change="setLanguage(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="l in LANGUAGES" :key="l.code" :value="l.code">{{ l.endonym }}</option>
      </select>
    </label>
    <label class="locale-field">
      <span class="locale-label">{{ t('locale.region') }}</span>
      <select
        class="locale-select"
        :value="region"
        @change="setRegion(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="r in REGIONS" :key="r.code" :value="r.code">
          {{ r.flag }} {{ t(r.nameKey) }}
        </option>
      </select>
    </label>
  </div>
</template>

<style scoped>
@reference "../style.css";

.locale-field {
  @apply flex items-center gap-2;
}
.locale-label {
  @apply text-[10px] tracking-[3px] uppercase text-text-dim font-medium;
}
.locale-select {
  @apply py-1.5 pe-7 ps-3 rounded-lg border border-border bg-surface-raised
         text-text-muted font-body text-[12px] cursor-pointer outline-none appearance-none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%233d3832' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.locale-select:hover {
  @apply border-border-hover;
}
[dir="rtl"] .locale-select {
  background-position: left 10px center;
}
</style>
```

- [ ] **Step 2: Verify it builds**

Run: `bun run build`
Expected: build completes with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LocaleSwitcher.vue
git commit -m "feat: add LocaleSwitcher with language and region pickers"
```

---

## Task 11: moods.ts — remove English labels

**Files:**
- Modify: `src/data/moods.ts`

- [ ] **Step 1: Edit `src/data/moods.ts`**

Remove the `label` field from the `Mood` interface and from every entry. The labels now live in
`locales/*.json` under `moods.<id>`. Result:

```ts
export interface Mood {
  id: string
  icon: string
  genreIds: number[]
  keywordIds: number[]
  sortOverride?: string
}

export const MOODS: Mood[] = [
  {
    id: 'make-me-laugh',
    icon: 'Laugh',
    genreIds: [35],
    keywordIds: [8201, 9755, 9253, 10123], // satire, parody, slapstick comedy, dark comedy
  },
  {
    id: 'edge-of-my-seat',
    icon: 'Flame',
    genreIds: [53, 28],
    keywordIds: [288394, 10051, 3713], // suspense, heist, chase
  },
  {
    id: 'feel-good',
    icon: 'Heart',
    genreIds: [35, 10749, 10751],
    keywordIds: [329716, 335803, 334465], // feel-good, wholesome, uplifting
  },
  {
    id: 'mind-bending',
    icon: 'Brain',
    genreIds: [878, 9648],
    keywordIds: [4379, 4565, 272553, 275311], // time travel, dystopia, psychological, plot twist
  },
  {
    id: 'dark-and-twisted',
    icon: 'Skull',
    genreIds: [27, 53],
    keywordIds: [340566, 6158, 9748], // noir, cult, revenge
  },
  {
    id: 'comfort-watch',
    icon: 'Coffee',
    genreIds: [35, 10749],
    keywordIds: [326774, 164246], // cozy, nostalgic
  },
  {
    id: 'background-noise',
    icon: 'Headphones',
    genreIds: [99, 35],
    keywordIds: [],
    sortOverride: 'popularity.desc',
  },
  {
    id: 'cry-it-out',
    icon: 'CloudRain',
    genreIds: [18, 10749],
    keywordIds: [6203, 156924, 9672], // loss, tearjerker, based on true story
  },
]
```

- [ ] **Step 2: Commit (build verified later in Task 12 once App.vue uses t())**

```bash
git add src/data/moods.ts
git commit -m "refactor(i18n): move mood labels out of data into locale catalogs"
```

---

## Task 12: App.vue — dynamic providers, genres, useTmdb, useFormat, strings

This is the largest change. Work through the steps in order; the app must build at the end.

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Update the `<script setup>` imports and composables**

At the top of `<script setup>`, add:
```ts
import { useI18n } from 'vue-i18n'
import { useTmdb } from './composables/useTmdb'
import { useFormat } from './composables/useFormat'
import { useLocale } from './composables/useLocale'
import { providerColor } from './utils/providerColor'
import LocaleSwitcher from './components/LocaleSwitcher.vue'
import { LANGUAGES } from './data/locales'
```
Then, after the existing `useWatchlist`/`useWatched` calls, add:
```ts
const { t } = useI18n()
const { tmdb } = useTmdb()
const fmt = useFormat()
const { language, region, tmdbLang } = useLocale()
```

- [ ] **Step 2: Replace the hardcoded `headers` and remove `TMDB_TOKEN` direct fetches**

Delete the `TMDB_TOKEN` const (line 17) and the `headers` const (lines 61-64) — all requests now
go through `tmdb()`. Keep `import.meta.env` out of this file entirely.

- [ ] **Step 3: Replace hardcoded `GENRES` with a reactive, fetched list**

Delete the `GENRES` array (lines 19-38). Add:
```ts
const genres = ref<{ id: number; name: string }[]>([])

async function loadGenres() {
  try {
    const data = await tmdb('/genre/movie/list')
    genres.value = data.genres ?? []
  } catch { genres.value = [] }
}
```
Call `loadGenres()` once on setup and refetch when language changes:
```ts
loadGenres()
watch(language, () => { loadGenres() })
```

- [ ] **Step 4: Replace `SORT_OPTIONS` labels with i18n keys**

Change `SORT_OPTIONS` to hold only values; the label comes from `t('sort.' + value)`:
```ts
const SORT_VALUES = [
  'popularity.desc',
  'runtime.asc',
  'runtime.desc',
  'vote_average.desc',
  'primary_release_date.desc',
  'primary_release_date.asc',
  'revenue.desc',
]
```
(Delete the old `SORT_OPTIONS` const.)

- [ ] **Step 5: Replace static `PROVIDERS` with a reactive per-region list**

Delete the `PROVIDERS` array (lines 50-59). Add:
```ts
interface Provider { id: number; name: string; color: string; logoPath: string | null }
const providers = ref<Provider[]>([])

async function loadProviders() {
  try {
    const data = await tmdb('/watch/providers/movie', { watchRegion: true })
    const list = (data.results ?? []) as any[]
    providers.value = list
      .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
      .slice(0, 16)
      .map(p => ({
        id: p.provider_id,
        name: p.provider_name,
        color: providerColor(p.provider_id),
        logoPath: p.logo_path ?? null,
      }))
    // Drop any selected providers no longer offered in this region.
    const valid = new Set(providers.value.map(p => p.id))
    const next = new Set([...selectedProviders.value].filter(id => valid.has(id)))
    if (next.size !== selectedProviders.value.size) selectedProviders.value = next
  } catch { providers.value = [] }
}
```
Call it on setup and refetch when region changes:
```ts
loadProviders()
watch(region, () => { loadProviders() })
```

- [ ] **Step 6: Update color computeds to use the dynamic provider list**

Replace `activeProviderColors` (lines 213-216) and `movieProviders` (lines 253-263). New:
```ts
const activeProviderColors = computed(() => {
  const colors = providers.value.filter(p => selectedProviders.value.has(p.id)).map(p => p.color)
  return colors.length ? colors : ['#ff6b35']
})
```
```ts
function movieProviders(movie: any) {
  const watchData = movie['watch/providers']?.results?.[region.value]
  const flatrate: any[] = watchData?.flatrate || []
  const link: string | null = watchData?.link || null
  return providers.value
    .filter(p => selectedProviders.value.has(p.id) && flatrate.some(f => f.provider_id === p.id))
    .map(p => {
      const logo = flatrate.find(f => f.provider_id === p.id)?.logo_path ?? p.logoPath
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        logo: logo ? `https://image.tmdb.org/t/p/w45${logo}` : null,
        link,
      }
    })
}
```
(`providerColor`/`providerGradient`/`ambientBackground`/`ambientPositions` are unchanged — they
read `activeProviderColors`.)

- [ ] **Step 7: Route `fetchPage` and detail fetches through `useTmdb`**

Replace `fetchPage` (lines 268-291) so it uses `tmdb()` with query params and **no** hardcoded
`watch_region=US` / `with_original_language=en`:
```ts
async function fetchPage(providerIds: string, pg: number) {
  const clientSorts = ['runtime.asc', 'runtime.desc']
  const apiSort = clientSorts.includes(sortBy.value) ? 'popularity.desc' : sortBy.value
  const query: Record<string, string> = {
    with_watch_providers: providerIds,
    sort_by: apiSort,
    page: String(pg),
  }
  if (selectedGenre.value) query.with_genres = String(selectedGenre.value)
  if (selectedMood.value) {
    const mood = MOODS.find(m => m.id === selectedMood.value)
    if (mood && mood.keywordIds.length > 0) query.with_keywords = mood.keywordIds.join('|')
  }
  if (personFilter.value) query.with_people = String(personFilter.value.id)
  if (sortBy.value === 'vote_average.desc') query['vote_count.gte'] = '200'
  if (hiddenGemsOnly.value) {
    query['vote_average.gte'] = '7.5'
    query['vote_count.gte'] = '50'
    if (apiSort === 'popularity.desc') query.sort_by = 'vote_average.desc'
  }
  return tmdb('/discover/movie', { watchRegion: true, query })
}
```
In `fetchMovies` (lines 312-318), replace the per-movie detail `fetch(...)` with:
```ts
    const movieDetails = await Promise.all(
      unique.map((m: any) =>
        tmdb(`/movie/${m.id}`, { query: { append_to_response: 'credits,videos,release_dates,watch/providers' } })
          .catch(() => ({ ...m, runtime: null }))
      )
    )
```

- [ ] **Step 8: Route `openMovie`'s detail fetch through `useTmdb`**

In `openMovie` (lines 473-480), replace the `fetch(...)` block with:
```ts
  let fullMovie = movie
  if (!movie.credits && movie.id) {
    try {
      fullMovie = await tmdb(`/movie/${movie.id}`, {
        query: { append_to_response: 'credits,videos,release_dates,watch/providers' },
      })
    } catch {}
  }
```

- [ ] **Step 9: Refetch results when language or region changes**

Extend the existing refetch watcher (line 386) to include `tmdbLang`:
```ts
watch([selectedGenre, sortBy, personFilter, selectedMood, hiddenGemsOnly, tmdbLang], () => { refetch() })
```
(Region change already triggers `loadProviders`, which re-validates selection and thus refetches
through the `selectedProviders` watcher when the set changes. Also call `refetch()` at the end of
`loadProviders` so localized metadata refreshes even when the selection set is unchanged:
add `if (hasProviders.value) refetch()` as the last line of `loadProviders`.)

- [ ] **Step 10: Update `toggleProvider` signature**

`toggleProvider` (line 331) currently types its arg as `typeof PROVIDERS[number]`. Change to:
```ts
function toggleProvider(p: Provider) {
```

- [ ] **Step 11: Replace `fmtRuntime` usages and delete the local copy**

Delete the local `fmtRuntime` (lines 66-70). In the template, the only usage is the max-runtime
hint (line 587) — it becomes `fmt.runtime(maxRuntimeMinutes)` (see Step 12).

- [ ] **Step 12: Replace all template strings with `t()` and `fmt`**

Apply these template edits in `src/App.vue`:

- Eyebrow (line 508):
  ```
  {{ t('header.eyebrow', { timeOfDay: t('header.timeOfDay.' + timeOfDayKey) }) }}
  ```
  and change `timeOfDayLabel` (lines 130-136) to return a **key** instead of English:
  ```ts
  const timeOfDayKey = computed(() => {
    const hour = new Date(now.value).getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    return 'evening'
  })
  ```
  (Delete the old `timeOfDayLabel`.)
- Title (lines 512, 519-520):
  ```
  {{ t('header.titleLine1') }}<br />
  ...
  {{ t('header.titleAccent') }}
  ```
- Subtitle (line 522-524): `{{ t('header.subtitle') }}`
- Tabs (lines 529-536): `DISCOVER`→`{{ t('nav.discover') }}`, `MY LIST`→`{{ t('nav.myList') }}`,
  `WATCHED`→`{{ t('nav.watched') }}`.
- `My services` (line 544): `{{ t('controls.myServices') }}`
- Provider buttons (lines 546-556): `v-for="p in providers"` (was `PROVIDERS`).
- `Start at` (line 562): `{{ t('controls.startAt') }}`; option `Now` (line 569): `{{ t('controls.now') }}`.
- `Done by` (line 574): `{{ t('controls.doneBy') }}`; option `Any time` (line 581): `{{ t('controls.anyTime') }}`.
- Max-runtime hint (line 587): `{{ t('controls.maxRuntime', { runtime: fmt.runtime(maxRuntimeMinutes!) }) }}`
- Browse tabs (lines 600-601): `Mood`→`{{ t('browse.mood') }}`, `Genre`→`{{ t('browse.genre') }}`.
- Mood pills (lines 604-614): keep `v-for="mood in MOODS"`, change label to `{{ t('moods.' + mood.id) }}`.
- Genre pills (lines 617-626): `v-for="g in genres"` (was `GENRES`); label stays `{{ g.name }}` (now localized from TMDB).
- Sort select (lines 632-639): `v-for="value in SORT_VALUES" :key="value" :value="value"` and option text `{{ t('sort.' + value) }}`.
- `Hidden Gems` (line 648): `{{ t('filters.hiddenGems') }}`.
- `Expiring first` (line 655): `{{ t('filters.expiringFirst') }}`.
- Person filter label (line 664): `{{ t('person.showingFilmsWith') }}`; aria (line 667): `:aria-label="t('person.clearAria')"`.
- Empty state (line 683): `{{ t('empty.choosePlatform') }}`.
- Loading (line 694): `{{ t('common.loading') }}`.
- Results count line (lines 720-727):
  ```
  {{ t('results.finishingBefore', { time: endTimeStr }) }}
  ...
  {{ t('results.tooLong', { count: movies.length - filtered.length }) }}
  ```
- Nothing-fits (line 734): `{{ t('results.nothingFits') }}`.
- My-list empty (lines 778-781): `{{ t('myList.emptyTitle') }}` / `{{ t('myList.emptyBody') }}`.
- Watched empty (lines 798-801): `{{ t('watched.emptyTitle') }}` / `{{ t('watched.emptyBody') }}`.
- Watched stat label (line 807): `{{ t('watched.statLabel') }}`.

- [ ] **Step 13: Mount `LocaleSwitcher` in the header nav**

In the `<nav>` (lines 528-539), replace `<div class="flex-1" />` with:
```html
        <div class="flex-1" />
        <LocaleSwitcher class="max-sm:hidden" />
```
And add a mobile placement: directly below the closing `</nav>`, add:
```html
      <div class="hidden max-sm:flex justify-end mb-8">
        <LocaleSwitcher />
      </div>
```

- [ ] **Step 14: Build and type-check**

Run: `bun run build`
Expected: build completes with no type errors. (Fix any leftover references to `PROVIDERS`,
`GENRES`, `SORT_OPTIONS`, `fmtRuntime`, or `headers`.)

- [ ] **Step 15: Commit**

```bash
git add src/App.vue
git commit -m "feat(i18n): localize App.vue strings and make providers/genres region-aware"
```

---

## Task 13: MovieCard.vue — strings and formatting

**Files:**
- Modify: `src/components/MovieCard.vue`

- [ ] **Step 1: Add i18n + format in `<script setup>`**

After the imports (line 3), add:
```ts
import { useI18n } from 'vue-i18n'
import { useFormat } from '../composables/useFormat'
const { t } = useI18n()
const fmt = useFormat()
```

- [ ] **Step 2: Replace local formatters with `fmt`**

Delete the local `fmtRuntime` (lines 29-33) and `fmtCountdown` (lines 46-53). Replace `endTime`
(lines 35-38) with one that uses the locale clock:
```ts
function endTime(runtime: number) {
  return fmt.clock(props.startAt + runtime * 60000)
}
```

- [ ] **Step 3: Update template usages**

- `No runtime` (line 195): `{{ t('card.noRuntime') }}`.
- Runtime display (line 190): `{{ fmt.runtime(movie.runtime) }}`.
- Countdown (line 159): `{{ fmt.countdown(countdownSecs!) }}`.
- Rating value (line 213): `{{ fmt.rating(movie.vote_average) }}` (replaces `movie.vote_average.toFixed(1)`).

- [ ] **Step 4: Build**

Run: `bun run build`
Expected: build completes with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/MovieCard.vue
git commit -m "feat(i18n): localize MovieCard strings and formatting"
```

---

## Task 14: MovieModal.vue — strings, formatting, region-aware certification

**Files:**
- Modify: `src/components/MovieModal.vue`

- [ ] **Step 1: Add i18n, format, locale in `<script setup>`**

After the imports (line 3), add:
```ts
import { useI18n } from 'vue-i18n'
import { useFormat } from '../composables/useFormat'
import { useLocale } from '../composables/useLocale'
const { t } = useI18n()
const fmt = useFormat()
const { region } = useLocale()
```

- [ ] **Step 2: Replace `RATING_OPTIONS` labels with i18n keys**

Change the `label` fields (lines 25-30) to i18n keys resolved in the template. Keep keys/colors/
direction/double; replace `label` with `labelKey`:
```ts
const RATING_OPTIONS = [
  { key: 'awful' as const, color: '#ff5555', labelKey: 'rating.awful', direction: 'down' as const, double: true },
  { key: 'meh' as const, color: '#f0a030', labelKey: 'rating.meh', direction: 'down' as const, double: false },
  { key: 'good' as const, color: '#6cb4ee', labelKey: 'rating.good', direction: 'up' as const, double: false },
  { key: 'loved' as const, color: '#1CE783', labelKey: 'rating.loved', direction: 'up' as const, double: true },
] as const
```

- [ ] **Step 3: Replace local formatters with `fmt`**

Delete local `fmtRuntime` (lines 54-58) and `fmtCountdown` (lines 88-95). Replace
`startTimeDisplay` (lines 60-62) and `endTimeDisplay` (lines 64-68):
```ts
const startTimeDisplay = computed(() => fmt.clock(effectiveStart.value))
const endTimeDisplay = computed(() => {
  if (!props.movie.runtime) return ''
  return fmt.clock(effectiveStart.value + props.movie.runtime * 60000)
})
```

- [ ] **Step 4: Make certification region-aware**

Replace `certification` (lines 130-136):
```ts
const certification = computed(() => {
  const releases = props.movie.release_dates?.results || []
  const match = releases.find((r: any) => r.iso_3166_1 === region.value)
    || releases.find((r: any) => r.iso_3166_1 === 'US')
  if (!match) return ''
  return match.release_dates.find((d: any) => d.certification)?.certification || ''
})
```

- [ ] **Step 5: Update template strings**

- Close aria (line 279): `:aria-label="t('modal.close')"`.
- Countdown `Start within` (line 295): `{{ t('modal.startWithin') }}`; value (line 296): `{{ fmt.countdown(countdownSecs!) }}`.
- Watchlist button text (line 307): `{{ isInWatchlist ? t('modal.inMyList') : t('modal.addToMyList') }}`.
- Mark Watched (lines 315-316): `{{ t('modal.markWatched') }}`.
- Watched (rated) (line 326): `{{ t('modal.watched') }}`.
- Rating value (line 375): `{{ fmt.rating(movie.vote_average) }}`.
- Runtime in heading (line 371): `{{ fmt.runtime(movie.runtime) }}`.
- Popover label (line 331): `{{ t('rating.prompt') }}`; dialog aria (line 330): `:aria-label="t('rating.dialogAria')"`.
- Popover buttons aria (line 339): `:aria-label="t(opt.labelKey)"`.
- `Directed by` (line 413): `{{ t('modal.directedBy') }}`.
- Cast role (line 420): `{{ t('modal.as', { character: person.character }) }}` (replaces `as {{ person.character }}`).
- `Watch Trailer` (line 435): `{{ t('modal.watchTrailer') }}`.
- Timing labels: `Runtime` (line 441) `{{ t('modal.runtime') }}`; `Start` (line 448) `{{ t('modal.start') }}`; `Done by` (line 455) `{{ t('modal.doneBy') }}`.
- Timing runtime value (line 443): `{{ fmt.runtime(movie.runtime) }}`.

- [ ] **Step 6: Build**

Run: `bun run build`
Expected: build completes with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/MovieModal.vue
git commit -m "feat(i18n): localize MovieModal strings, formatting, region certification"
```

---

## Task 15: RTL audit and logical-property pass

**Files:**
- Modify: `src/App.vue`, `src/components/MovieCard.vue`, `src/components/MovieModal.vue`

The `dir` attribute is already set on `<html>` by `useLocale`. This task fixes physical-direction
styles so the layout mirrors correctly under Arabic.

- [ ] **Step 1: Convert directional Tailwind utilities to logical in `App.vue`**

In `App.vue` template, change physical utilities to logical equivalents wherever they imply
start/end direction (not centering or full-width):
- `ml-*`/`mr-*` → `ms-*`/`me-*` (e.g. line 724 `ml-1.5` → `ms-1.5`; line 532 `ml-1.5`→`ms-1.5`).
- `pl-*`/`pr-*` → `ps-*`/`pe-*`.
- `text-left`/`text-right` → `text-start`/`text-end`.
Leave symmetric utilities (`mx-auto`, `inset-0`, `px-*`, `gap-*`) unchanged.

- [ ] **Step 2: Fix the select chevron position under RTL in `App.vue` `<style>`**

The `.select-input` background chevron is pinned `right 14px` (line 971). Add after that rule:
```css
[dir="rtl"] .select-input {
  background-position: left 14px center;
  padding-left: 2.5rem;
  padding-right: 1rem;
}
```

- [ ] **Step 3: Fix the expiring-toggle thumb travel under RTL in `App.vue` `<style>`**

The toggle thumb uses `left: 3px` + `translateX(14px)` (lines 956-962). Add:
```css
[dir="rtl"] .toggle-thumb {
  left: auto;
  right: 3px;
}
[dir="rtl"] .toggle-track.on .toggle-thumb {
  transform: translateX(-14px);
}
```

- [ ] **Step 4: Mirror absolutely-positioned badges in `MovieCard.vue` `<style>`**

Badges use physical `right`/`left`. Add RTL overrides at the end of the `<style>` block (before the
reduced-motion block):
```css
[dir="rtl"] .bookmark-btn { left: auto; right: 10px; }
[dir="rtl"] .countdown-badge { right: auto; left: 10px; }
[dir="rtl"] .gem-badge { right: auto; left: 10px; }
[dir="rtl"] .rating-badge { right: auto; left: 8px; }
```
(Note `.bookmark-btn` uses `top-2.5 left-2.5` via Tailwind in template — override here keeps it
visually on the start side.)

- [ ] **Step 5: Mirror modal hero actions, countdown, close, and popover in `MovieModal.vue` `<style>`**

Add at the end of `<style>` (before reduced-motion):
```css
[dir="rtl"] .hero-actions { right: auto; left: 16px; }
[dir="rtl"] .modal-countdown { left: auto; right: 16px; }
[dir="rtl"] .rating-popover { right: auto; left: 0; transform-origin: top left; }
[dir="rtl"] .popover-arrow { right: auto; left: 20px; }
```
For the close button (template `top-4 right-4`) and the hero accent margins, also add:
```css
[dir="rtl"] .close-btn { right: auto; left: 1rem; }
```
(The close button is positioned with Tailwind `right-4`; this override wins because scoped styles
target the element directly. If it does not, change the template class `right-4` to use an inline
`style` bound to dir — but try the CSS override first.)

- [ ] **Step 6: Build and manually verify RTL**

Run: `bun run build`
Expected: build completes. Then run `bun dev`, switch language to العربية, and confirm: text is
right-aligned, the language/region selects sit correctly, card badges mirror, the modal close
button and rating popover sit on the correct side, and the timing bar reads right-to-left.

- [ ] **Step 7: Commit**

```bash
git add src/App.vue src/components/MovieCard.vue src/components/MovieModal.vue
git commit -m "feat(i18n): RTL layout pass with logical utilities and mirrored badges"
```

---

## Task 16: Full integration verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `bun run test`
Expected: all tests pass (parity, locales, i18n, useLocale, providerColor, useTmdb, useFormat).

- [ ] **Step 2: Production build**

Run: `bun run build`
Expected: no type errors, build artifacts written to `dist/`.

- [ ] **Step 3: Manual smoke across locales (run `bun dev`)**

Verify each of the following by hand:
- Switch language to each of en/es/fr/de/ja/ar — every visible string changes; no raw keys shown.
- Switch region to JP — provider pills change to Japan's services; selecting one loads results;
  movie metadata (titles/overviews) appears in the active language.
- Switch region to US then ES — provider list changes; a previously-selected US-only provider
  (e.g. Hulu) is dropped from the selection if absent in ES.
- Set a "Done by" time — countdown badges show; in Arabic, digits render as Arabic-Indic.
- Clear localStorage, set the browser to `es-MX`, reload — language defaults to Spanish, region to
  Mexico.
- Genre filter shows localized genre names; mood pills show localized labels.

- [ ] **Step 4: Update the README**

Add a short "Localization" section to `README.md` noting supported languages/regions, that
language and region are independent, and that detection is automatic with a manual override. Then:
```bash
git add README.md
git commit -m "docs: document localization support in README"
```

---

## Self-Review Notes (verification of this plan against the spec)

- **UI translation (6 langs incl. RTL+CJK):** Tasks 2–6, 12–14 (strings), 15 (RTL). ✓
- **TMDB localization (titles/overviews/genres/certs):** Task 8 (`language` injection), 12 (genres
  + discover/detail through `useTmdb`, removed `with_original_language=en`), 14 (region cert). ✓
- **Region-aware dynamic providers + color strategy:** Tasks 7, 12 (Steps 5–6). ✓
- **Independent language ⊥ region:** Task 5 (separate refs/setters), 10 (two pickers). ✓
- **Auto-detect + manual override + persistence:** Task 5 (`initLocale`, `detect*`, localStorage),
  6 (startup), 10 (selectors). ✓
- **Formatting (Intl, Arabic digits):** Task 9, applied in 12–14. ✓
- **Moods to i18n keys:** Tasks 2, 11, 12 (Step 12). ✓
- **Type consistency:** `Provider` interface (Task 12) is used by `toggleProvider` and
  `movieProviders`; `providers`/`genres`/`SORT_VALUES` refs replace the deleted consts everywhere
  they were referenced; `fmt.*` replaces every deleted local formatter; `RATING_OPTIONS.labelKey`
  is used in the modal template aria. ✓
- **No placeholders:** translation values for es/fr/de/ja/ar are generation work gated by the
  Task 2 parity/non-empty/placeholder test (documented in the Translation Authoring Note), not
  TODO stubs. All code steps show complete code. ✓

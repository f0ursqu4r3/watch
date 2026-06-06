# Regionalization + i18n Design

**Date:** 2026-06-05
**Status:** Approved (pending spec review)

## Goal

Make `watch.` work across languages and regions:

1. **UI translation (i18n)** — every interface string available in 6 languages, including a
   right-to-left (Arabic) and a CJK (Japanese) locale.
2. **TMDB data localization** — movie titles, overviews, genres, and certifications returned in
   the user's language; streaming providers and availability scoped to the user's region.

Language (what the user reads) and region (which streaming market) are **independent** settings.

## Locale Set

### UI languages (Claude-drafted translations)

| Language | UI code | TMDB `language` | Notes        |
|----------|---------|-----------------|--------------|
| English  | `en`    | `en-US`         | source / fallback |
| Spanish  | `es`    | `es-ES`         |              |
| French   | `fr`    | `fr-FR`         |              |
| German   | `de`    | `de-DE`         |              |
| Japanese | `ja`    | `ja-JP`         | CJK          |
| Arabic   | `ar`    | `ar-SA`         | **RTL**      |

English is the fallback locale: any missing key in another file falls back to `en`.

### Regions (TMDB `watch_region`, independent of UI language)

Curated picker of common markets: `US, GB, ES, FR, DE, JP, MX, BR, CA, AU, IN, SA`.
Because providers are fetched dynamically per region (below), this list can grow without code
changes beyond adding the option.

## Architecture

### New modules

**`src/i18n.ts`** — vue-i18n v11 instance (Composition API, `legacy: false`). Registers the 6
locale message objects, sets `fallbackLocale: 'en'`, and defines `numberFormats` / `datetimeFormats`
per locale for `Intl`-based formatting. Installed in `main.ts`.

**`src/locales/{en,es,fr,de,ja,ar}.json`** — message catalogs. Keys are extracted from the three
`.vue` files. Namespaced by area, e.g.:

```
{
  "hero": { "tagline": "...", "subtitle": "..." },
  "filters": { "browseByMood": "...", "browseByGenre": "...", "sortBy": "..." },
  "card": { "finishBy": "...", "runtime": "..." },
  "modal": { "cast": "...", "director": "...", "trailer": "..." },
  "moods": { "make-me-laugh": "...", "edge-of-my-seat": "..." },
  "common": { "loading": "...", "noResults": "..." }
}
```

Interpolation and pluralization use vue-i18n syntax (`{count}`, `name | name`).

**`src/composables/useLocale.ts`** — single source of truth for locale state.

- Reactive refs `language` and `region`.
- **First-load auto-detect:** if nothing persisted, derive `language` from `navigator.languages`
  (first match against supported set, else `en`) and `region` from a language→region default map
  (e.g. `es`→`ES`, `ja`→`JP`), overridden by `navigator.language` region subtag when present and supported.
- **Persistence:** both values saved to `localStorage` (`watch.language`, `watch.region`);
  manual selector writes here.
- **Side effects (watcher):** on `language` change set `document.documentElement.lang` and
  `dir` (`rtl` for `ar`, else `ltr`), and `i18n.global.locale`.
- **Exposes:** `language`, `region`, `tmdbLang` (computed `en` → `en-US`, etc.), `dir`,
  `setLanguage()`, `setRegion()`, and the supported-locale / supported-region lists for the UI.

**`src/composables/useTmdb.ts`** — thin fetch wrapper. A `tmdb(path, params)` helper that:

- prepends the base URL and auth header,
- injects `language=<tmdbLang>` on every request,
- injects `watch_region=<region>` on requests that take it (discover, watch/providers).

All existing inline `fetch('https://api.themoviedb.org/...')` calls in `App.vue` and
`MovieModal.vue` route through this helper. This removes the hardcoded `watch_region=US`,
`with_original_language=en`, and the implicit `en-US` metadata default.

> Note on `with_original_language=en`: today this filters results to English-language films.
> It is **removed** so regional catalogs surface local-language films. (If we later want a
> "local films only" toggle, it returns as an opt-in — out of scope here.)

### Changes to existing code

**Dynamic providers (replaces hardcoded `PROVIDERS`)**

- Fetch `/watch/providers/movie?watch_region=<region>&language=<tmdbLang>` to get the region's
  real provider list. Build provider objects from `provider_id`, `provider_name`, `logo_path`
  (rendered via TMDB image CDN: `https://image.tmdb.org/t/p/w92<logo_path>`).
- Refetch the provider list whenever `region` changes; reset/re-validate `selectedProviders`
  against the new list.
- **Color strategy (brand map + hash fallback):** a small `PROVIDER_BRAND_COLORS` map keyed by
  TMDB provider id for global majors (Netflix `#E50914`, Disney+ `#1133A6`, Prime, Apple TV+,
  Max, Hulu, Paramount+, etc.). Providers not in the map get a deterministic color via
  `hashToHsl(provider_id)` (stable hue from id, fixed S/L tuned to match the existing neon glow
  palette). A single `providerColor(id)` function feeds the existing `--c`, `pill-dot`,
  `--provider-glow`, and `cardAccent` consumers — no change to the glow CSS.

**Genres (replaces hardcoded `GENRES`)**

- Fetch `/genre/movie/list?language=<tmdbLang>` → localized `{id, name}` list, stored reactively
  and used by the genre filter. Refetch when `language` changes.

**Moods (`src/data/moods.ts`)**

- Keep `id`, `genreIds`, `keywordIds`, `sortOverride`. Remove the English `label` (and the
  `icon` stays — it's a Lucide name, locale-independent). UI renders the label via
  `t('moods.' + mood.id)`.

**RTL pass**

- `dir` is driven by `useLocale`. Audit `App.vue`, `MovieCard.vue`, `MovieModal.vue` and convert
  physical-direction Tailwind utilities to logical equivalents: `ml-/mr-`→`ms-/me-`,
  `pl-/pr-`→`ps-/pe-`, `left-/right-`→`start-/end-`, `text-left/right`→`text-start/end`,
  `rounded-l/r`→`rounded-s/e`, and `inset` offsets. Mirror directional icons (chevron/arrow
  used for navigation) under RTL. Popover/anchor logic that assumes left/right (e.g. the rating
  popover anchoring) is checked under `dir=rtl`.

**Formatting**

- Runtime ("2h 15m"), release dates, rating numbers, and the live countdown formatted via
  vue-i18n `n()` / `d()` and `Intl.RelativeTimeFormat`/`Intl.NumberFormat` so digits, separators,
  and unit labels localize (notably Arabic-Indic digits and Japanese conventions).

**Selector UI**

- Header gains a **language** picker and a **region** picker (two compact dropdowns). Each writes
  through `useLocale`. Region label shows country name + flag; language shows endonym
  (e.g. "Español", "日本語", "العربية").

## Data Flow

```
navigator.language ─┐
localStorage  ──────┴─► useLocale { language, region }
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                 ▼
        i18n.locale      tmdbLang           region
        (UI strings)   (metadata lang)  (watch_region)
              │               │                 │
              ▼               ▼                 ▼
        <html lang/dir>   useTmdb() ──► discover / providers / genres / details
```

- Changing **language** → re-renders UI strings, sets dir, refetches genres + movie metadata.
- Changing **region** → refetches provider list + movie availability; re-validates selection.

## Error Handling / Edge Cases

- **Unsupported browser locale** → fall back to `en` / `US`.
- **Missing translation key** → vue-i18n falls back to `en` (and we run a key-parity check across
  locale files during the build/dev to catch gaps).
- **Empty provider list for a region** → show an empty-state message (existing "choose a platform"
  surface) rather than an error.
- **Provider with no `logo_path`** → render name chip with hash color, no logo.
- **In-flight region/language change** → guard against stale responses (ignore results whose
  request locale/region no longer matches current).

## Testing

- Manual: switch each of the 6 languages — verify UI strings, dir flip for `ar`, CJK rendering
  for `ja`, localized genre names and movie titles.
- Manual: switch region — verify provider list changes (e.g. Hulu only in US, regional services
  appear), availability/countdown still correct.
- Auto-detect: clear localStorage, set browser to es / ja / ar, reload — verify correct default.
- Key parity: a script/check confirming every locale file has the same key set as `en`.
- Formatting: confirm Arabic digits and Japanese date/number formatting in countdown and runtime.

## Out of Scope (YAGNI)

- Translating movie titles/overviews ourselves — TMDB provides localized metadata.
- "Local-language films only" toggle (the removed `with_original_language` filter).
- Per-region currency/pricing.
- Lazy-loading locale chunks (6 small JSON files bundle fine; revisit if catalog grows).
- A translation-management pipeline / external TMS.

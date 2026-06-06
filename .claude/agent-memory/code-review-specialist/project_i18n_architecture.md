---
name: project-i18n-architecture
description: How locale/region/i18n is wired in the watch app — singleton refs, side-effect flow, TMDB param injection, RTL strategy
metadata:
  type: project
---

The watch app (Vue 3 + TS, TMDB-backed) gained full regionalization/i18n on branch `feat/regionalization-i18n`.

Architecture (stable, verified):
- `src/composables/useLocale.ts` holds **module-scoped** `language`/`region` refs (singleton). `useTmdb`, `useFormat`, components all consume the same instance, so a locale change propagates reactively to every consumer. `applySideEffects()` sets i18n locale + `document.documentElement` `lang`/`dir`.
- Init: `main.ts` calls `initLocale()` BEFORE `createApp(...).mount()`, so `dir`/`lang` and i18n locale are set on first paint. No ordering hazard.
- `src/composables/useTmdb.ts`: `buildTmdbUrl` (pure, tested) injects `language` always, `watch_region` only when `opts.watchRegion`. Only `/discover/movie` and `/watch/providers/movie` pass `watchRegion: true` — correct.
- Refetch wiring in App.vue: `watch(language)`→loadGenres; `watch(tmdbLang)`→refetch movies; `watch(region)`→loadProviders→(refetch via selectedProviders watcher OR direct). Region-change refetch is de-duped (commit 38d12ea) — exactly one refetch path. Stale responses guarded by `fetchSeq`/`providersSeq`.

**Why:** Understanding this prevents re-flagging the singleton pattern as a bug and helps judge future locale-dependent changes.

**How to apply:** When reviewing locale/TMDB changes, trace through these watchers. New TMDB endpoints that are region-specific must pass `watchRegion: true`.

Known pre-existing gap (NOT introduced by branch, do not flag as new): the Start at / Done by time dropdown in App.vue (`timeOptions`, `parseTimeToMinutes`) formats with browser default locale via `toLocaleTimeString([])`, not the app locale — inconsistent with `fmt.clock()`. Unchanged by the i18n branch.

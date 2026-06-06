# Saved Services List + Add/Remove Menu Design

**Date:** 2026-06-05
**Status:** Approved (pending spec review)

## Goal

Replace the current "My services" UI — which renders every provider available in the region as a
toggle pill — with a **saved list**: only selected services show as pills, and a `+` button opens a
searchable menu to add or remove services.

## Behavior

- **Selected pills.** "My services" shows only the services the user has selected, each as an active
  pill (colored dot + name + the existing brand-color glow), with a `×` control to remove it.
- **`+` trigger.** A button at the end of the pill row opens a popover.
  - When **no** services are selected, the trigger is shown as a labeled **"+ Add services"** button
    for discoverability.
  - When services are selected, it collapses to a compact `+`.
- **Add/remove menu (popover).** Lists every provider available in the current region, one row each:
  logo + name + a check state. Clicking a row toggles membership (add or remove). The popover **stays
  open** so several services can be toggled in one session; it closes on `Esc` or click-outside.
- **Search box.** A text input at the top of the popover filters the listed providers by name
  (case-insensitive substring). Empty query shows all. Clearing the query restores the full list.
- **Region switch.** Selecting a new region already prunes selections to what is available there
  (`loadProviders` in `App.vue`); the selected pills and the menu's list update reactively.

## Architecture

`App.vue` is already large (~1130 lines) and this introduces a popover with its own open/keyboard/
click-outside lifecycle. That interaction is a self-contained unit, so it is extracted.

### New component: `src/components/ServiceMenu.vue`

Owns the `+` trigger and the popover (search + checklist). Presentational + interaction only — it
does **not** own the selection Set, persistence, or refetch (those stay in `App.vue`).

- **Props:**
  - `providers: Provider[]` — the region's available providers (`{ id, name, color, logoPath }`).
  - `selected: Set<number>` — the currently selected provider ids (for check state + empty-state label).
- **Emits:**
  - `toggle: [id: number]` — user toggled a provider's membership.
- **Internal state:** `open: boolean`, `query: string`. Filtered list is a computed over
  `providers` + `query`. Document-level `keydown` (Esc closes) and `click` (outside closes) listeners
  registered in `onMounted` / removed in `onUnmounted`, mirroring the rating-popover pattern already
  used in `MovieModal.vue`. Clicking inside the popover does not close it (`@click.stop`).
- **Rendering:** trigger button (compact `+` when `selected.size > 0`, else "+ Add services");
  popover with a search `<input>` and a scrollable list of provider rows. Each row shows the logo
  (`https://image.tmdb.org/t/p/w45{logoPath}`, or a colored dot fallback when `logoPath` is null),
  the name, and a checkbox/checkmark reflecting `selected.has(id)`. Row click emits `toggle(id)`.

### `App.vue` changes

- The "My services" block renders **selected** pills only:
  `providers.filter(p => selected.has(p.id))`. Each pill keeps its active styling and gains a `×`
  button whose click calls the existing toggle logic for that provider.
- Add a small helper `toggleProviderById(id: number)` (or reuse `toggleProvider` by id lookup) so the
  `×` and the menu both funnel through the existing Set-update + persistence + refetch path. No change
  to `selectedProviders`, its `watch` persistence, `loadProviders`, or refetch wiring.
- Mount `<ServiceMenu :providers="providers" :selected="selectedProviders" @toggle="toggleProviderById" />`
  at the end of the pill row.

## i18n

Add to all six catalogs (`en/es/fr/de/ja/ar`), under `controls`:

- `controls.addServices` — "Add services" (empty-state trigger label + popover heading).
- `controls.searchServices` — "Search services" (search input placeholder / aria-label).
- `controls.removeService` — "Remove {service}" (the `×` button aria-label; `{service}` placeholder).

The parity test enforces presence + placeholder preservation across locales.

## Testing

`src/components/ServiceMenu.test.ts` (Vitest + @vue/test-utils + happy-dom, already configured):

- Clicking the trigger opens the popover; it is closed initially.
- The list renders one row per provider; check state reflects the `selected` prop.
- Clicking a provider row emits `toggle` with that provider's id.
- Typing in the search box filters rows by name (case-insensitive); clearing restores all.
- Pressing `Esc` closes the popover.

## Out of Scope (YAGNI)

- Drag-reorder of selected services.
- A separate "saved vs active" distinction — the selected Set *is* the saved list.
- Server-side or fuzzy search — simple case-insensitive substring match over ≤16 local items.
- Keyboard arrow-navigation within the list (Esc + click suffice; revisit if needed).

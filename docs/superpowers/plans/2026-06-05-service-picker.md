# Saved Services Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "My services" show only the user's selected streaming services as removable pills, with a `+` button that opens a searchable menu to add or remove services.

**Architecture:** Extract the add/remove popover into a new `ServiceMenu.vue` component (owns its open/search/keyboard/click-outside lifecycle, mirroring the rating-popover pattern in `MovieModal.vue`). It is presentational + interaction only — it emits `toggle(id)` and `App.vue` keeps owning the selection Set, persistence, and refetch. `App.vue`'s "My services" block renders selected-only pills with a `×`, and mounts `ServiceMenu`.

**Tech Stack:** Vue 3 (`<script setup>`), TypeScript, Tailwind v4, vue-i18n, lucide-vue-next, Vitest + @vue/test-utils + happy-dom.

---

## File Structure

**Create:**
- `src/components/ServiceMenu.vue` — the `+` trigger + searchable add/remove popover.
- `src/components/ServiceMenu.test.ts` — component tests (open/close, rows, toggle emit, search, Esc).

**Modify:**
- `src/locales/{en,es,fr,de,ja,ar}.json` — add `controls.addServices`, `controls.searchServices`, `controls.removeService`.
- `src/App.vue` — selected-only pills with `×`, mount `ServiceMenu`, replace `toggleProvider(p)` with `toggleProviderById(id)`, add `selectedProviderList` computed, import `ServiceMenu` + `X`.

---

## Task 1: Add i18n keys for the service picker

**Files:**
- Modify: `src/locales/en.json`, `es.json`, `fr.json`, `de.json`, `ja.json`, `ar.json`

- [ ] **Step 1: Add the three keys to each catalog's `controls` object**

In every file, inside the existing `"controls": { ... }` object, add these three keys (keep existing
keys; mind trailing commas so the JSON stays valid). The `{service}` placeholder MUST be preserved
verbatim in every language.

`en.json` — add:
```json
    "addServices": "Add services",
    "searchServices": "Search services",
    "removeService": "Remove {service}"
```

`es.json` — add:
```json
    "addServices": "Añadir servicios",
    "searchServices": "Buscar servicios",
    "removeService": "Quitar {service}"
```

`fr.json` — add:
```json
    "addServices": "Ajouter des services",
    "searchServices": "Rechercher des services",
    "removeService": "Retirer {service}"
```

`de.json` — add:
```json
    "addServices": "Dienste hinzufügen",
    "searchServices": "Dienste suchen",
    "removeService": "{service} entfernen"
```

`ja.json` — add:
```json
    "addServices": "サービスを追加",
    "searchServices": "サービスを検索",
    "removeService": "{service} を削除"
```

`ar.json` — add:
```json
    "addServices": "إضافة خدمات",
    "searchServices": "البحث عن خدمات",
    "removeService": "إزالة {service}"
```

- [ ] **Step 2: Run the parity test to confirm all catalogs stay in sync**

Run: `bun run test src/locales/parity.test.ts`
Expected: PASS — every locale has the new keys, no empty values, and `{service}` preserved in each.

- [ ] **Step 3: Commit**

```bash
git add src/locales
git commit -m "feat(i18n): add service-picker strings (add/search/remove)"
```

---

## Task 2: ServiceMenu component (TDD)

**Files:**
- Create: `src/components/ServiceMenu.test.ts`
- Create: `src/components/ServiceMenu.vue`

- [ ] **Step 1: Write the failing component test**

Create `src/components/ServiceMenu.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ServiceMenu from './ServiceMenu.vue'
import { i18n } from '../i18n'

const providers = [
  { id: 8, name: 'Netflix', color: '#E50914', logoPath: null },
  { id: 15, name: 'Hulu', color: '#1CE783', logoPath: null },
  { id: 337, name: 'Disney+', color: '#1133A6', logoPath: null },
]

function mountMenu(selected = new Set<number>()) {
  return mount(ServiceMenu, {
    props: { providers, selected },
    global: { plugins: [i18n], stubs: { transition: true } },
    attachTo: document.body,
  })
}

describe('ServiceMenu', () => {
  beforeEach(() => { i18n.global.locale.value = 'en' })

  it('is closed initially', () => {
    const w = mountMenu()
    expect(w.find('.svc-popover').exists()).toBe(false)
  })

  it('opens the popover when the trigger is clicked', async () => {
    const w = mountMenu()
    await w.find('.add-btn').trigger('click')
    expect(w.find('.svc-popover').exists()).toBe(true)
  })

  it('renders one row per provider with check state from selected', async () => {
    const w = mountMenu(new Set([8]))
    await w.find('.add-btn').trigger('click')
    expect(w.findAll('.svc-row')).toHaveLength(3)
    expect(w.findAll('.svc-row.checked')).toHaveLength(1)
  })

  it('emits toggle with the provider id when a row is clicked', async () => {
    const w = mountMenu()
    await w.find('.add-btn').trigger('click')
    await w.findAll('.svc-row')[1]!.trigger('click')
    expect(w.emitted('toggle')).toBeTruthy()
    expect(w.emitted('toggle')![0]).toEqual([15])
  })

  it('filters rows by the search query (case-insensitive)', async () => {
    const w = mountMenu()
    await w.find('.add-btn').trigger('click')
    await w.find('.svc-search-input').setValue('DIS')
    const rows = w.findAll('.svc-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.text()).toContain('Disney+')
  })

  it('closes on Escape', async () => {
    const w = mountMenu()
    await w.find('.add-btn').trigger('click')
    expect(w.find('.svc-popover').exists()).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(w.find('.svc-popover').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/components/ServiceMenu.test.ts`
Expected: FAIL — cannot resolve `./ServiceMenu.vue`.

- [ ] **Step 3: Implement `src/components/ServiceMenu.vue`**

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Check, Search } from 'lucide-vue-next'

interface Provider { id: number; name: string; color: string; logoPath: string | null }

const props = defineProps<{
  providers: Provider[]
  selected: Set<number>
}>()
const emit = defineEmits<{ toggle: [id: number] }>()

const { t } = useI18n()
const open = ref(false)
const query = ref('')
const rootEl = ref<HTMLElement | null>(null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.providers
  return props.providers.filter(p => p.name.toLowerCase().includes(q))
})

function logoUrl(p: Provider): string | null {
  return p.logoPath ? `https://image.tmdb.org/t/p/w45${p.logoPath}` : null
}

function closeMenu() {
  open.value = false
  query.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) closeMenu()
}
function onClickOutside(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as HTMLElement
  if (rootEl.value && !rootEl.value.contains(target)) closeMenu()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div ref="rootEl" class="svc-root">
    <button
      class="add-btn"
      :class="{ labeled: selected.size === 0 }"
      :aria-label="t('controls.addServices')"
      @click.stop="open ? closeMenu() : (open = true)"
    >
      <Plus :size="16" />
      <span v-if="selected.size === 0">{{ t('controls.addServices') }}</span>
    </button>

    <Transition name="svc-popover">
      <div v-if="open" class="svc-popover" @click.stop>
        <div class="svc-search">
          <Search :size="14" class="svc-search-icon" />
          <input
            v-model="query"
            type="text"
            class="svc-search-input"
            :placeholder="t('controls.searchServices')"
            :aria-label="t('controls.searchServices')"
          />
        </div>
        <ul class="svc-list">
          <li v-for="p in filtered" :key="p.id">
            <button
              class="svc-row"
              :class="{ checked: selected.has(p.id) }"
              :style="{ '--c': p.color }"
              @click="emit('toggle', p.id)"
            >
              <img v-if="logoUrl(p)" :src="logoUrl(p)!" :alt="p.name" class="svc-logo" />
              <span v-else class="svc-dot" :style="{ background: p.color }" />
              <span class="svc-name">{{ p.name }}</span>
              <Check v-if="selected.has(p.id)" :size="14" class="svc-check" />
            </button>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@reference "../style.css";

.svc-root {
  @apply relative inline-block;
}

.add-btn {
  @apply inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised
         text-text-muted font-body text-[13px] font-medium cursor-pointer h-[42px] px-3.5;
  transition: border-color 0.3s ease, color 0.3s ease, background 0.3s ease, transform 0.15s ease;
}
.add-btn.labeled {
  @apply px-5;
}
@media (hover: hover) and (pointer: fine) {
  .add-btn:hover {
    @apply border-border-hover text-text-secondary bg-surface-alt;
  }
}
.add-btn:active {
  transform: scale(0.97);
}
@media (max-width: 640px) {
  .add-btn { min-height: 44px; }
}

.svc-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 40;
  width: 240px;
  max-width: calc(100vw - 40px);
  padding: 8px;
  border-radius: 12px;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border-hover);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}
[dir="rtl"] .svc-popover {
  left: auto;
  right: 0;
}

.svc-search {
  @apply flex items-center gap-2 px-2.5 mb-2 rounded-lg border border-border bg-surface-raised;
}
.svc-search-icon {
  @apply text-text-dim shrink-0;
}
.svc-search-input {
  @apply w-full bg-transparent border-0 outline-none py-2 text-[13px] text-text-secondary;
}
.svc-search-input::placeholder {
  @apply text-text-dim;
}

.svc-list {
  @apply list-none m-0 p-0 flex flex-col gap-0.5 max-h-64 overflow-y-auto;
}

.svc-row {
  @apply w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border-0 bg-transparent cursor-pointer
         text-[13px] text-text-muted text-start;
  transition: background 0.2s ease, color 0.2s ease;
}
@media (hover: hover) and (pointer: fine) {
  .svc-row:hover {
    background: color-mix(in srgb, var(--c) 10%, transparent);
    color: var(--color-text-secondary);
  }
}
.svc-row.checked {
  color: color-mix(in srgb, var(--c) 85%, white);
}
.svc-logo {
  @apply w-5 h-5 rounded shrink-0 object-cover;
}
.svc-dot {
  @apply w-2.5 h-2.5 rounded-full shrink-0;
}
.svc-name {
  @apply flex-1 min-w-0 truncate;
}
.svc-check {
  @apply shrink-0;
  color: var(--c);
}

.svc-popover-enter-active {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.svc-popover-leave-active {
  transition: opacity 0.15s ease;
}
.svc-popover-enter-from {
  opacity: 0;
  transform: scale(0.97) translateY(-4px);
}
.svc-popover-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .add-btn,
  .svc-row,
  .svc-popover-enter-active,
  .svc-popover-leave-active {
    transition-duration: 0.01s !important;
  }
}
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/components/ServiceMenu.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Build to type-check**

Run: `bun run build`
Expected: build completes with no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ServiceMenu.vue src/components/ServiceMenu.test.ts
git commit -m "feat: add ServiceMenu searchable add/remove popover"
```

---

## Task 3: Wire ServiceMenu into App.vue and show selected-only pills

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Import `ServiceMenu` and the `X` icon**

In `src/App.vue` `<script setup>`, add `X` to the existing `lucide-vue-next` import (it currently
imports `Laugh, Flame, Heart, Brain, Skull, Coffee, Headphones, CloudRain, Gem, Bookmark,
CircleCheckBig, ThumbsUp, ThumbsDown`). Then add the component import alongside the other component
imports (near `import LocaleSwitcher from './components/LocaleSwitcher.vue'`):
```ts
import ServiceMenu from './components/ServiceMenu.vue'
```

- [ ] **Step 2: Replace `toggleProvider(p)` with `toggleProviderById(id)` and add `selectedProviderList`**

In `src/App.vue`, replace the existing function (currently around lines 310-315):
```ts
function toggleProvider(p: Provider) {
  const next = new Set(selectedProviders.value)
  if (next.has(p.id)) next.delete(p.id)
  else next.add(p.id)
  selectedProviders.value = next
}
```
with:
```ts
function toggleProviderById(id: number) {
  const next = new Set(selectedProviders.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedProviders.value = next
}

const selectedProviderList = computed(() =>
  providers.value.filter(p => selectedProviders.value.has(p.id))
)
```
(`computed` is already imported in App.vue. `toggleProvider` had only one caller — the provider pill
— which this task removes, so deleting it leaves no dangling references.)

- [ ] **Step 3: Replace the "My services" pill block in the template**

Find the current block (around lines 560-575):
```html
        <div>
          <p class="control-label">{{ t('controls.myServices') }}</p>
          <div class="flex flex-wrap gap-2.5">
            <button
              v-for="p in providers"
              :key="p.id"
              class="pill-btn"
              :class="{ active: selectedProviders.has(p.id) }"
              :style="{ '--c': p.color }"
              @click="toggleProvider(p)"
            >
              <span class="pill-dot" :style="{ background: p.color }" />
              {{ p.name }}
            </button>
          </div>
        </div>
```
Replace it with:
```html
        <div>
          <p class="control-label">{{ t('controls.myServices') }}</p>
          <div class="flex flex-wrap items-center gap-2.5">
            <div
              v-for="p in selectedProviderList"
              :key="p.id"
              class="pill-btn active"
              :style="{ '--c': p.color }"
            >
              <span class="pill-dot" :style="{ background: p.color }" />
              {{ p.name }}
              <button
                class="pill-remove"
                :aria-label="t('controls.removeService', { service: p.name })"
                @click="toggleProviderById(p.id)"
              >
                <X :size="12" />
              </button>
            </div>
            <ServiceMenu :providers="providers" :selected="selectedProviders" @toggle="toggleProviderById" />
          </div>
        </div>
```

- [ ] **Step 4: Add the `.pill-remove` style**

In `src/App.vue` `<style scoped>`, just after the `.pill-dot` / `.pill-btn.active .pill-dot` rules
(search for `.pill-dot {`), add:
```css
.pill-remove {
  @apply inline-flex items-center justify-center ms-0.5 -me-1.5 p-0.5 rounded-full border-0 bg-transparent cursor-pointer;
  color: color-mix(in srgb, var(--c) 70%, white);
  opacity: 0.6;
  transition: opacity 0.2s ease, background 0.2s ease;
}
@media (hover: hover) and (pointer: fine) {
  .pill-remove:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--c) 20%, transparent);
  }
}
.pill-remove:active {
  transform: scale(0.9);
}
```

- [ ] **Step 5: Build to type-check and verify no dangling references**

Run: `bun run build`
Expected: build completes with no type errors. (Grep `src/App.vue` for `toggleProvider(` — only
`toggleProviderById` should remain; the old `toggleProvider` and the `v-for="p in providers"` pill
loop are gone.)

- [ ] **Step 6: Run the full test suite**

Run: `bun run test`
Expected: all tests pass (existing 39 + the 6 new ServiceMenu tests = 45).

- [ ] **Step 7: Commit**

```bash
git add src/App.vue
git commit -m "feat: show selected-only service pills with remove and add menu"
```

---

## Task 4: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the app and verify behavior**

Run `bun dev`, select a region with providers, and confirm:
- With nothing selected, "My services" shows a single **"+ Add services"** button.
- Clicking it opens the popover; the search box filters providers by name as you type.
- Clicking a provider row adds it (check appears) and a pill appears in "My services"; the popover
  stays open so you can add several.
- Each selected pill shows a `×`; clicking it removes the service (pill disappears, results refetch).
- Clicking outside the popover or pressing `Esc` closes it.
- Switch language to العربية: the popover anchors to the correct side and strings are translated.
- Switch region: the menu list and selected pills update; providers not in the new region drop out.

---

## Self-Review Notes (plan vs spec)

- **Selected-only pills + `×` remove:** Task 3 (Steps 3-4). ✓
- **`+` trigger, compact vs "+ Add services" empty-state label:** Task 2 (`add-btn` + `labeled`). ✓
- **Searchable add/remove popover, stays open, Esc/click-outside close:** Task 2 (component + tests). ✓
- **Logo checklist with dot fallback:** Task 2 (`svc-logo` / `svc-dot`). ✓
- **Extraction into `ServiceMenu`, App keeps Set/persistence/refetch:** Task 3 routes both `×` and the
  menu through `toggleProviderById`; `selectedProviders` watch + `loadProviders` untouched. ✓
- **i18n keys (addServices/searchServices/removeService) in all 6 locales, `{service}` preserved:**
  Task 1, enforced by parity test. ✓
- **Tests (open/close, rows, toggle emit, search, Esc):** Task 2 Step 1. ✓
- **RTL popover anchoring:** Task 2 (`[dir="rtl"] .svc-popover`). ✓
- **Type consistency:** `Provider` shape `{ id, name, color, logoPath }` matches App's interface;
  `toggleProviderById(id: number)` is the single mutation path used by both the `×` and the menu's
  `@toggle`; `selectedProviderList` is the computed feeding the pills. ✓
- **No placeholders:** all code and translations are concrete. ✓

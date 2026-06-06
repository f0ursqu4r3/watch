<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Check, Search, X } from 'lucide-vue-next'

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
const searchInput = ref<HTMLInputElement | null>(null)

function clearSearch() {
  query.value = ''
  searchInput.value?.focus()
}

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
            ref="searchInput"
            v-model="query"
            type="text"
            class="svc-search-input"
            :placeholder="t('controls.searchServices')"
            :aria-label="t('controls.searchServices')"
          />
          <button
            v-if="query"
            class="svc-search-clear"
            :aria-label="t('controls.clearSearch')"
            @click="clearSearch"
          >
            <X :size="14" />
          </button>
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
.svc-search-clear {
  @apply inline-flex items-center justify-center shrink-0 p-0.5 -me-0.5 rounded-full
         border-0 bg-transparent cursor-pointer text-text-dim;
  transition: color 0.2s ease, background 0.2s ease;
}
@media (hover: hover) and (pointer: fine) {
  .svc-search-clear:hover {
    @apply text-text-secondary;
    background: rgba(255, 255, 255, 0.06);
  }
}

.svc-list {
  @apply list-none m-0 p-0 flex flex-col gap-0.5 max-h-64 overflow-y-auto overscroll-contain;
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

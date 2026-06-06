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

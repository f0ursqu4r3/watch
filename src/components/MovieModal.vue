<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  movie: any
  accentColor: string
  flipOrigin: { x: number; y: number; w: number; h: number } | null
  startAt: number | null
  providers: { id: number; name: string; color: string }[]
}>()

const emit = defineEmits<{ close: []; 'search-person': [person: { id: number; name: string }] }>()
const backdropEl = ref<HTMLElement | null>(null)
const modalCardEl = ref<HTMLElement | null>(null)
const animating = ref(false)
const backdropVisible = ref(false)

const liveClock = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | null = null

const effectiveStart = computed(() => props.startAt ?? liveClock.value)

function fmtRuntime(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const startTimeDisplay = computed(() =>
  new Date(effectiveStart.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
)

const endTimeDisplay = computed(() => {
  if (!props.movie.runtime) return ''
  const end = new Date(effectiveStart.value + props.movie.runtime * 60000)
  return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

const backdrop = computed(() =>
  props.movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${props.movie.backdrop_path}`
    : null
)

const poster = computed(() =>
  props.movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${props.movie.poster_path}`
    : null
)

const year = computed(() => props.movie.release_date?.slice(0, 4) || '')

const genres = computed(() =>
  props.movie.genres?.map((g: any) => g.name) || []
)

const directorObj = computed(() =>
  props.movie.credits?.crew?.find((c: any) => c.job === 'Director') || null
)

const cast = computed(() =>
  (props.movie.credits?.cast || []).slice(0, 6)
)

const trailer = computed(() => {
  const vids = props.movie.videos?.results || []
  return vids.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
    || vids.find((v: any) => v.site === 'YouTube')
    || null
})

const certification = computed(() => {
  const releases = props.movie.release_dates?.results || []
  const us = releases.find((r: any) => r.iso_3166_1 === 'US')
  if (!us) return ''
  const cert = us.release_dates.find((d: any) => d.certification)?.certification || ''
  return cert
})

function onBackdropClick(e: MouseEvent) {
  if (animating.value) return
  if (e.target === e.currentTarget) closeWithAnimation()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !animating.value) closeWithAnimation()
}

function closeWithAnimation() {
  const card = modalCardEl.value
  if (!card || !props.flipOrigin) {
    emit('close')
    return
  }

  animating.value = true
  backdropVisible.value = false

  // Get current modal card rect
  const modalRect = card.getBoundingClientRect()

  // Calculate transform to go back to card position
  const scaleX = props.flipOrigin.w / modalRect.width
  const scaleY = props.flipOrigin.h / modalRect.height
  const dx = (props.flipOrigin.x + props.flipOrigin.w / 2) - (modalRect.left + modalRect.width / 2)
  const dy = (props.flipOrigin.y + props.flipOrigin.h / 2) - (modalRect.top + modalRect.height / 2)

  card.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, border-radius 0.45s ease'
  card.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`
  card.style.opacity = '0.3'
  card.style.borderRadius = '12px'

  card.addEventListener('transitionend', () => {
    emit('close')
  }, { once: true })

  // Safety timeout
  setTimeout(() => emit('close'), 500)
}

function animateIn() {
  const card = modalCardEl.value
  if (!card || !props.flipOrigin) {
    backdropVisible.value = true
    return
  }

  animating.value = true

  // Wait a frame so the card is laid out at its final position
  requestAnimationFrame(() => {
    const modalRect = card.getBoundingClientRect()

    // Calculate transform from card origin to modal final position
    const scaleX = props.flipOrigin!.w / modalRect.width
    const scaleY = props.flipOrigin!.h / modalRect.height
    const dx = (props.flipOrigin!.x + props.flipOrigin!.w / 2) - (modalRect.left + modalRect.width / 2)
    const dy = (props.flipOrigin!.y + props.flipOrigin!.h / 2) - (modalRect.top + modalRect.height / 2)

    // Set initial state (at card position)
    card.style.transition = 'none'
    card.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`
    card.style.opacity = '0.5'
    card.style.borderRadius = '12px'

    // Force reflow
    card.offsetHeight

    // Animate to final position
    card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease, border-radius 0.5s ease'
    card.style.transform = 'translate(0, 0) scale(1)'
    card.style.opacity = '1'
    card.style.borderRadius = ''

    backdropVisible.value = true

    card.addEventListener('transitionend', () => {
      animating.value = false
      card.style.transition = ''
      card.style.transform = ''
    }, { once: true })
  })
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  backdropEl.value?.focus()
  animateIn()
  if (props.startAt == null) {
    clockTimer = setInterval(() => { liveClock.value = Date.now() }, 1000)
  }
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="backdropEl"
      class="fixed inset-0 z-1000 flex items-center justify-center p-6 overflow-y-auto max-sm:p-0 max-sm:items-end"
      :style="{ '--accent': accentColor }"
      @click="onBackdropClick"
      tabindex="-1"
    >
      <!-- Backdrop blur + tinted overlay -->
      <div class="backdrop-layer absolute inset-0 bg-black/70 backdrop-blur-xl pointer-events-none" :class="{ visible: backdropVisible }" />
      <div class="backdrop-layer absolute inset-0 modal-ambient pointer-events-none" :class="{ visible: backdropVisible }" />

      <!-- Modal card -->
      <div ref="modalCardEl" class="modal-card relative w-full max-w-[680px] overflow-hidden max-sm:max-w-full max-sm:rounded-b-none max-sm:max-h-[92vh] max-sm:overflow-y-auto">
        <!-- Close -->
        <button
          class="absolute top-4 right-4 z-20 w-10 h-10 rounded-full border border-white/8 bg-black/40 backdrop-blur-xl text-text-muted cursor-pointer flex items-center justify-center transition-all duration-300 hover:bg-black/60 hover:text-white hover:border-white/15 hover:scale-110"
          @click="closeWithAnimation"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <!-- Hero backdrop -->
        <div class="relative w-full aspect-[16/8] overflow-hidden">
          <img v-if="backdrop" :src="backdrop" :alt="movie.title" class="w-full h-full object-cover block scale-105" />
          <div v-else class="w-full h-full bg-linear-to-br from-surface-alt to-surface" />
          <div class="hero-fade" />
          <!-- Accent colored line at bottom of hero -->
          <div class="absolute bottom-0 left-0 right-0 h-px" :style="{ background: `linear-gradient(90deg, transparent 0%, ${accentColor}30 50%, transparent 100%)` }" />
        </div>

        <!-- Body -->
        <div class="px-8 pb-8 max-sm:px-5 max-sm:pb-6">
          <!-- Poster + heading -->
          <div class="flex gap-6 -mt-14 relative z-2">
            <div v-if="poster" class="poster-frame shrink-0">
              <img :src="poster" :alt="movie.title" class="w-full h-full object-cover rounded-lg" />
            </div>
            <div class="pt-[60px] min-w-0 flex-1">
              <h2 class="font-display text-2xl max-sm:text-xl font-bold text-text-primary m-0 mb-2.5 leading-snug">
                {{ movie.title }}
              </h2>
              <div class="flex items-center gap-3 flex-wrap">
                <span v-if="certification" class="text-[11px] font-medium tracking-wide px-1.5 py-0.5 rounded border border-text-dim text-text-muted">{{ certification }}</span>
                <span v-if="year" class="text-[13px] text-text-secondary font-medium">{{ year }}</span>
                <span v-if="movie.runtime" class="text-[13px] font-mono font-medium tabular-nums" :style="{ color: accentColor }">
                  {{ fmtRuntime(movie.runtime) }}
                </span>
                <span v-if="movie.vote_average > 0" class="text-[13px] text-text-secondary font-medium flex items-center gap-1">
                  <span class="text-gold text-xs">&#9733;</span>
                  {{ movie.vote_average.toFixed(1) }}
                </span>
              </div>
              <!-- Genre pills -->
              <div v-if="genres.length" class="flex flex-wrap gap-1.5 mt-3">
                <span v-for="g in genres" :key="g" class="text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full border border-border text-text-muted bg-surface/50">
                  {{ g }}
                </span>
              </div>
              <!-- Streaming services -->
              <div v-if="providers.length" class="flex flex-wrap gap-1.5 mt-3">
                <span
                  v-for="prov in providers"
                  :key="prov.id"
                  class="streaming-pill"
                  :style="{ '--prov-color': prov.color }"
                >
                  <span class="streaming-dot" :style="{ background: prov.color }" />
                  {{ prov.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- Overview -->
          <p v-if="movie.overview" class="mt-7 text-[14px] leading-[1.8] text-text-secondary">
            {{ movie.overview }}
          </p>

          <!-- Director & Cast -->
          <div v-if="directorObj || cast.length" class="credits-section mt-7">
            <div v-if="directorObj" class="credit-row">
              <span class="credit-label">Directed by</span>
              <button class="person-link" @click="emit('search-person', { id: directorObj.id, name: directorObj.name })">{{ directorObj.name }}</button>
            </div>
            <div v-if="directorObj && cast.length" class="credit-divider" />
            <div v-if="cast.length" class="cast-list">
              <div v-for="person in cast" :key="person.id" class="cast-row">
                <button class="person-link" @click="emit('search-person', { id: person.id, name: person.name })">{{ person.name }}</button>
                <span v-if="person.character" class="cast-role">as {{ person.character }}</span>
              </div>
            </div>
          </div>

          <!-- Trailer -->
          <a
            v-if="trailer"
            :href="`https://www.youtube.com/watch?v=${trailer.key}`"
            target="_blank"
            rel="noopener"
            class="trailer-btn mt-7"
            :style="{ '--accent': accentColor }"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <span>Watch Trailer</span>
          </a>

          <!-- Timing bar -->
          <div v-if="movie.runtime" class="timing-bar mt-7">
            <div class="flex flex-col gap-1.5">
              <span class="text-[9px] tracking-[3px] uppercase text-text-dim font-medium">Runtime</span>
              <span class="text-[15px] font-mono font-medium tabular-nums text-text-primary">
                {{ fmtRuntime(movie.runtime) }}
              </span>
            </div>
            <div class="w-px h-10 self-center" :style="{ background: `${accentColor}20` }" />
            <div class="flex flex-col gap-1.5">
              <span class="text-[9px] tracking-[3px] uppercase text-text-dim font-medium">Start</span>
              <span class="text-[15px] font-mono font-medium tabular-nums text-text-secondary">
                {{ startTimeDisplay }}
              </span>
            </div>
            <div class="w-px h-10 self-center" :style="{ background: `${accentColor}20` }" />
            <div class="flex flex-col gap-1.5">
              <span class="text-[9px] tracking-[3px] uppercase text-text-dim font-medium">Done by</span>
              <span class="text-[15px] font-mono font-medium tabular-nums" :style="{ color: accentColor }">
                {{ endTimeDisplay }}
              </span>
            </div>
          </div>

          <!-- Tagline -->
          <p v-if="movie.tagline" class="mt-7 font-display italic text-[15px] text-text-muted text-center leading-relaxed opacity-70">
            &ldquo;{{ movie.tagline }}&rdquo;
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@reference "../style.css";

.modal-ambient {
  background: radial-gradient(ellipse 60% 40% at 50% 30%, color-mix(in srgb, var(--accent) 5%, transparent) 0%, transparent 70%);
}

.modal-card {
  @apply rounded-2xl;
  will-change: transform, opacity;
  transform-origin: center center;
  background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-raised) 100%);
  border: 1px solid var(--color-border);
  box-shadow:
    0 50px 100px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.hero-fade {
  @apply absolute inset-0;
  background: linear-gradient(
    to top,
    var(--color-surface) 0%,
    rgba(10, 15, 21, 0.6) 40%,
    transparent 70%
  );
}

.poster-frame {
  width: 100px;
  aspect-ratio: 2/3;
  border-radius: 10px;
  overflow: hidden;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.04);
}

.timing-bar {
  @apply flex gap-6 p-5 rounded-xl;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.credits-section {
  @apply rounded-xl;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
  padding: 16px 20px;
}
.credit-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.credit-label {
  @apply text-[11px] text-text-muted;
}
.credit-divider {
  height: 1px;
  background: var(--color-border);
  margin: 12px 0;
}
.cast-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px 20px;
}
@media (max-width: 640px) {
  .cast-list { grid-template-columns: 1fr; }
}
.cast-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.cast-row .person-link {
  flex-shrink: 0;
}
.cast-role {
  @apply text-[11px] text-text-muted;
  overflow: hidden;
  text-overflow: ellipsis;
}

.streaming-pill {
  @apply inline-flex items-center gap-1.5 text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full;
  color: var(--prov-color);
  background: color-mix(in srgb, var(--prov-color) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--prov-color) 15%, transparent);
}
.streaming-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  box-shadow: 0 0 4px currentColor;
}

.person-link {
  @apply bg-transparent border-0 p-0 cursor-pointer text-[13px] font-medium;
  color: var(--color-text-primary);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--accent) 30%, transparent);
  text-underline-offset: 3px;
  transition: text-decoration-color 0.2s;
}
.person-link:hover {
  text-decoration-color: var(--accent);
}

.trailer-btn {
  @apply inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[13px] font-medium no-underline;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 15%, transparent);
  transition: all 0.3s ease;
  width: fit-content;
}
.trailer-btn:hover {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
}

/* Backdrop fade */
.backdrop-layer {
  opacity: 0;
  transition: opacity 0.4s ease;
}
.backdrop-layer.visible {
  opacity: 1;
}

@media (max-width: 640px) {
  .poster-frame { width: 76px; }
}
</style>

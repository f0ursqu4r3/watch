<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown, CircleCheckBig } from 'lucide-vue-next'

const props = defineProps<{
  movie: any
  accentColor: string
  flipOrigin: { x: number; y: number; w: number; h: number } | null
  startAt: number | null
  deadlineMs: number | null
  providers: { id: number; name: string; color: string; logo: string | null; link: string | null }[]
  isInWatchlist: boolean
  isWatched: boolean
  watchedRating: 'loved' | 'good' | 'meh' | 'awful' | null
}>()

const emit = defineEmits<{ close: []; 'search-person': [person: { id: number; name: string }]; 'toggle-watchlist': [movie: any]; 'mark-watched': [movie: any, rating: 'loved' | 'good' | 'meh' | 'awful'] }>()
const backdropEl = ref<HTMLElement | null>(null)
const modalCardEl = ref<HTMLElement | null>(null)
const animating = ref(false)
const backdropVisible = ref(false)

const showRatingPopover = ref(false)

const RATING_OPTIONS = [
  { key: 'awful' as const, color: '#ff5555', label: 'Awful', direction: 'down' as const, double: true },
  { key: 'meh' as const, color: '#f0a030', label: 'Meh', direction: 'down' as const, double: false },
  { key: 'good' as const, color: '#6cb4ee', label: 'Good', direction: 'up' as const, double: false },
  { key: 'loved' as const, color: '#1CE783', label: 'Loved it', direction: 'up' as const, double: true },
] as const

const currentRatingConfig = computed(() => {
  if (!props.watchedRating) return null
  return RATING_OPTIONS.find(r => r.key === props.watchedRating) ?? null
})

function selectRating(rating: 'loved' | 'good' | 'meh' | 'awful') {
  emit('mark-watched', props.movie, rating)
  showRatingPopover.value = false
}

function onClickOutsidePopover(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.rating-popover') && !target.closest('.watched-btn')) {
    showRatingPopover.value = false
  }
}

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

const countdownSecs = computed(() => {
  if (!props.deadlineMs || !props.movie.runtime) return null
  const latestStart = props.deadlineMs - props.movie.runtime * 60000
  return Math.max(0, Math.floor((latestStart - liveClock.value) / 1000))
})

const showCountdown = computed(() =>
  countdownSecs.value != null && countdownSecs.value <= 600
)

const urgency = computed(() => {
  if (countdownSecs.value == null) return null
  const mins = countdownSecs.value / 60
  if (mins <= 5) return 'critical'
  if (mins <= 15) return 'warning'
  return 'normal'
})

function fmtCountdown(totalSecs: number) {
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}

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
  if (e.key === 'Escape') {
    if (showRatingPopover.value) {
      showRatingPopover.value = false
      return
    }
    if (!animating.value) closeWithAnimation()
  }
  if (e.key === 'Tab' && showRatingPopover.value) {
    const popover = document.querySelector('.rating-popover')
    if (!popover) return
    const focusable = popover.querySelectorAll<HTMLElement>('button')
    if (focusable.length === 0) return
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
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

  card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, border-radius 0.3s ease'
  card.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`
  card.style.opacity = '0.3'
  card.style.borderRadius = '12px'

  card.addEventListener('transitionend', () => {
    emit('close')
  }, { once: true })

  // Safety timeout
  setTimeout(() => emit('close'), 350)
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
  document.addEventListener('click', onClickOutsidePopover)
  backdropEl.value?.focus()
  animateIn()
  if (props.startAt == null || props.deadlineMs) {
    clockTimer = setInterval(() => { liveClock.value = Date.now() }, 1000)
  }
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('click', onClickOutsidePopover)
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="backdropEl"
      class="fixed inset-0 z-1000 flex items-start justify-center p-6 overflow-y-auto max-sm:p-0 max-sm:items-end"
      :style="{ '--accent': accentColor }"
      @click="onBackdropClick"
      tabindex="-1"
    >
      <!-- Backdrop blur + tinted overlay -->
      <div class="backdrop-layer absolute inset-0 bg-black/70 backdrop-blur-xl pointer-events-none" :class="{ visible: backdropVisible }" />
      <div class="backdrop-layer absolute inset-0 modal-ambient pointer-events-none" :class="{ visible: backdropVisible }" />

      <!-- Modal card -->
      <div ref="modalCardEl" class="modal-card relative w-full max-w-[680px] max-h-[calc(100vh-48px)] overflow-y-auto my-auto max-sm:max-w-full max-sm:rounded-b-none max-sm:my-0 max-sm:max-h-[92vh]">
        <!-- Close -->
        <button
          class="close-btn absolute top-4 right-4 z-20 w-10 h-10 rounded-full border border-white/8 bg-black/40 backdrop-blur-xl text-text-muted cursor-pointer flex items-center justify-center"
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
          <!-- Countdown badge -->
          <Transition name="badge">
            <div v-if="showCountdown" class="modal-countdown" :class="urgency">
              <span class="text-[10px] text-text-muted mr-1.5">Start within</span>
              <span class="countdown-value">{{ fmtCountdown(countdownSecs!) }}</span>
            </div>
          </Transition>
          <!-- Accent colored line at bottom of hero -->
          <div class="absolute bottom-0 left-0 right-0 h-px" :style="{ background: `linear-gradient(90deg, transparent 0%, ${accentColor}30 50%, transparent 100%)` }" />
        </div>

        <!-- Body -->
        <div class="px-8 pb-8 max-sm:px-5 max-sm:pb-6">
          <!-- Poster + heading -->
          <div class="flex items-start gap-6 -mt-14 relative z-2">
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
                <a
                  v-for="prov in providers"
                  :key="prov.id"
                  :href="prov.link || undefined"
                  :target="prov.link ? '_blank' : undefined"
                  rel="noopener"
                  class="streaming-pill"
                  :class="{ clickable: prov.link }"
                  :style="{ '--prov-color': prov.color }"
                >
                  <img v-if="prov.logo" :src="prov.logo" :alt="prov.name" class="streaming-logo" />
                  <span v-else class="streaming-dot" :style="{ background: prov.color }" />
                  {{ prov.name }}
                  <svg v-if="prov.link" class="link-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
              <!-- Action buttons -->
              <div class="flex items-center gap-2.5 mt-3 flex-wrap">
                <button class="watchlist-btn" :class="{ saved: isInWatchlist }" @click="emit('toggle-watchlist', movie)">
                  <BookmarkCheck v-if="isInWatchlist" :size="14" />
                  <Bookmark v-else :size="14" />
                  {{ isInWatchlist ? 'In My List' : 'Add to My List' }}
                </button>
                <!-- Mark Watched button -->
                <div class="relative">
                  <button
                    v-if="!isWatched"
                    class="watched-btn"
                    @click.stop="showRatingPopover = !showRatingPopover"
                  >
                    <CircleCheckBig :size="14" />
                    Mark Watched
                  </button>
                  <button
                    v-else
                    class="watched-btn rated"
                    :style="{ '--w-color': currentRatingConfig?.color }"
                    @click.stop="showRatingPopover = !showRatingPopover"
                  >
                    <component :is="currentRatingConfig?.direction === 'up' ? ThumbsUp : ThumbsDown" :size="14" />
                    Watched
                  </button>

                <!-- Rating popover -->
                <Transition name="popover">
                  <div v-if="showRatingPopover" class="rating-popover" role="dialog" aria-label="Rate this movie" @click.stop>
                    <span class="popover-label">How was it?</span>
                    <div class="popover-options">
                      <button
                        v-for="opt in RATING_OPTIONS"
                        :key="opt.key"
                        class="popover-rating-btn"
                        :class="{ active: watchedRating === opt.key }"
                        :style="{ '--r-color': opt.color }"
                        :aria-label="opt.label"
                        @click="selectRating(opt.key)"
                      >
                        <template v-if="opt.double">
                          <component :is="opt.direction === 'up' ? ThumbsUp : ThumbsDown" :size="14" />
                          <component :is="opt.direction === 'up' ? ThumbsUp : ThumbsDown" :size="14" style="margin-left: -3px" />
                        </template>
                        <component v-else :is="opt.direction === 'up' ? ThumbsUp : ThumbsDown" :size="14" />
                      </button>
                    </div>
                    <div class="popover-arrow" />
                  </div>
                </Transition>
                </div>
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

.modal-countdown {
  @apply absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg flex items-center;
  font-family: var(--font-mono);
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.modal-countdown .countdown-value {
  @apply text-[13px] font-medium tabular-nums tracking-wider;
  color: var(--color-text-secondary);
}
.modal-countdown.warning {
  border-color: rgba(240, 160, 48, 0.15);
  background: rgba(240, 160, 48, 0.08);
}
.modal-countdown.warning .countdown-value { color: #e8a030; }
.modal-countdown.critical {
  border-color: rgba(255, 68, 68, 0.2);
  background: rgba(255, 68, 68, 0.08);
  animation: modal-badge-pulse 2s ease-in-out infinite;
}
.modal-countdown.critical .countdown-value { color: #ff5555; }

@keyframes modal-badge-pulse {
  0%, 100% { background: rgba(255, 68, 68, 0.08); }
  50% { background: rgba(255, 68, 68, 0.15); }
}

.badge-enter-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.badge-leave-active { transition: all 0.2s ease; }
.badge-enter-from { opacity: 0; transform: scale(0.92) translateY(-4px); }
.badge-leave-to { opacity: 0; transform: scale(0.9); }

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
  min-height: 0;
  aspect-ratio: 2/3;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
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
  @apply inline-flex items-center gap-1.5 text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full no-underline;
  color: var(--prov-color);
  background: color-mix(in srgb, var(--prov-color) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--prov-color) 15%, transparent);
  transition: background 0.2s, border-color 0.2s;
}
@media (hover: hover) and (pointer: fine) {
  .streaming-pill.clickable:hover {
    background: color-mix(in srgb, var(--prov-color) 18%, transparent);
    border-color: color-mix(in srgb, var(--prov-color) 30%, transparent);
  }
}
.link-icon {
  opacity: 0.4;
  transition: opacity 0.2s;
}
@media (hover: hover) and (pointer: fine) {
  .streaming-pill.clickable:hover .link-icon {
    opacity: 0.8;
  }
}
.streaming-logo {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  object-fit: cover;
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
  transition: background 0.3s ease, border-color 0.3s ease;
  width: fit-content;
}
.trailer-btn:hover {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
}
.trailer-btn:active {
  transform: scale(0.97);
}

/* Watchlist button */
.watchlist-btn {
  @apply inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium cursor-pointer border;
  transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
  background: color-mix(in srgb, var(--color-gold) 8%, transparent);
  border-color: color-mix(in srgb, var(--color-gold) 15%, transparent);
  color: var(--color-gold);
}
.watchlist-btn:hover {
  background: color-mix(in srgb, var(--color-gold) 15%, transparent);
  border-color: color-mix(in srgb, var(--color-gold) 25%, transparent);
}
.watchlist-btn:active {
  transform: scale(0.97);
}
.watchlist-btn.saved {
  background: color-mix(in srgb, var(--color-gold) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-gold) 25%, transparent);
}
.watchlist-btn:focus-visible {
  outline: 2px solid var(--color-gold);
  outline-offset: 2px;
}

/* Backdrop fade */
.backdrop-layer {
  opacity: 0;
  transition: opacity 0.4s ease;
}
.backdrop-layer.visible {
  opacity: 1;
}

.close-btn {
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}
.close-btn:active {
  transform: scale(0.95);
}
@media (hover: hover) and (pointer: fine) {
  .close-btn:hover {
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border-color: rgba(255, 255, 255, 0.15);
    transform: scale(1.08);
  }
}

@media (max-width: 640px) {
  .poster-frame { width: 76px; }
}

/* Mark Watched button */
.watched-btn {
  @apply inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium cursor-pointer border;
  transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
  background: color-mix(in srgb, #6cb4ee 8%, transparent);
  border-color: color-mix(in srgb, #6cb4ee 15%, transparent);
  color: #6cb4ee;
}
@media (hover: hover) and (pointer: fine) {
  .watched-btn:hover {
    background: color-mix(in srgb, #6cb4ee 15%, transparent);
    border-color: color-mix(in srgb, #6cb4ee 25%, transparent);
  }
}
.watched-btn:active {
  transform: scale(0.97);
}
.watched-btn:focus-visible {
  outline: 2px solid #6cb4ee;
  outline-offset: 2px;
}
.watched-btn.rated {
  background: color-mix(in srgb, var(--w-color) 12%, transparent);
  border-color: color-mix(in srgb, var(--w-color) 25%, transparent);
  color: var(--w-color);
}

/* Rating popover */
.rating-popover {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border-hover);
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  z-index: 30;
  white-space: nowrap;
}
.popover-label {
  @apply block text-[10px] tracking-[3px] uppercase text-text-dim font-medium mb-2 text-center;
}
.popover-options {
  display: flex;
  gap: 6px;
}
.popover-rating-btn {
  @apply flex items-center justify-center cursor-pointer border bg-transparent;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border-color: rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text-muted);
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, transform 0.15s cubic-bezier(0.23, 1, 0.32, 1);
}
@media (hover: hover) and (pointer: fine) {
  .popover-rating-btn:hover {
    border-color: color-mix(in srgb, var(--r-color) 40%, transparent);
    background: color-mix(in srgb, var(--r-color) 10%, transparent);
    color: var(--r-color);
  }
}
.popover-rating-btn:active {
  transform: scale(0.92);
}
.popover-rating-btn.active {
  border-color: color-mix(in srgb, var(--r-color) 50%, transparent);
  background: color-mix(in srgb, var(--r-color) 15%, transparent);
  color: var(--r-color);
}
.popover-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 12px;
  height: 12px;
  background: var(--color-surface-alt);
  border-right: 1px solid var(--color-border-hover);
  border-bottom: 1px solid var(--color-border-hover);
}

/* Popover transitions */
.popover-enter-active {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.popover-leave-active {
  transition: opacity 0.15s ease;
}
.popover-enter-from {
  opacity: 0;
  transform: translateX(-50%) scale(0.95);
}
.popover-leave-to {
  opacity: 0;
  transform: translateX(-50%);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .modal-card {
    transition: none !important;
  }
  .backdrop-layer {
    transition-duration: 0.01s !important;
  }
  .modal-countdown.critical {
    animation: none;
  }
  .popover-enter-active,
  .popover-leave-active {
    transition-duration: 0.01s !important;
  }
}
</style>

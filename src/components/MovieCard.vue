<script setup lang="ts">
import { ref, computed } from 'vue'
import { Gem, Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown } from 'lucide-vue-next'

const props = defineProps<{
  movie: any
  accentColor: string
  deadlineMs: number | null
  now: number
  startAt: number
  providers: { id: number; name: string; color: string; logo: string | null; link: string | null }[]
  multiService: boolean
  isHiddenGem: boolean
  isInWatchlist: boolean
  entranceIndex?: number
  isWatched: boolean
  watchedRating: 'loved' | 'good' | 'meh' | 'awful' | null
}>()

const emit = defineEmits<{ select: [movie: any, rect?: DOMRect]; 'toggle-watchlist': [movie: any] }>()
const hovered = ref(false)
const cardEl = ref<HTMLElement | null>(null)
const justBookmarked = ref(false)
const posterLoaded = ref(false)

function fmtRuntime(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function endTime(runtime: number) {
  const end = new Date(props.startAt + runtime * 60000)
  return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const countdownSecs = computed(() => {
  if (!props.deadlineMs || !props.movie.runtime) return null
  const latestStart = props.deadlineMs - props.movie.runtime * 60000
  return Math.max(0, Math.floor((latestStart - props.now) / 1000))
})

function fmtCountdown(totalSecs: number) {
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}

const urgency = computed(() => {
  if (countdownSecs.value == null) return null
  const mins = countdownSecs.value / 60
  if (mins <= 5) return 'critical'
  if (mins <= 15) return 'warning'
  return 'normal'
})

const showCountdown = computed(() =>
  countdownSecs.value != null && countdownSecs.value <= 600
)

const poster = props.movie.poster_path
  ? `https://image.tmdb.org/t/p/w342${props.movie.poster_path}`
  : null

function onBookmark() {
  emit('toggle-watchlist', props.movie)
  if (!props.isInWatchlist) {
    justBookmarked.value = true
    setTimeout(() => { justBookmarked.value = false }, 600)
  }
}

const entranceDelay = computed(() =>
  props.entranceIndex != null ? `${Math.min(props.entranceIndex * 0.04, 0.6)}s` : '0s'
)

const glowGradient = computed(() => {
  const colors = props.providers.map(p => p.color)
  if (colors.length <= 1) return null
  // Duplicate first color at end so the conic gradient loops seamlessly
  const stops = [...colors, colors[0]!]
  return `conic-gradient(from 0deg, ${stops.join(', ')})`
})

const ratingConfig = computed(() => {
  const configs: Record<string, { color: string; double: boolean; direction: 'up' | 'down' }> = {
    loved: { color: '#1CE783', double: true, direction: 'up' },
    good: { color: '#6cb4ee', double: false, direction: 'up' },
    meh: { color: '#f0a030', double: false, direction: 'down' },
    awful: { color: '#ff5555', double: true, direction: 'down' },
  }
  return props.watchedRating ? configs[props.watchedRating] ?? null : null
})
</script>

<template>
  <div class="card-wrap" :style="{ ...(glowGradient ? { '--provider-gradient': glowGradient } : {}), '--entrance-delay': entranceDelay }">
    <div v-if="glowGradient" class="glow-ring"><div class="glow-ring-inner" /></div>
    <div
      class="card"
      :class="{ expiring: showCountdown, 'multi-glow': glowGradient }"
      :style="{
        '--accent': accentColor,
        '--glow': showCountdown && urgency === 'critical' ? '#ff4444' : showCountdown ? '#f0a030' : accentColor,
      }"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
      ref="cardEl"
      @click="emit('select', movie, cardEl?.getBoundingClientRect())"
    >
    <button
      class="bookmark-btn"
      :class="{ saved: isInWatchlist, visible: hovered || isInWatchlist, pop: justBookmarked }"
      @click.stop="onBookmark"
    >
      <BookmarkCheck v-if="isInWatchlist" :size="16" />
      <Bookmark v-else :size="16" />
    </button>

    <!-- Poster -->
    <div v-if="poster" class="poster-wrap">
      <div v-if="!posterLoaded" class="poster-shimmer" />
      <img
        :src="poster"
        :alt="movie.title"
        class="poster-img"
        :class="{ loaded: posterLoaded }"
        loading="lazy"
        @load="posterLoaded = true"
      />
    </div>
    <div v-else class="no-poster">
      <span class="font-display italic text-text-dim text-sm leading-snug">{{ movie.title }}</span>
    </div>

    <!-- Expiring border glow -->
    <div v-if="showCountdown" class="expiring-glow" :class="urgency" />

    <!-- Countdown badge -->
    <Transition name="badge">
      <div v-if="showCountdown" class="countdown-badge" :class="urgency">
        <span class="countdown-time">{{ fmtCountdown(countdownSecs!) }}</span>
      </div>
    </Transition>

    <!-- Gem badge -->
    <div v-if="isHiddenGem && !isWatched" class="gem-badge">
      <Gem :size="10" />
      <span>GEM</span>
    </div>

    <!-- Watched rating badge -->
    <div v-if="ratingConfig" class="rating-badge" :style="{ '--rating-color': ratingConfig.color }">
      <template v-if="ratingConfig.double">
        <component :is="ratingConfig.direction === 'up' ? ThumbsUp : ThumbsDown" :size="10" />
        <component :is="ratingConfig.direction === 'up' ? ThumbsUp : ThumbsDown" :size="10" style="margin-left: -3px" />
      </template>
      <component v-else :is="ratingConfig.direction === 'up' ? ThumbsUp : ThumbsDown" :size="12" />
    </div>

    <!-- Overlay -->
    <div class="overlay" :class="{ hovered }">
      <!-- Top shine line -->
      <div class="shine" />

      <div class="info" :class="{ lifted: hovered }">
        <p class="font-body text-[13px] font-semibold leading-snug text-text-primary mb-1 line-clamp-2">
          {{ movie.title }}
        </p>

        <div v-if="movie.runtime" class="flex items-center gap-2">
          <span class="font-mono text-[11px] font-medium tracking-wide" :style="{ color: accentColor }">
            {{ fmtRuntime(movie.runtime) }}
          </span>
          <span class="text-text-faint text-[8px]">/</span>
          <span class="text-[10px] text-text-muted">{{ endTime(movie.runtime) }}</span>
        </div>
        <span v-else class="text-[11px] text-text-dim italic">No runtime</span>

        <div class="hover-reveal" :class="{ visible: hovered }">
          <div>
            <div v-if="multiService && providers.length" class="flex items-center gap-1 mt-1.5">
              <img
                v-for="prov in providers"
                :key="prov.id"
                :src="prov.logo ?? undefined"
                :alt="prov.name"
                :title="prov.name"
                class="provider-icon"
              />
            </div>

            <div v-if="movie.vote_average > 0" class="mt-2 flex items-center gap-2">
              <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5">
                <span class="text-gold text-[10px]">&#9733;</span>
                <span class="text-text-secondary text-[11px] font-medium">{{ movie.vote_average.toFixed(1) }}</span>
              </div>
              <span v-if="movie.release_date" class="text-text-muted text-[11px]">
                {{ movie.release_date.slice(0, 4) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";

.card-wrap {
  position: relative;
  transform: translateY(0) scale(1);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  animation: card-entrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--entrance-delay, 0s);
}

@keyframes card-entrance {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@media (hover: hover) and (pointer: fine) {
  .card-wrap:hover {
    transform: translateY(-8px) scale(1.02);
    z-index: 10;
  }
}

.card {
  @apply relative rounded-xl overflow-hidden cursor-pointer bg-surface-raised;
  aspect-ratio: 2/3;
  transition: box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
.provider-icon {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  object-fit: cover;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

@media (hover: hover) and (pointer: fine) {
  .card-wrap:hover .card {
    box-shadow:
      0 24px 48px rgba(0, 0, 0, 0.5),
      0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent),
      0 0 40px -8px color-mix(in srgb, var(--accent) 10%, transparent);
  }
}

/* Multi-provider animated glow */
.glow-ring {
  position: absolute;
  inset: -3px;
  border-radius: 14px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}
.glow-ring-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150%;
  height: 150%;
  translate: -50% -50%;
  border-radius: 50%;
  background: var(--provider-gradient);
  filter: blur(14px);
  animation: glow-spin 5s linear infinite;
}
@media (hover: hover) and (pointer: fine) {
  .card-wrap:hover .glow-ring {
    opacity: 0.7;
  }
  .card-wrap:hover .card.multi-glow {
    box-shadow:
      0 24px 48px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.08);
  }
}

@keyframes glow-spin {
  from { rotate: 0deg; }
  to { rotate: 360deg; }
}

.poster-wrap {
  @apply w-full h-full relative;
}

.poster-shimmer {
  @apply absolute inset-0;
  background: linear-gradient(
    110deg,
    var(--color-surface-raised) 0%,
    var(--color-surface-raised) 40%,
    color-mix(in srgb, var(--color-surface-alt) 80%, rgba(255, 255, 255, 0.03)) 50%,
    var(--color-surface-raised) 60%,
    var(--color-surface-raised) 100%
  );
  background-size: 200% 100%;
  animation: poster-shimmer 1.8s linear infinite;
}

@keyframes poster-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.poster-img {
  @apply w-full h-full object-cover block;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
  opacity: 0;
}
.poster-img.loaded {
  opacity: 1;
}
@media (hover: hover) and (pointer: fine) {
  .card-wrap:hover .poster-img {
    transform: scale(1.06);
  }
}

.no-poster {
  @apply w-full h-full flex items-center justify-center p-6 text-center;
  background: linear-gradient(145deg, var(--color-surface-raised) 0%, var(--color-surface-alt) 100%);
}

/* Expiring glow ring */
.expiring-glow {
  @apply absolute inset-0 rounded-xl pointer-events-none z-1;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--glow) 30%, transparent);
}
.expiring-glow.warning {
  box-shadow: inset 0 0 0 1px rgba(240, 160, 48, 0.3);
}
.expiring-glow.critical {
  box-shadow: inset 0 0 0 1.5px rgba(255, 68, 68, 0.4);
  animation: glow-pulse 2s ease-in-out infinite;
}
@keyframes glow-pulse {
  0%, 100% { box-shadow: inset 0 0 0 1.5px rgba(255, 68, 68, 0.4); }
  50% { box-shadow: inset 0 0 0 1.5px rgba(255, 68, 68, 0.6), inset 0 0 20px rgba(255, 68, 68, 0.05); }
}

/* Countdown badge */
.countdown-badge {
  @apply absolute top-2.5 right-2.5 px-2 py-1 rounded-lg z-3
         font-mono text-[10px] font-medium tabular-nums tracking-wider;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}
.countdown-badge.normal .countdown-time { @apply text-text-secondary; }
.countdown-badge.warning {
  border-color: rgba(240, 160, 48, 0.25);
  background: rgba(20, 12, 0, 0.85);
}
.countdown-badge.warning .countdown-time { color: #e8a030; }
.countdown-badge.critical {
  border-color: rgba(255, 68, 68, 0.3);
  background: rgba(30, 5, 5, 0.88);
  animation: badge-pulse 2s ease-in-out infinite;
}
.countdown-badge.critical .countdown-time { color: #ff5555; }

@keyframes badge-pulse {
  0%, 100% { background: rgba(30, 5, 5, 0.88); }
  50% { background: rgba(40, 8, 8, 0.92); }
}

/* Overlay */
.overlay {
  @apply absolute inset-0 flex flex-col justify-end;
  padding: 14px 14px 12px;
  background: linear-gradient(
    to top,
    rgba(6, 10, 14, 0.97) 0%,
    rgba(6, 10, 14, 0.85) 25%,
    rgba(6, 10, 14, 0.4) 50%,
    rgba(6, 10, 14, 0.05) 70%,
    transparent 100%
  );
  transition: background 0.25s ease;
}
.overlay.hovered {
  background: linear-gradient(
    to top,
    rgba(6, 10, 14, 0.98) 0%,
    rgba(6, 10, 14, 0.9) 30%,
    rgba(6, 10, 14, 0.5) 55%,
    rgba(6, 10, 14, 0.15) 75%,
    transparent 100%
  );
}

/* Top shine line */
.shine {
  @apply absolute top-0 left-0 right-0 h-px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s;
}
@media (hover: hover) and (pointer: fine) {
  .card-wrap:hover .shine { opacity: 1; }
}

.info {
  transform: translateY(0);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.info.lifted {
  transform: translateY(-4px);
}

/* Hover reveal */
.hover-reveal {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(6px);
  transition: grid-template-rows 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.2s ease,
              transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.hover-reveal > * {
  min-height: 0;
}
.hover-reveal.visible {
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0);
}

/* Transitions */
.badge-enter-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.badge-leave-active { transition: all 0.2s ease; }
.badge-enter-from { opacity: 0; transform: scale(0.92) translateY(-4px); }
.badge-leave-to { opacity: 0; transform: scale(0.9); }

/* Bookmark button */
.bookmark-btn {
  @apply absolute top-2.5 left-2.5 z-4 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-0;
  transition: opacity 0.3s cubic-bezier(0.23, 1, 0.32, 1), transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), background 0.2s ease;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--color-text-muted);
  opacity: 0;
  transform: scale(0.8);
}
.bookmark-btn.visible { opacity: 1; transform: scale(1); }
.bookmark-btn.saved { color: var(--color-gold); opacity: 1; transform: scale(1); }
@media (hover: hover) and (pointer: fine) {
  .bookmark-btn:hover { background: rgba(0, 0, 0, 0.8); transform: scale(1.08); }
}
.bookmark-btn.pop {
  animation: bookmark-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes bookmark-pop {
  0% { transform: scale(1); }
  30% { transform: scale(1.35); }
  100% { transform: scale(1); }
}
.bookmark-btn:focus-visible {
  opacity: 1;
  transform: scale(1);
  outline: 2px solid var(--color-gold);
  outline-offset: 2px;
}
@media (max-width: 640px) { .bookmark-btn.saved { opacity: 1; transform: scale(1); } }

/* Gem badge */
.gem-badge {
  @apply absolute z-3 flex items-center gap-1 px-1.5 py-0.5 rounded;
  top: 10px;
  right: 10px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #1CE783;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(28, 231, 131, 0.25);
  overflow: hidden;
}
.gem-badge::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(28, 231, 131, 0.15) 50%, transparent 100%);
  animation: gem-shimmer 3s linear infinite;
}
@keyframes gem-shimmer {
  0%, 100% { left: -100%; }
  50% { left: 100%; }
}

/* Watched rating badge */
.rating-badge {
  @apply absolute z-3 flex items-center justify-center rounded-[7px];
  bottom: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid color-mix(in srgb, var(--rating-color) 25%, transparent);
  color: var(--rating-color);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .card-wrap {
    animation: none;
  }
  .card-wrap,
  .card,
  .poster-img,
  .overlay,
  .info,
  .hover-reveal,
  .glow-ring,
  .shine,
  .bookmark-btn {
    transition-duration: 0.01s !important;
  }
  .glow-ring-inner {
    animation: none;
  }
  .poster-shimmer {
    animation: none;
  }
  .expiring-glow.critical {
    animation: none;
  }
  .countdown-badge.critical {
    animation: none;
  }
  .gem-badge::after {
    animation: none;
  }
}
</style>

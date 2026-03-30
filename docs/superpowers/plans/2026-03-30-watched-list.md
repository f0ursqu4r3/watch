# Watched List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Watched" tab where users rate movies on a 4-tier thumbs scale, with stats and automatic watchlist removal.

**Architecture:** New `useWatched` composable handles data/persistence (mirrors `useWatchlist` pattern). Rating popover lives in `MovieModal.vue`. Rating badge overlay added to `MovieCard.vue`. Third tab + stats bar + grid added to `App.vue`.

**Tech Stack:** Vue 3 Composition API, Lucide Vue Next icons, Tailwind CSS, localStorage

**Spec:** `docs/superpowers/specs/2026-03-30-watched-list-design.md`

---

### Task 1: Create `useWatched` composable

**Files:**
- Create: `src/composables/useWatched.ts`

- [ ] **Step 1: Create the composable with types, storage, and all methods**

```ts
import { ref, computed, watch } from 'vue'
import { useWatchlist } from './useWatchlist'

export type Rating = 'loved' | 'good' | 'meh' | 'awful'

export interface WatchedEntry {
  id: number
  title: string
  posterPath: string | null
  runtime: number | null
  voteAverage: number
  rating: Rating
  watchedAt: number
}

const STORAGE_KEY = 'watch:watched'

function loadWatched(): WatchedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

const watched = ref<WatchedEntry[]>(loadWatched())

watch(watched, (v) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
}, { deep: true })

export function useWatched() {
  const { isInWatchlist, toggleWatchlist } = useWatchlist()

  function isWatched(movieId: number): boolean {
    return watched.value.some(e => e.id === movieId)
  }

  function getWatchedRating(movieId: number): Rating | null {
    return watched.value.find(e => e.id === movieId)?.rating ?? null
  }

  function markWatched(movie: any, rating: Rating): void {
    // Remove existing entry if re-rating
    const idx = watched.value.findIndex(e => e.id === movie.id)
    if (idx >= 0) {
      watched.value.splice(idx, 1)
    }

    watched.value.push({
      id: movie.id,
      title: movie.title,
      posterPath: movie.poster_path ?? null,
      runtime: movie.runtime ?? null,
      voteAverage: movie.vote_average ?? 0,
      rating,
      watchedAt: Date.now(),
    })

    // Remove from watchlist if present
    if (isInWatchlist(movie.id)) {
      toggleWatchlist(movie)
    }
  }

  function removeWatched(movieId: number): void {
    const idx = watched.value.findIndex(e => e.id === movieId)
    if (idx >= 0) watched.value.splice(idx, 1)
  }

  const watchedStats = computed(() => {
    const stats = { total: 0, loved: 0, good: 0, meh: 0, awful: 0 }
    for (const entry of watched.value) {
      stats.total++
      stats[entry.rating]++
    }
    return stats
  })

  return {
    watched,
    isWatched,
    getWatchedRating,
    markWatched,
    removeWatched,
    watchedStats,
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/composables/useWatched.ts
git commit -m "feat: add useWatched composable with rating types and localStorage persistence"
```

---

### Task 2: Add `markWatched` sound to `useSound`

**Files:**
- Modify: `src/composables/useSound.ts:69-97` (the `sounds` object)

- [ ] **Step 1: Add `markWatched` method to the sounds object**

Add after the `gemFound` method (after line 93):

```ts
  markWatched() {
    playTone(500, 0.1, 'sine', 0.12)
    setTimeout(() => playTone(700, 0.1, 'sine', 0.1), 60)
    setTimeout(() => playTone(1000, 0.15, 'sine', 0.08), 120)
  },
```

This is an ascending three-note chime — more celebratory than `watchlistAdd` (two notes) since marking watched is a completion moment.

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/composables/useSound.ts
git commit -m "feat: add markWatched sound — ascending three-note completion chime"
```

---

### Task 3: Add rating badge to MovieCard

**Files:**
- Modify: `src/components/MovieCard.vue`

The card needs two new props (`isWatched`, `watchedRating`) and a badge overlay.

- [ ] **Step 1: Add new props to the script section**

In the `defineProps` block (lines 4-16), add two new props:

```ts
  isWatched: boolean
  watchedRating: 'loved' | 'good' | 'meh' | 'awful' | null
```

Add new imports at the top (line 3), extending the existing import:

```ts
import { Gem, Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown } from 'lucide-vue-next'
```

Add a computed for the rating config after the existing `glowGradient` computed:

```ts
const ratingConfig = computed(() => {
  const configs: Record<string, { color: string; double: boolean; direction: 'up' | 'down' }> = {
    loved: { color: '#1CE783', double: true, direction: 'up' },
    good: { color: '#6cb4ee', double: false, direction: 'up' },
    meh: { color: '#f0a030', double: false, direction: 'down' },
    awful: { color: '#ff5555', double: true, direction: 'down' },
  }
  return props.watchedRating ? configs[props.watchedRating] ?? null : null
})
```

- [ ] **Step 2: Add the rating badge to the template**

Add after the gem badge block (after line 141, the closing `</div>` of gem-badge), before the overlay:

```html
    <!-- Watched rating badge -->
    <div v-if="ratingConfig" class="rating-badge" :style="{ '--rating-color': ratingConfig.color }">
      <template v-if="ratingConfig.double">
        <component :is="ratingConfig.direction === 'up' ? ThumbsUp : ThumbsDown" :size="10" />
        <component :is="ratingConfig.direction === 'up' ? ThumbsUp : ThumbsDown" :size="10" style="margin-left: -3px" />
      </template>
      <component v-else :is="ratingConfig.direction === 'up' ? ThumbsUp : ThumbsDown" :size="12" />
    </div>
```

- [ ] **Step 3: Add the rating badge styles**

Add before the closing `</style>` tag (before the reduced motion block):

```css
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
```

- [ ] **Step 4: Hide gem badge when rating badge is present**

The gem badge and rating badge are both bottom-right. When watched, rating badge takes priority. Update the gem badge template (line 138) to also check `!isWatched`:

Change:
```html
    <div v-if="isHiddenGem" class="gem-badge">
```
To:
```html
    <div v-if="isHiddenGem && !isWatched" class="gem-badge">
```

- [ ] **Step 5: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: No errors (props not yet wired from parent — that's Task 5)

- [ ] **Step 6: Commit**

```bash
git add src/components/MovieCard.vue
git commit -m "feat: add watched rating badge to MovieCard with tier-colored Lucide icons"
```

---

### Task 4: Add rating popover to MovieModal

**Files:**
- Modify: `src/components/MovieModal.vue`

- [ ] **Step 1: Add new props and imports**

Add to the existing imports (line 3):
```ts
import { Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown, CircleCheckBig } from 'lucide-vue-next'
```

Add new props to `defineProps` (after `isInWatchlist`):
```ts
  isWatched: boolean
  watchedRating: 'loved' | 'good' | 'meh' | 'awful' | null
```

Add new emit to `defineEmits`:
```ts
'mark-watched': [movie: any, rating: 'loved' | 'good' | 'meh' | 'awful']
```

Add reactive state after the existing refs (after line 21):
```ts
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
```

Add click-outside listener in `onMounted` (after the existing `document.addEventListener('keydown', onKey)`):
```ts
  document.addEventListener('click', onClickOutsidePopover)
```

Add cleanup in `onUnmounted` (after the existing `document.removeEventListener('keydown', onKey)`):
```ts
  document.removeEventListener('click', onClickOutsidePopover)
```

- [ ] **Step 2: Add the Mark Watched button and popover to the template**

After the watchlist button (line 302), add:

```html
              <!-- Mark Watched button -->
              <div class="relative">
                <button
                  v-if="!isWatched"
                  class="watched-btn mt-3"
                  @click.stop="showRatingPopover = !showRatingPopover"
                >
                  <CircleCheckBig :size="14" />
                  Mark Watched
                </button>
                <button
                  v-else
                  class="watched-btn mt-3 rated"
                  :style="{ '--w-color': currentRatingConfig?.color }"
                  @click.stop="showRatingPopover = !showRatingPopover"
                >
                  <component :is="currentRatingConfig?.direction === 'up' ? ThumbsUp : ThumbsDown" :size="14" />
                  Watched
                </button>

                <!-- Rating popover -->
                <Transition name="popover">
                  <div v-if="showRatingPopover" class="rating-popover" @click.stop>
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
                          <component :is="opt.direction === 'up' ? ThumbsUp : ThumbsDown" :size="14" style="margin-left: -4px" />
                        </template>
                        <component v-else :is="opt.direction === 'up' ? ThumbsUp : ThumbsDown" :size="16" />
                      </button>
                    </div>
                    <div class="popover-arrow" />
                  </div>
                </Transition>
              </div>
```

- [ ] **Step 3: Add popover and button styles**

Add before the closing `</style>` (before the reduced-motion block):

```css
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

/* Reduced motion for popover */
@media (prefers-reduced-motion: reduce) {
  .popover-enter-active,
  .popover-leave-active {
    transition-duration: 0.01s !important;
  }
}
```

- [ ] **Step 4: Close popover on Escape**

In the existing `onKey` function (line 115-117), add popover dismissal before the modal close:

Change:
```ts
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !animating.value) closeWithAnimation()
}
```
To:
```ts
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showRatingPopover.value) {
      showRatingPopover.value = false
      return
    }
    if (!animating.value) closeWithAnimation()
  }
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: No errors (props not yet wired from parent — that's Task 5)

- [ ] **Step 6: Commit**

```bash
git add src/components/MovieModal.vue
git commit -m "feat: add rating popover to MovieModal with 4-tier thumbs selector"
```

---

### Task 5: Wire everything together in App.vue

**Files:**
- Modify: `src/App.vue`

This task connects the composable, adds the WATCHED tab, stats bar, poster grid, empty state, and wires the new props to MovieCard and MovieModal.

- [ ] **Step 1: Add imports and composable setup**

Add to the imports section (after line 11):
```ts
import { useWatched } from './composables/useWatched'
```

Add to the icon imports (line 9), extend with:
```ts
CircleCheckBig, ThumbsUp, ThumbsDown,
```

After the existing `useWatchlist` destructure (line 112), add:
```ts
const { watched, isWatched, getWatchedRating, markWatched, watchedStats } = useWatched()
```

Change the `activeTab` ref type (line 114):
```ts
const activeTab = ref<'discover' | 'my-list' | 'watched'>('discover')
```

- [ ] **Step 2: Add handleMarkWatched handler**

After the existing `handleToggleWatchlist` function (after line 354), add:

```ts
function handleMarkWatched(movie: any, rating: 'loved' | 'good' | 'meh' | 'awful') {
  markWatched(movie, rating)
  sounds.markWatched()
  haptic()
}
```

- [ ] **Step 3: Add the WATCHED tab button**

In the nav section (after the MY LIST button, before the `<div class="flex-1" />`), add:

```html
        <button class="tab-btn" :class="{ active: activeTab === 'watched' }" :style="{ '--c': '#6cb4ee' }" @click="activeTab = 'watched'">
          WATCHED
          <span v-if="watched.length" class="tab-count" style="background: color-mix(in srgb, #6cb4ee 15%, transparent); color: #6cb4ee;">{{ watched.length }}</span>
        </button>
```

- [ ] **Step 4: Add the Watched tab template section**

After the closing `</template>` of the my-list template block (after line 757), add:

```html
      <!-- ═══ Watched ═══ -->
      <template v-if="activeTab === 'watched'">
        <div v-if="watched.length === 0" class="text-center pt-24 pb-20">
          <div class="relative w-16 h-16 mx-auto mb-6">
            <div class="absolute inset-0 rounded-full border border-border opacity-20" />
            <div class="absolute inset-2 rounded-full border border-border opacity-30" />
            <div class="absolute inset-0 flex items-center justify-center">
              <CircleCheckBig :size="24" class="text-text-dim" />
            </div>
          </div>
          <p class="text-text-dim text-sm font-display italic mb-2">Nothing watched yet</p>
          <p class="text-text-dim text-xs tracking-wide max-w-xs mx-auto leading-relaxed opacity-60">
            Rate a movie to start tracking what you've seen
          </p>
        </div>
        <template v-else>
          <!-- Stats bar -->
          <div class="watched-stats mb-8">
            <div class="flex flex-col gap-1.5">
              <span class="text-[9px] tracking-[3px] uppercase text-text-dim font-medium">Watched</span>
              <span class="font-display text-[22px] font-bold text-text-primary leading-none">{{ watchedStats.total }}</span>
            </div>
            <div class="w-px h-10 self-center bg-border" />
            <div class="flex gap-4">
              <div class="flex items-center gap-1.5">
                <ThumbsUp :size="14" style="color: #1CE783" />
                <ThumbsUp :size="14" style="color: #1CE783; margin-left: -6px" />
                <span class="text-[14px] font-semibold" style="color: #1CE783">{{ watchedStats.loved }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <ThumbsUp :size="14" style="color: #6cb4ee" />
                <span class="text-[14px] font-semibold" style="color: #6cb4ee">{{ watchedStats.good }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <ThumbsDown :size="14" style="color: #f0a030" />
                <span class="text-[14px] font-semibold" style="color: #f0a030">{{ watchedStats.meh }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <ThumbsDown :size="14" style="color: #ff5555" />
                <ThumbsDown :size="14" style="color: #ff5555; margin-left: -6px" />
                <span class="text-[14px] font-semibold" style="color: #ff5555">{{ watchedStats.awful }}</span>
              </div>
            </div>
          </div>
          <!-- Grid -->
          <TransitionGroup name="grid" tag="div" class="grid grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-4 max-sm:grid-cols-[repeat(auto-fill,minmax(135px,1fr))] max-sm:gap-3">
            <MovieCard
              v-for="(movie, idx) in watched"
              :key="movie.id"
              :movie="{ id: movie.id, title: movie.title, poster_path: movie.posterPath, runtime: movie.runtime, vote_average: movie.voteAverage }"
              :accent-color="providerColor"
              :deadline-ms="null"
              :now="now"
              :start-at="effectiveStartMs"
              :providers="[]"
              :multi-service="false"
              :is-hidden-gem="false"
              :is-in-watchlist="false"
              :is-watched="true"
              :watched-rating="movie.rating"
              :entrance-index="idx"
              @select="openMovie"
              @toggle-watchlist="handleToggleWatchlist"
            />
          </TransitionGroup>
        </template>
      </template>
```

- [ ] **Step 5: Wire new props to MovieCard in Discover and My List grids**

In both existing `<MovieCard>` usages (the Discover grid ~line 713 and the My List grid ~line 755), add two new props:

```
:is-watched="isWatched(movie.id)"
:watched-rating="getWatchedRating(movie.id)"
```

- [ ] **Step 6: Wire new props and event to MovieModal**

On the `<MovieModal>` component (~line 760), add:

```
:is-watched="isWatched(selectedMovie.id)"
:watched-rating="getWatchedRating(selectedMovie.id)"
@mark-watched="handleMarkWatched"
```

- [ ] **Step 7: Add watched-stats CSS**

Add to the `<style scoped>` section (before the reduced-motion block):

```css
/* ═══ Watched stats bar ═══ */
.watched-stats {
  @apply flex gap-6 p-5 rounded-xl;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
```

- [ ] **Step 8: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Verify the dev server runs**

Run: `npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 10: Commit**

```bash
git add src/App.vue
git commit -m "feat: add Watched tab with stats bar, poster grid, and full lifecycle wiring"
```

---

### Task 6: Manual smoke test

No code changes — just verification.

- [ ] **Step 1: Start dev server and test the full flow**

Run: `npx vite dev`

Test checklist:
1. Select a provider, see movies load
2. Click a movie card to open modal
3. Verify "Mark Watched" button appears next to watchlist button
4. Click "Mark Watched" — verify popover appears with 4 rating icons
5. Press Escape — verify popover closes without saving
6. Click "Mark Watched" again, select a rating — verify popover dismisses
7. Verify movie now shows on WATCHED tab
8. Verify WATCHED tab count badge updates
9. Verify stats bar shows correct breakdown
10. If movie was in My List, verify it was removed
11. Click the movie in Watched tab — modal should show "Watched" button with current rating icon
12. Click "Watched" button — popover opens to change rating
13. Select different rating — verify it updates
14. Verify rating badge shows on the card in Discover grid too
15. Verify sound plays when marking watched (if sound enabled)

- [ ] **Step 2: Commit any fixes if needed**

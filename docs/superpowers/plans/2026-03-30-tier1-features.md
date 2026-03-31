# Tier 1 Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mood-based browsing, hidden gems filter, unified watchlist, inline trailer previews, and micro sound design to the watch. app.

**Architecture:** All features are client-side only, using localStorage for persistence and TMDB API for data. New composables (`useWatchlist`, `useSound`) encapsulate reusable logic. Mood definitions and constants live in a dedicated data file. Lucide Vue provides all icons.

**Tech Stack:** Vue 3 Composition API, TypeScript, Tailwind CSS v4, Lucide Vue Next, Web Audio API, YouTube IFrame API

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/data/moods.ts` | Mood definitions: labels, icons, genre IDs, keyword IDs, sort overrides |
| `src/composables/useWatchlist.ts` | Watchlist CRUD, localStorage sync, reactive state |
| `src/composables/useSound.ts` | Web Audio API context, audio sprite playback, volume control |
| `src/App.vue` | (modify) Add mood row, hidden gems toggle, watchlist tab, sound toggle, wire composables |
| `src/components/MovieCard.vue` | (modify) Add bookmark icon, gem badge, trailer preview overlay |
| `src/components/MovieModal.vue` | (modify) Add "Add to My List" button |

---

### Task 1: Install Lucide Vue Next

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run: `bun add lucide-vue-next`
Expected: Package added to dependencies in `package.json`

- [ ] **Step 2: Verify the install**

Run: `bun run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add lucide-vue-next for icon system"
```

---

### Task 2: Create Mood Definitions

**Files:**
- Create: `src/data/moods.ts`

- [ ] **Step 1: Look up TMDB keyword IDs**

We need to resolve keyword strings to TMDB IDs. Run these API calls to find keyword IDs for our mood mappings. Use the existing TMDB token from the `.env` file:

```bash
# Load the token
source .env

# Look up keywords for each mood
for keyword in "satire" "parody" "slapstick" "dark-comedy" "suspense" "heist" "chase" "feel-good" "wholesome" "uplifting" "time-travel" "dystopia" "psychological" "twist" "noir" "cult" "revenge" "cozy" "nostalgic" "loss" "tearjerker" "based-on-true-story"; do
  echo "=== $keyword ==="
  curl -s "https://api.themoviedb.org/3/search/keyword?query=$keyword" \
    -H "Authorization: Bearer $VITE_TMDB_TOKEN" | python3 -c "import sys,json; data=json.load(sys.stdin); [print(f'  {r[\"id\"]}: {r[\"name\"]}') for r in data.get('results',[])]"
done
```

Record the best-matching keyword ID for each term and use them in the next step.

- [ ] **Step 2: Create the moods data file**

Create `src/data/moods.ts` with the mood definitions. Replace the keyword IDs below with the actual IDs from the TMDB lookup in Step 1:

```ts
export interface Mood {
  id: string
  label: string
  icon: string
  genreIds: number[]
  keywordIds: number[]
  sortOverride?: string
}

export const MOODS: Mood[] = [
  {
    id: 'make-me-laugh',
    label: 'Make Me Laugh',
    icon: 'Laugh',
    genreIds: [35],
    keywordIds: [], // fill with IDs from Step 1: satire, parody, slapstick, dark-comedy
  },
  {
    id: 'edge-of-my-seat',
    label: 'Edge of My Seat',
    icon: 'Flame',
    genreIds: [53, 28],
    keywordIds: [], // fill with IDs from Step 1: suspense, heist, chase
  },
  {
    id: 'feel-good',
    label: 'Feel-Good',
    icon: 'Heart',
    genreIds: [35, 10749, 10751],
    keywordIds: [], // fill with IDs from Step 1: feel-good, wholesome, uplifting
  },
  {
    id: 'mind-bending',
    label: 'Mind-Bending',
    icon: 'Brain',
    genreIds: [878, 9648],
    keywordIds: [], // fill with IDs from Step 1: time-travel, dystopia, psychological, twist
  },
  {
    id: 'dark-and-twisted',
    label: 'Dark & Twisted',
    icon: 'Skull',
    genreIds: [27, 53],
    keywordIds: [], // fill with IDs from Step 1: noir, cult, revenge
  },
  {
    id: 'comfort-watch',
    label: 'Comfort Watch',
    icon: 'Coffee',
    genreIds: [35, 10749],
    keywordIds: [], // fill with IDs from Step 1: cozy, nostalgic
  },
  {
    id: 'background-noise',
    label: 'Background Noise',
    icon: 'Headphones',
    genreIds: [99, 35],
    keywordIds: [],
    sortOverride: 'popularity.desc',
  },
  {
    id: 'cry-it-out',
    label: 'Cry It Out',
    icon: 'CloudRain',
    genreIds: [18, 10749],
    keywordIds: [], // fill with IDs from Step 1: loss, tearjerker, based-on-true-story
  },
]
```

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/data/moods.ts
git commit -m "feat: add mood definitions with TMDB genre and keyword mappings"
```

---

### Task 3: Add Mood-Based Browsing to App.vue

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Add imports for moods and Lucide icons**

At the top of `<script setup>` in `src/App.vue`, after the existing imports, add:

```ts
import { MOODS } from './data/moods'
import {
  Laugh, Flame, Heart, Brain, Skull, Coffee, Headphones, CloudRain,
} from 'lucide-vue-next'
```

Add a component map right after the imports so we can dynamically render mood icons:

```ts
const moodIcons: Record<string, any> = {
  Laugh, Flame, Heart, Brain, Skull, Coffee, Headphones, CloudRain,
}
```

- [ ] **Step 2: Add mood state**

After the existing `selectedGenre` ref (line 85), add:

```ts
const selectedMood = ref<string | null>(null)
```

- [ ] **Step 3: Add mood selection logic**

After the existing `toggleGenre` function (line 280), add:

```ts
function selectMood(moodId: string) {
  if (selectedMood.value === moodId) {
    selectedMood.value = null
    selectedGenre.value = null
    return
  }
  selectedMood.value = moodId
  const mood = MOODS.find(m => m.id === moodId)
  if (mood) {
    // Auto-select the first genre from the mood mapping
    selectedGenre.value = mood.genreIds[0] ?? null
  }
}
```

- [ ] **Step 4: Update fetchPage to include keywords**

In the `fetchPage` function, after the line that adds `with_genres` (around line 225), add keyword support:

```ts
if (selectedMood.value) {
  const mood = MOODS.find(m => m.id === selectedMood.value)
  if (mood && mood.keywordIds.length > 0) {
    url += `&with_keywords=${mood.keywordIds.join('|')}`
  }
  if (mood?.sortOverride && !clientSorts.includes(sortBy.value)) {
    // Background Noise mood overrides sort to popularity
  }
}
```

- [ ] **Step 5: Add mood to the watch triggers**

In the existing `watch` that triggers refetch (line 294), add `selectedMood`:

Change:
```ts
watch([selectedGenre, sortBy, personFilter], () => { refetch() })
```
To:
```ts
watch([selectedGenre, sortBy, personFilter, selectedMood], () => { refetch() })
```

- [ ] **Step 6: Add mood row to the template**

In the template, inside the controls section that has the genre row (the `<div v-if="hasProviders">` block around line 434), add a new mood row BEFORE the genre `<div>`. Insert right after the `<Transition name="slide-fade">` and its opening `<div v-if="hasProviders">`:

```html
<!-- Mood row -->
<div class="mb-6">
  <p class="control-label">Mood</p>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="mood in MOODS"
      :key="mood.id"
      class="pill-btn pill-sm"
      :class="{ active: selectedMood === mood.id }"
      :style="{ '--c': 'var(--color-gold)' }"
      @click="selectMood(mood.id)"
    >
      <component :is="moodIcons[mood.icon]" :size="14" />
      {{ mood.label }}
    </button>
  </div>
</div>
```

- [ ] **Step 7: Verify in dev server**

Run: `bun run dev`
Expected: Mood pills appear between providers and genres. Clicking a mood highlights it with gold glow, selects the mapped genre, and triggers a refetch. Clicking again deselects.

- [ ] **Step 8: Commit**

```bash
git add src/App.vue
git commit -m "feat: add mood-based browsing with genre and keyword filtering"
```

---

### Task 4: Add Hidden Gems Filter

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/MovieCard.vue`

- [ ] **Step 1: Add Gem icon import to App.vue**

In `src/App.vue`, add `Gem` to the lucide-vue-next import:

```ts
import {
  Laugh, Flame, Heart, Brain, Skull, Coffee, Headphones, CloudRain,
  Gem,
} from 'lucide-vue-next'
```

- [ ] **Step 2: Add hidden gems state to App.vue**

After the `selectedMood` ref, add:

```ts
const hiddenGemsOnly = ref(false)
```

- [ ] **Step 3: Update fetchPage for hidden gems API params**

In the `fetchPage` function, after the existing `vote_count.gte` line (around line 226), add:

```ts
if (hiddenGemsOnly.value) {
  url += `&vote_average.gte=7.5&vote_count.gte=50`
  if (apiSort === 'popularity.desc') {
    url = url.replace('sort_by=popularity.desc', 'sort_by=vote_average.desc')
  }
}
```

- [ ] **Step 4: Add client-side filtering in the filtered computed**

In the `filtered` computed (around line 148), add a hidden gems client-side filter after the runtime filter. The popularity field needs to be checked client-side since TMDB doesn't support `popularity.lte`:

Change the `filtered` computed to:

```ts
const filtered = computed(() => {
  let result = maxRuntimeMinutes.value != null
    ? movies.value.filter((m) => m.runtime && m.runtime <= maxRuntimeMinutes.value!)
    : movies.value
  if (hiddenGemsOnly.value) {
    result = result.filter((m) => m.popularity < 50)
  }
  if (sortBy.value === 'runtime.asc') {
    result = [...result].sort((a, b) => (a.runtime ?? Infinity) - (b.runtime ?? Infinity))
  } else if (sortBy.value === 'runtime.desc') {
    result = [...result].sort((a, b) => (b.runtime ?? 0) - (a.runtime ?? 0))
  }
  if (expiringFirst.value && maxRuntimeMinutes.value != null) {
    result = [...result].sort((a, b) => (b.runtime ?? 0) - (a.runtime ?? 0))
  }
  return result
})
```

- [ ] **Step 5: Add hidden gems to refetch watchers**

Update the watch:

```ts
watch([selectedGenre, sortBy, personFilter, selectedMood, hiddenGemsOnly], () => { refetch() })
```

- [ ] **Step 6: Add the toggle to the template**

In the sort/filter controls area (the `<div>` containing the sort dropdown, around line 450), add the hidden gems toggle AFTER the sort `<div>`:

```html
<button
  class="pill-btn pill-sm"
  :class="{ active: hiddenGemsOnly }"
  :style="{ '--c': '#1CE783' }"
  @click="hiddenGemsOnly = !hiddenGemsOnly"
>
  <Gem :size="14" />
  Hidden Gems
</button>
```

- [ ] **Step 7: Pass gem status to MovieCard**

Add an `isHiddenGem` helper function to `App.vue` after the `movieProviders` function:

```ts
function isHiddenGem(movie: any): boolean {
  return movie.vote_average >= 7.5 && movie.popularity < 50 && movie.vote_count >= 50
}
```

Update the `MovieCard` usage in the template to pass the gem prop:

```html
<MovieCard
  v-for="movie in filtered"
  :key="movie.id"
  :movie="movie"
  :accent-color="providerColor"
  :deadline-ms="deadlineMs"
  :now="now"
  :start-at="effectiveStartMs"
  :providers="movieProviders(movie)"
  :multi-service="selectedProviders.size > 1"
  :is-hidden-gem="isHiddenGem(movie)"
  @select="openMovie"
/>
```

- [ ] **Step 8: Add gem badge to MovieCard.vue**

In `src/components/MovieCard.vue`, add the Gem icon import:

```ts
import { Gem } from 'lucide-vue-next'
```

Add the new prop to the `defineProps`:

```ts
const props = defineProps<{
  movie: any
  accentColor: string
  deadlineMs: number | null
  now: number
  startAt: number
  providers: { id: number; name: string; color: string; logo: string | null; link: string | null }[]
  multiService: boolean
  isHiddenGem: boolean
}>()
```

Add the gem badge to the template, right after the countdown badge `</Transition>` and before the overlay `<div>`:

```html
<!-- Hidden gem badge -->
<div v-if="isHiddenGem" class="gem-badge">
  <Gem :size="10" />
  <span>GEM</span>
</div>
```

Add the badge styles in the `<style scoped>` section:

```css
.gem-badge {
  @apply absolute top-2.5 z-3 flex items-center gap-1 px-1.5 py-0.5 rounded;
  left: 10px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #1CE783;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(28, 231, 131, 0.25);
}
```

- [ ] **Step 9: Verify in dev server**

Run: `bun run dev`
Expected: Hidden Gems toggle appears near the sort controls. Activating it filters results. Green gem badges appear on qualifying cards.

- [ ] **Step 10: Commit**

```bash
git add src/App.vue src/components/MovieCard.vue
git commit -m "feat: add hidden gems filter with badge on qualifying cards"
```

---

### Task 5: Create Watchlist Composable

**Files:**
- Create: `src/composables/useWatchlist.ts`

- [ ] **Step 1: Create the composable**

Create `src/composables/useWatchlist.ts`:

```ts
import { ref, watch } from 'vue'

export interface WatchlistEntry {
  id: number
  title: string
  posterPath: string | null
  runtime: number | null
  voteAverage: number
  addedAt: number
}

const STORAGE_KEY = 'watch:watchlist'

function loadWatchlist(): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

const watchlist = ref<WatchlistEntry[]>(loadWatchlist())

watch(watchlist, (v) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
}, { deep: true })

export function useWatchlist() {
  function isInWatchlist(movieId: number): boolean {
    return watchlist.value.some(e => e.id === movieId)
  }

  function toggleWatchlist(movie: any): boolean {
    const idx = watchlist.value.findIndex(e => e.id === movie.id)
    if (idx >= 0) {
      watchlist.value.splice(idx, 1)
      return false // removed
    }
    watchlist.value.push({
      id: movie.id,
      title: movie.title,
      posterPath: movie.poster_path ?? null,
      runtime: movie.runtime ?? null,
      voteAverage: movie.vote_average ?? 0,
      addedAt: Date.now(),
    })
    return true // added
  }

  return {
    watchlist,
    isInWatchlist,
    toggleWatchlist,
  }
}
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/composables/useWatchlist.ts
git commit -m "feat: add watchlist composable with localStorage persistence"
```

---

### Task 6: Add Watchlist UI to App, MovieCard, and MovieModal

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/MovieCard.vue`
- Modify: `src/components/MovieModal.vue`

- [ ] **Step 1: Wire up watchlist in App.vue**

In `src/App.vue`, add imports:

```ts
import { useWatchlist } from './composables/useWatchlist'
import { Bookmark, BookmarkCheck } from 'lucide-vue-next'
```

(Add `Bookmark, BookmarkCheck` to the existing lucide import line.)

After the existing refs, add:

```ts
const { watchlist, isInWatchlist, toggleWatchlist } = useWatchlist()
const activeTab = ref<'discover' | 'my-list'>('discover')
```

Add a computed for the my-list filtered view, after the existing `filtered` computed:

```ts
const watchlistFiltered = computed(() => {
  if (activeTab.value !== 'my-list') return []
  let result = watchlist.value.map(entry => {
    // Find full movie data if available, otherwise use entry metadata
    const fullMovie = movies.value.find(m => m.id === entry.id)
    return fullMovie ?? {
      id: entry.id,
      title: entry.title,
      poster_path: entry.posterPath,
      runtime: entry.runtime,
      vote_average: entry.voteAverage,
    }
  })
  if (maxRuntimeMinutes.value != null) {
    result = result.filter(m => m.runtime && m.runtime <= maxRuntimeMinutes.value!)
  }
  return result
})
```

- [ ] **Step 2: Add tab navigation to the header template**

In the header section of `src/App.vue`, right after the closing `</header>` tag and before the controls `<div>`, add a tab bar:

```html
<!-- Tab navigation -->
<nav class="flex items-center gap-0 mb-10 border-b border-border-subtle">
  <button
    class="tab-btn"
    :class="{ active: activeTab === 'discover' }"
    :style="{ '--c': providerColor }"
    @click="activeTab = 'discover'"
  >
    DISCOVER
  </button>
  <button
    class="tab-btn"
    :class="{ active: activeTab === 'my-list' }"
    :style="{ '--c': 'var(--color-gold)' }"
    @click="activeTab = 'my-list'"
  >
    MY LIST
    <span v-if="watchlist.length" class="tab-count">{{ watchlist.length }}</span>
  </button>
</nav>
```

Add tab styles in the `<style scoped>` section:

```css
.tab-btn {
  @apply px-5 py-3 text-[11px] tracking-[3px] uppercase font-medium cursor-pointer
         bg-transparent border-0 border-b-2 border-transparent text-text-dim;
  transition: all 0.3s ease;
}
.tab-btn:hover {
  color: var(--color-text-muted);
}
.tab-btn.active {
  color: var(--c);
  border-bottom-color: var(--c);
}
.tab-count {
  @apply ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full;
  background: color-mix(in srgb, var(--color-gold) 15%, transparent);
  color: var(--color-gold);
}
```

- [ ] **Step 3: Conditionally show discover vs my-list content**

Wrap the existing results section (the `<template v-if="!loading && hasProviders">` block) with a `v-if="activeTab === 'discover'"`.

After that block, add the my-list view:

```html
<!-- My List view -->
<template v-if="activeTab === 'my-list'">
  <div v-if="watchlistFiltered.length === 0" class="text-center py-20">
    <Bookmark :size="32" class="mx-auto mb-4 text-text-dim" />
    <p class="text-text-dim text-sm font-display italic">
      Your list is empty. Bookmark movies to save them here.
    </p>
  </div>
  <TransitionGroup v-else name="grid" tag="div" class="grid grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-4 max-sm:grid-cols-[repeat(auto-fill,minmax(135px,1fr))] max-sm:gap-3">
    <MovieCard
      v-for="movie in watchlistFiltered"
      :key="movie.id"
      :movie="movie"
      :accent-color="providerColor"
      :deadline-ms="deadlineMs"
      :now="now"
      :start-at="effectiveStartMs"
      :providers="movieProviders(movie)"
      :multi-service="selectedProviders.size > 1"
      :is-hidden-gem="isHiddenGem(movie)"
      :is-in-watchlist="isInWatchlist(movie.id)"
      @select="openMovie"
      @toggle-watchlist="toggleWatchlist"
    />
  </TransitionGroup>
</template>
```

Also update the existing discover MovieCard to pass watchlist props:

```html
<MovieCard
  v-for="movie in filtered"
  :key="movie.id"
  :movie="movie"
  :accent-color="providerColor"
  :deadline-ms="deadlineMs"
  :now="now"
  :start-at="effectiveStartMs"
  :providers="movieProviders(movie)"
  :multi-service="selectedProviders.size > 1"
  :is-hidden-gem="isHiddenGem(movie)"
  :is-in-watchlist="isInWatchlist(movie.id)"
  @select="openMovie"
  @toggle-watchlist="toggleWatchlist"
/>
```

- [ ] **Step 4: Add bookmark icon to MovieCard.vue**

In `src/components/MovieCard.vue`, add imports:

```ts
import { Bookmark, BookmarkCheck } from 'lucide-vue-next'
```

Update the props to include `isInWatchlist`:

```ts
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
}>()
```

Update emits:

```ts
const emit = defineEmits<{
  select: [movie: any, rect?: DOMRect]
  'toggle-watchlist': [movie: any]
}>()
```

Add the bookmark button to the template, right after the opening `<div class="card"` tag and before the poster `<img>`:

```html
<!-- Bookmark button -->
<button
  class="bookmark-btn"
  :class="{ saved: isInWatchlist, visible: hovered || isInWatchlist }"
  @click.stop="emit('toggle-watchlist', movie)"
>
  <BookmarkCheck v-if="isInWatchlist" :size="16" />
  <Bookmark v-else :size="16" />
</button>
```

Add bookmark styles:

```css
.bookmark-btn {
  @apply absolute top-2.5 left-2.5 z-4 w-7 h-7 rounded-lg
         flex items-center justify-center cursor-pointer
         border-0 transition-all duration-300;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--color-text-muted);
  opacity: 0;
  transform: scale(0.8);
}
.bookmark-btn.visible {
  opacity: 1;
  transform: scale(1);
}
.bookmark-btn.saved {
  color: var(--color-gold);
  opacity: 1;
  transform: scale(1);
}
.bookmark-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}
.bookmark-btn.saved:hover {
  transform: scale(1.1);
}
/* On mobile, always show saved bookmarks */
@media (max-width: 640px) {
  .bookmark-btn.saved {
    opacity: 1;
    transform: scale(1);
  }
}
```

- [ ] **Step 5: Add "Add to My List" button in MovieModal.vue**

In `src/components/MovieModal.vue`, add imports:

```ts
import { Bookmark, BookmarkCheck } from 'lucide-vue-next'
```

Update the props:

```ts
const props = defineProps<{
  movie: any
  accentColor: string
  flipOrigin: { x: number; y: number; w: number; h: number } | null
  startAt: number | null
  deadlineMs: number | null
  providers: { id: number; name: string; color: string; logo: string | null; link: string | null }[]
  isInWatchlist: boolean
}>()
```

Update emits:

```ts
const emit = defineEmits<{ close: []; 'search-person': [person: { id: number; name: string }]; 'toggle-watchlist': [movie: any] }>()
```

In the template, right after the streaming services `<div>` and before the closing `</div>` of the poster + heading flex container, add:

```html
<!-- Add to My List button -->
<button
  class="watchlist-btn mt-3"
  :class="{ saved: isInWatchlist }"
  @click="emit('toggle-watchlist', movie)"
>
  <BookmarkCheck v-if="isInWatchlist" :size="14" />
  <Bookmark v-else :size="14" />
  {{ isInWatchlist ? 'In My List' : 'Add to My List' }}
</button>
```

Add styles in `<style scoped>`:

```css
.watchlist-btn {
  @apply inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium
         cursor-pointer border transition-all duration-300;
  background: color-mix(in srgb, var(--color-gold) 8%, transparent);
  border-color: color-mix(in srgb, var(--color-gold) 15%, transparent);
  color: var(--color-gold);
}
.watchlist-btn:hover {
  background: color-mix(in srgb, var(--color-gold) 15%, transparent);
  border-color: color-mix(in srgb, var(--color-gold) 25%, transparent);
}
.watchlist-btn.saved {
  background: color-mix(in srgb, var(--color-gold) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-gold) 25%, transparent);
}
```

- [ ] **Step 6: Update MovieModal usage in App.vue**

Update the `MovieModal` component in App.vue to pass the new props and handle the emit:

```html
<MovieModal
  v-if="selectedMovie"
  :movie="selectedMovie"
  :accent-color="providerColor"
  :flip-origin="flipOrigin"
  :start-at="startMs"
  :deadline-ms="deadlineMs"
  :providers="movieProviders(selectedMovie)"
  :is-in-watchlist="isInWatchlist(selectedMovie.id)"
  @close="closeMovie"
  @search-person="searchPerson"
  @toggle-watchlist="toggleWatchlist"
/>
```

- [ ] **Step 7: Verify in dev server**

Run: `bun run dev`
Expected:
- Bookmark icon appears on card hover (top-left). Gold when saved.
- "Add to My List" button in the modal works.
- "MY LIST" tab in header shows count badge.
- Switching to MY LIST tab shows saved movies.
- Time window filtering works in My List view.

- [ ] **Step 8: Commit**

```bash
git add src/App.vue src/components/MovieCard.vue src/components/MovieModal.vue src/composables/useWatchlist.ts
git commit -m "feat: add unified watchlist with bookmark UI and My List tab"
```

---

### Task 7: Add Inline Trailer Previews to MovieCard

**Files:**
- Modify: `src/components/MovieCard.vue`

- [ ] **Step 1: Add trailer preview state and logic**

In `src/components/MovieCard.vue`, add the following imports and refs after the existing script setup:

```ts
import { Play, VolumeX, Volume2 } from 'lucide-vue-next'
```

(Add `Play, VolumeX, Volume2` to the existing lucide import.)

After the existing computed properties, add:

```ts
const showTrailer = ref(false)
const trailerMuted = ref(true)
const trailerLoading = ref(false)
let hoverTimer: ReturnType<typeof setTimeout> | null = null
let longPressTimer: ReturnType<typeof setTimeout> | null = null

const trailerKey = computed(() => {
  const vids = props.movie.videos?.results || []
  const trailer = vids.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
    || vids.find((v: any) => v.site === 'YouTube')
  return trailer?.key ?? null
})

const backdropUrl = computed(() =>
  props.movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${props.movie.backdrop_path}`
    : null
)

// Check prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function startHoverPreview() {
  if (prefersReducedMotion || showTrailer.value) return
  hoverTimer = setTimeout(() => {
    showTrailer.value = true
    trailerLoading.value = true
  }, 800)
}

function stopHoverPreview() {
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null }
  showTrailer.value = false
  trailerMuted.value = true
  trailerLoading.value = false
}

function onTouchStart() {
  if (prefersReducedMotion) return
  longPressTimer = setTimeout(() => {
    showTrailer.value = true
    trailerLoading.value = true
  }, 500)
}

function onTouchEnd() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
  if (showTrailer.value) {
    showTrailer.value = false
    trailerMuted.value = true
    trailerLoading.value = false
  }
}

function onTrailerLoad() {
  trailerLoading.value = false
}

function toggleMute(e: Event) {
  e.stopPropagation()
  trailerMuted.value = !trailerMuted.value
}
```

- [ ] **Step 2: Update the mouseenter/mouseleave handlers**

Replace the existing `@mouseenter` and `@mouseleave` on the `.card` div:

Change:
```html
@mouseenter="hovered = true"
@mouseleave="hovered = false"
```

To:
```html
@mouseenter="hovered = true; startHoverPreview()"
@mouseleave="hovered = false; stopHoverPreview()"
@touchstart.passive="onTouchStart"
@touchend.passive="onTouchEnd"
@touchcancel.passive="onTouchEnd"
```

- [ ] **Step 3: Add the trailer preview overlay to the template**

Right after the poster `<img>` and `<div v-else class="no-poster">`, and before the expiring glow `<div>`, add:

```html
<!-- Trailer preview overlay -->
<Transition name="trailer">
  <div v-if="showTrailer" class="trailer-overlay" @click.stop>
    <iframe
      v-if="trailerKey"
      :src="`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${trailerMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&showinfo=0&start=0&end=15&loop=1`"
      class="trailer-iframe"
      allow="autoplay; encrypted-media"
      @load="onTrailerLoad"
    />
    <!-- Fallback: Ken Burns backdrop -->
    <div v-else-if="backdropUrl" class="trailer-fallback">
      <img :src="backdropUrl" class="ken-burns-img" />
      <div class="fallback-overlay">
        <p class="font-body text-xs font-semibold text-text-primary">{{ movie.title }}</p>
        <p v-if="movie.vote_average" class="text-[10px] text-text-secondary mt-1">
          <span class="text-gold">&#9733;</span> {{ movie.vote_average.toFixed(1) }}
        </p>
      </div>
    </div>
    <!-- Loading indicator -->
    <div v-if="trailerLoading" class="trailer-loading">
      <Play :size="20" class="text-white/60" />
    </div>
    <!-- Mute toggle -->
    <button v-if="trailerKey && !trailerLoading" class="mute-btn" @click="toggleMute">
      <VolumeX v-if="trailerMuted" :size="12" />
      <Volume2 v-else :size="12" />
    </button>
  </div>
</Transition>
```

- [ ] **Step 4: Add trailer styles**

Add in `<style scoped>`:

```css
/* Trailer preview */
.trailer-overlay {
  @apply absolute inset-0 z-2 overflow-hidden rounded-xl;
  background: black;
}
.trailer-iframe {
  @apply absolute inset-0 w-full h-full border-0;
  pointer-events: none;
}
.trailer-fallback {
  @apply relative w-full h-full overflow-hidden;
}
.ken-burns-img {
  @apply w-full h-full object-cover;
  animation: ken-burns 10s ease-in-out infinite;
}
@keyframes ken-burns {
  0% { transform: scale(1) translate(0, 0); }
  50% { transform: scale(1.15) translate(-2%, -2%); }
  100% { transform: scale(1) translate(0, 0); }
}
.fallback-overlay {
  @apply absolute inset-0 flex flex-col items-center justify-center text-center p-4;
  background: rgba(0, 0, 0, 0.5);
}
.trailer-loading {
  @apply absolute inset-0 flex items-center justify-center;
  background: rgba(0, 0, 0, 0.3);
}
.mute-btn {
  @apply absolute bottom-2 right-2 z-5 w-6 h-6 rounded-full
         flex items-center justify-center cursor-pointer border-0;
  background: rgba(0, 0, 0, 0.7);
  color: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  transition: all 0.2s;
}
.mute-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  color: white;
}

/* Trailer transitions */
.trailer-enter-active { transition: opacity 0.3s ease; }
.trailer-leave-active { transition: opacity 0.2s ease; }
.trailer-enter-from,
.trailer-leave-to { opacity: 0; }
```

- [ ] **Step 5: Verify in dev server**

Run: `bun run dev`
Expected:
- Hovering over a card for 800ms shows a YouTube trailer embed (muted) or Ken Burns fallback.
- Moving the mouse away stops the preview.
- Mute toggle button appears in bottom-right corner.
- Clicking the card still opens the modal.

- [ ] **Step 6: Commit**

```bash
git add src/components/MovieCard.vue
git commit -m "feat: add inline trailer previews on card hover with YouTube embed and fallback"
```

---

### Task 8: Create Sound Composable

**Files:**
- Create: `src/composables/useSound.ts`

- [ ] **Step 1: Create the sound composable**

Create `src/composables/useSound.ts`. This uses Web Audio API oscillators to generate sounds programmatically (no audio file needed):

```ts
import { ref, watch } from 'vue'

const STORAGE_KEY = 'watch:soundEnabled'

function loadSoundPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

const soundEnabled = ref(loadSoundPref())

watch(soundEnabled, (v) => {
  localStorage.setItem(STORAGE_KEY, String(v))
})

let audioCtx: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  if (!soundEnabled.value) return
  const ctx = getContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

function playNoise(duration: number, volume = 0.1) {
  if (!soundEnabled.value) return
  const ctx = getContext()
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(800, ctx.currentTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start()
}

const sounds = {
  modalOpen() {
    // Film projector whir: filtered noise + subtle tone
    playNoise(0.2, 0.08)
    playTone(220, 0.15, 'sine', 0.05)
  },
  modalClose() {
    // Gentle click
    playTone(800, 0.08, 'square', 0.08)
  },
  watchlistAdd() {
    // Satisfying pop: quick ascending tones
    playTone(600, 0.08, 'sine', 0.15)
    setTimeout(() => playTone(900, 0.1, 'sine', 0.12), 50)
  },
  watchlistRemove() {
    // Soft descending slide
    playTone(500, 0.1, 'sine', 0.1)
    setTimeout(() => playTone(300, 0.1, 'sine', 0.08), 60)
  },
  moodSelect() {
    // Atmospheric chord
    playTone(440, 0.25, 'sine', 0.08)
    playTone(554, 0.25, 'sine', 0.06)
    playTone(659, 0.25, 'sine', 0.05)
  },
  gemFound() {
    // Crystal chime: high bell-like tones
    playTone(1200, 0.15, 'sine', 0.1)
    setTimeout(() => playTone(1600, 0.12, 'sine', 0.08), 80)
  },
  filterChange() {
    // Quiet tick
    playTone(1000, 0.05, 'square', 0.06)
  },
}

function haptic(ms = 10) {
  if (soundEnabled.value && navigator.vibrate) {
    navigator.vibrate(ms)
  }
}

export function useSound() {
  return {
    soundEnabled,
    sounds,
    haptic,
  }
}
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/composables/useSound.ts
git commit -m "feat: add sound composable with Web Audio API synthesized sounds"
```

---

### Task 9: Wire Sound System into App

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Import and initialize sound**

In `src/App.vue`, add the import:

```ts
import { useSound } from './composables/useSound'
import { Volume2, VolumeX } from 'lucide-vue-next'
```

(Add `Volume2, VolumeX` to the existing lucide import line.)

After the watchlist initialization, add:

```ts
const { soundEnabled, sounds, haptic } = useSound()
```

- [ ] **Step 2: Add sound triggers to existing functions**

Update `openMovie`:

```ts
function openMovie(movie: any, cardRect?: DOMRect) {
  sounds.modalOpen()
  if (cardRect) {
    flipOrigin.value = { x: cardRect.left, y: cardRect.top, w: cardRect.width, h: cardRect.height }
  } else {
    flipOrigin.value = null
  }
  selectedMovie.value = movie
  const scrollbarW = window.innerWidth - document.documentElement.clientWidth
  document.body.style.overflow = 'hidden'
  document.body.style.paddingRight = `${scrollbarW}px`
}
```

Update `closeMovie`:

```ts
function closeMovie() {
  sounds.modalClose()
  selectedMovie.value = null
  flipOrigin.value = null
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
}
```

Update `selectMood` to play sound:

```ts
function selectMood(moodId: string) {
  sounds.moodSelect()
  haptic()
  if (selectedMood.value === moodId) {
    selectedMood.value = null
    selectedGenre.value = null
    return
  }
  selectedMood.value = moodId
  const mood = MOODS.find(m => m.id === moodId)
  if (mood) {
    selectedGenre.value = mood.genreIds[0] ?? null
  }
}
```

Update `toggleProvider`, `toggleGenre`, and the sort/time change events to play `filterChange`:

In `toggleProvider`, add at the start:

```ts
sounds.filterChange()
haptic()
```

In `toggleGenre`, add at the start:

```ts
sounds.filterChange()
haptic()
```

Create a wrapper for the watchlist toggle that plays sound:

```ts
function handleToggleWatchlist(movie: any) {
  const added = toggleWatchlist(movie)
  if (added) {
    sounds.watchlistAdd()
  } else {
    sounds.watchlistRemove()
  }
  haptic()
}
```

Update all `@toggle-watchlist` handlers in the template to use `handleToggleWatchlist` instead of `toggleWatchlist`:

```html
@toggle-watchlist="handleToggleWatchlist"
```

- [ ] **Step 3: Add sound toggle to the header**

In the tab navigation `<nav>`, after the MY LIST button, add the sound toggle:

```html
<div class="flex-1" />
<button
  class="sound-toggle"
  @click="soundEnabled = !soundEnabled"
  :title="soundEnabled ? 'Mute sounds' : 'Enable sounds'"
>
  <Volume2 v-if="soundEnabled" :size="16" />
  <VolumeX v-else :size="16" />
</button>
```

Add sound toggle styles:

```css
.sound-toggle {
  @apply p-2 rounded-lg cursor-pointer border-0 bg-transparent transition-all duration-300;
  color: var(--color-text-dim);
}
.sound-toggle:hover {
  color: var(--color-text-muted);
  background: var(--color-surface-alt);
}
```

- [ ] **Step 4: Verify in dev server**

Run: `bun run dev`
Expected:
- Sound toggle appears in header (speaker icon).
- Clicking it toggles sound on/off.
- When on: opening/closing modal plays sounds, bookmarking pops, mood selection has an atmospheric tone, filter changes tick.
- All sounds are subtle and cinematic.
- Preference persists across page reloads.

- [ ] **Step 5: Commit**

```bash
git add src/App.vue
git commit -m "feat: wire sound system with audio feedback for all interactions"
```

---

### Task 10: Final Integration and Polish

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/MovieCard.vue`

- [ ] **Step 1: Ensure controls are hidden in My List tab where not relevant**

The provider selection, mood, genre, and sort controls should still show in My List tab (they help filter the watchlist). But the empty state for no providers should only show in discover tab. Update the empty state condition:

Change:
```html
<div v-if="!hasProviders" class="text-center pt-28 max-sm:pt-20">
```

To:
```html
<div v-if="!hasProviders && activeTab === 'discover'" class="text-center pt-28 max-sm:pt-20">
```

Similarly, update the loading state:

Change:
```html
<div v-if="loading" class="text-center pt-28">
```

To:
```html
<div v-if="loading && activeTab === 'discover'" class="text-center pt-28">
```

- [ ] **Step 2: Ensure the gem badge position doesn't conflict with bookmark**

The gem badge is at top-left (`left: 10px`) and the bookmark is also at top-left. Move the gem badge to be right of the bookmark. Update the gem badge position in MovieCard.vue:

Change:
```css
.gem-badge {
  @apply absolute top-2.5 z-3 flex items-center gap-1 px-1.5 py-0.5 rounded;
  left: 10px;
```

To:
```css
.gem-badge {
  @apply absolute top-2.5 z-3 flex items-center gap-1 px-1.5 py-0.5 rounded;
  left: 40px;
```

This positions it to the right of the 28px bookmark button.

- [ ] **Step 3: Verify full integration**

Run: `bun run dev`

Test the following:
- Select providers, browse movies
- Select a mood — genres auto-select, results update
- Toggle hidden gems — results filter, badges appear
- Bookmark movies from the grid and from the modal
- Switch to My List tab — saved movies appear
- Set a time window — My List filters by runtime
- Hover cards for trailer preview
- Toggle sound on — interact with all features, hear sounds
- Reload page — watchlist and sound preference persist
- Test on mobile viewport (use browser devtools responsive mode)

- [ ] **Step 4: Build check**

Run: `bun run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/App.vue src/components/MovieCard.vue
git commit -m "fix: polish integration details for Tier 1 features"
```

---

## Summary

| Task | Feature | Files |
|------|---------|-------|
| 1 | Install Lucide | package.json |
| 2 | Mood definitions | src/data/moods.ts |
| 3 | Mood browsing UI | src/App.vue |
| 4 | Hidden gems filter | src/App.vue, MovieCard.vue |
| 5 | Watchlist composable | src/composables/useWatchlist.ts |
| 6 | Watchlist UI | src/App.vue, MovieCard.vue, MovieModal.vue |
| 7 | Trailer previews | MovieCard.vue |
| 8 | Sound composable | src/composables/useSound.ts |
| 9 | Sound integration | src/App.vue |
| 10 | Final polish | src/App.vue, MovieCard.vue |

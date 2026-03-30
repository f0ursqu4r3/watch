<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import MovieCard from './components/MovieCard.vue'
import MovieModal from './components/MovieModal.vue'
import { MOODS } from './data/moods'
import {
  Laugh, Flame, Heart, Brain, Skull, Coffee, Headphones, CloudRain,
} from 'lucide-vue-next'

const moodIcons: Record<string, any> = {
  Laugh, Flame, Heart, Brain, Skull, Coffee, Headphones, CloudRain,
}

const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN

const GENRES = [
  { id: 28,    name: "Action" },
  { id: 12,    name: "Adventure" },
  { id: 16,    name: "Animation" },
  { id: 35,    name: "Comedy" },
  { id: 80,    name: "Crime" },
  { id: 99,    name: "Documentary" },
  { id: 18,    name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14,    name: "Fantasy" },
  { id: 36,    name: "History" },
  { id: 27,    name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648,  name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878,   name: "Sci-Fi" },
  { id: 53,    name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37,    name: "Western" },
]

const SORT_OPTIONS = [
  { value: "popularity.desc",    label: "Most Popular" },
  { value: "runtime.asc",        label: "Shortest First" },
  { value: "runtime.desc",       label: "Longest First" },
  { value: "vote_average.desc",  label: "Highest Rated" },
  { value: "primary_release_date.desc", label: "Newest" },
  { value: "primary_release_date.asc",  label: "Oldest" },
  { value: "revenue.desc",       label: "Highest Grossing" },
]

const PROVIDERS = [
  { id: 8,   name: "Netflix",      color: "#E50914" },
  { id: 9,   name: "Prime Video",  color: "#00A8E1" },
  { id: 337, name: "Disney+",      color: "#1133A6" },
  { id: 384, name: "HBO Max",      color: "#5822B4" },
  { id: 15,  name: "Hulu",         color: "#1CE783" },
  { id: 386, name: "Peacock",      color: "#FFD700" },
  { id: 531, name: "Paramount+",   color: "#0064FF" },
  { id: 283, name: "Crunchyroll",  color: "#F47521" },
]

const headers = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  "Content-Type": "application/json",
}

function fmtRuntime(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function parseTimeToMinutes(timeStr: string) {
  const parts = timeStr.split(" ")
  const timePart = parts[0] ?? "0:0"
  const period = parts[1]
  const nums = timePart.split(":").map(Number)
  let hours = nums[0] ?? 0
  const minutes = nums[1] ?? 0
  if (period === "PM" && hours !== 12) hours += 12
  if (period === "AM" && hours === 12) hours = 0
  return hours * 60 + minutes
}

const savedProviders = (() => {
  try {
    const raw = localStorage.getItem('watch:providers')
    if (raw) return new Set<number>(JSON.parse(raw))
  } catch {}
  return new Set<number>()
})()
const selectedProviders = ref<Set<number>>(savedProviders)

watch(selectedProviders, (v) => {
  localStorage.setItem('watch:providers', JSON.stringify([...v]))
})
const selectedGenre = ref<number | null>(null)
const selectedMood = ref<string | null>(null)
const sortBy = ref("popularity.desc")
const expiringFirst = ref(false)
const startTimeStr = ref("")
const endTimeStr = ref("")
const movies = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const hasMore = ref(false)
const loadingMore = ref(false)
const personFilter = ref<{ id: number; name: string } | null>(null)

const timeOptions = (() => {
  const opts: string[] = []
  const now = new Date()
  const start = new Date(now)
  start.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
  for (let i = 1; i <= 48; i++) {
    const t = new Date(start.getTime() + i * 15 * 60000)
    opts.push(t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
  }
  return opts
})()

const now = ref(Date.now())
let tickTimer: ReturnType<typeof setInterval> | null = null

watch([startTimeStr, endTimeStr], ([s, e]) => {
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null }
  if (s || e) {
    tickTimer = setInterval(() => { now.value = Date.now() }, 1000)
  }
  if (!e || s) expiringFirst.value = false
}, { immediate: true })

onUnmounted(() => { if (tickTimer) clearInterval(tickTimer) })

const startMs = computed(() => {
  if (!startTimeStr.value) return null
  const mins = parseTimeToMinutes(startTimeStr.value)
  const d = new Date()
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
  if (d.getTime() < now.value - 60000) d.setDate(d.getDate() + 1)
  return d.getTime()
})

const deadlineMs = computed(() => {
  if (!endTimeStr.value) return null
  const endMins = parseTimeToMinutes(endTimeStr.value)
  const today = new Date()
  today.setHours(Math.floor(endMins / 60), endMins % 60, 0, 0)
  if (today.getTime() <= now.value) today.setDate(today.getDate() + 1)
  return today.getTime()
})

const effectiveStartMs = computed(() => startMs.value ?? now.value)

const maxRuntimeMinutes = computed(() => {
  if (!deadlineMs.value) return null
  return Math.floor((deadlineMs.value - effectiveStartMs.value) / 60000)
})

const filtered = computed(() => {
  let result = maxRuntimeMinutes.value != null
    ? movies.value.filter((m) => m.runtime && m.runtime <= maxRuntimeMinutes.value!)
    : movies.value
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

const hasProviders = computed(() => selectedProviders.value.size > 0)

const activeProviderColors = computed(() => {
  const colors = PROVIDERS.filter(p => selectedProviders.value.has(p.id)).map(p => p.color)
  return colors.length ? colors : ["#ff6b35"]
})

const providerColor = computed(() => activeProviderColors.value[0]!)

const providerGradient = computed(() => {
  const c = activeProviderColors.value
  if (c.length === 1) return c[0]!
  return `linear-gradient(135deg, ${c.join(', ')})`
})

const ambientPositions = [
  { x: 50, y: -20, w: 100, h: 60 },
  { x: 80, y: 10, w: 50, h: 40 },
  { x: 20, y: 5, w: 60, h: 45 },
  { x: 65, y: -10, w: 70, h: 50 },
  { x: 35, y: 15, w: 55, h: 35 },
  { x: 50, y: 0, w: 80, h: 55 },
  { x: 15, y: -5, w: 45, h: 40 },
  { x: 75, y: 5, w: 65, h: 45 },
]

const ambientBackground = computed(() => {
  const c = activeProviderColors.value
  const intensity = hasProviders.value ? 8 : 3
  const gradients = c.map((color, i) => {
    const pos = ambientPositions[i % ambientPositions.length]!
    return `radial-gradient(ellipse ${pos.w}% ${pos.h}% at ${pos.x}% ${pos.y}%, color-mix(in srgb, ${color} ${intensity}%, transparent) 0%, transparent 70%)`
  })
  gradients.push('radial-gradient(ellipse 50% 40% at 20% 80%, rgba(10, 15, 21, 0.5) 0%, transparent 70%)')
  return gradients.join(', ')
})

const providerIdParam = computed(() =>
  [...selectedProviders.value].join('|')
)


function movieProviders(movie: any) {
  const watchData = movie['watch/providers']?.results?.US
  const flatrate: any[] = watchData?.flatrate || []
  const link: string | null = watchData?.link || null
  return PROVIDERS
    .filter(p => selectedProviders.value.has(p.id) && flatrate.some(f => f.provider_id === p.id))
    .map(p => {
      const logo = flatrate.find(f => f.provider_id === p.id)?.logo_path
      return { ...p, logo: logo ? `https://image.tmdb.org/t/p/w45${logo}` : null, link }
    })
}

const PAGES_PER_BATCH = 3
const MAX_PAGE = 15

async function fetchPage(providerIds: string, pg: number) {
  const clientSorts = ['runtime.asc', 'runtime.desc']
  const apiSort = clientSorts.includes(sortBy.value) ? 'popularity.desc' : sortBy.value
  let url = `https://api.themoviedb.org/3/discover/movie?with_watch_providers=${providerIds}&watch_region=US&sort_by=${apiSort}&page=${pg}&with_original_language=en`
  if (selectedGenre.value) url += `&with_genres=${selectedGenre.value}`
  if (selectedMood.value) {
    const mood = MOODS.find(m => m.id === selectedMood.value)
    if (mood && mood.keywordIds.length > 0) {
      url += `&with_keywords=${mood.keywordIds.join('|')}`
    }
  }
  if (personFilter.value) url += `&with_people=${personFilter.value.id}`
  if (sortBy.value === "vote_average.desc") url += `&vote_count.gte=200`
  const res = await fetch(url, { headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.status_message || "API error")
  return data
}

async function fetchMovies(providerIds: string, startPage = 1) {
  const isInitial = startPage === 1
  if (isInitial) loading.value = true
  else loadingMore.value = true
  error.value = null
  try {
    const firstData = await fetchPage(providerIds, startPage)
    const maxAvailable = Math.min(firstData.total_pages, MAX_PAGE)
    const endPage = Math.min(startPage + PAGES_PER_BATCH - 1, maxAvailable)
    const remainingPages = []
    for (let p = startPage + 1; p <= endPage; p++) remainingPages.push(p)
    const allData = [firstData, ...await Promise.all(remainingPages.map(p => fetchPage(providerIds, p)))]
    const allResults = allData.flatMap(d => d.results)
    const seenIds = new Set(movies.value.map((m: any) => m.id))
    const unique = allResults.filter((m: any) => {
      if (seenIds.has(m.id)) return false
      seenIds.add(m.id)
      return true
    })
    const movieDetails = await Promise.all(
      unique.map((m: any) =>
        fetch(`https://api.themoviedb.org/3/movie/${m.id}?append_to_response=credits,videos,release_dates,watch/providers`, { headers })
          .then((r) => r.json())
          .catch(() => ({ ...m, runtime: null }))
      )
    )
    if (isInitial) movies.value = movieDetails
    else movies.value = [...movies.value, ...movieDetails]
    hasMore.value = endPage < maxAvailable
    page.value = endPage
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function toggleProvider(p: typeof PROVIDERS[number]) {
  const next = new Set(selectedProviders.value)
  if (next.has(p.id)) next.delete(p.id)
  else next.add(p.id)
  selectedProviders.value = next
}

function toggleGenre(id: number) {
  selectedGenre.value = selectedGenre.value === id ? null : id
}

function selectMood(moodId: string) {
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

function refetch() {
  if (hasProviders.value) {
    movies.value = []
    page.value = 1
    fetchMovies(providerIdParam.value, 1)
  }
}

watch(selectedProviders, () => {
  if (hasProviders.value) refetch()
  else { movies.value = []; hasMore.value = false }
}, { immediate: true })
watch([selectedGenre, sortBy, personFilter, selectedMood], () => { refetch() })

function searchPerson(person: { id: number; name: string }) {
  personFilter.value = person
  closeMovie()
}

function clearPersonFilter() {
  personFilter.value = null
}

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function setupObserver() {
  if (observer) observer.disconnect()
  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry && entry.isIntersecting && hasMore.value && !loadingMore.value && !loading.value && hasProviders.value) {
      fetchMovies(providerIdParam.value, page.value + 1)
    }
  }, { rootMargin: '400px' })
  watch(sentinel, (el) => {
    if (observer) { observer.disconnect(); if (el) observer.observe(el) }
  }, { immediate: true })
}

setupObserver()
onUnmounted(() => { observer?.disconnect() })

const selectedMovie = ref<any>(null)
const flipOrigin = ref<{ x: number; y: number; w: number; h: number } | null>(null)

function openMovie(movie: any, cardRect?: DOMRect) {
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

function closeMovie() {
  selectedMovie.value = null
  flipOrigin.value = null
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
}
</script>

<template>
  <div class="min-h-screen bg-void font-body text-text-body relative overflow-hidden">
    <!-- Layered ambient lighting -->
    <div class="ambient-layer" :style="{ background: ambientBackground }" />
    <div class="grain-overlay" />

    <div class="relative z-1 max-w-280 mx-auto px-8 pb-32 max-sm:px-5">

      <!-- ═══ Header ═══ -->
      <header class="pt-20 pb-14 max-sm:pt-14 max-sm:pb-10">
        <div class="flex items-center gap-3 mb-6">
          <div class="h-px flex-1 bg-linear-to-r from-transparent via-border to-transparent" />
          <span class="text-[10px] tracking-[5px] uppercase text-text-muted font-medium">What fits tonight</span>
          <div class="h-px flex-1 bg-linear-to-r from-transparent via-border to-transparent" />
        </div>
        <h1 class="font-display text-[clamp(2.4rem,6vw,4.5rem)] font-bold m-0 leading-[1.05] text-text-primary text-center">
          Set your window.<br />
          <em
            class="tagline-accent font-display italic font-medium"
            :style="activeProviderColors.length > 1
              ? { backgroundImage: providerGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
              : { color: providerColor }"
          >
            We'll find what fits.
          </em>
        </h1>
        <p class="text-text-muted text-[13px] text-center mt-5 max-w-md mx-auto leading-relaxed">
          Pick a platform, set your start and end time, and only see movies you can actually finish.
        </p>
        <div class="w-12 h-px bg-border mx-auto mt-8" />
      </header>

      <!-- ═══ Controls ═══ -->
      <div class="grid grid-cols-[1fr_auto] gap-10 items-start mb-12 max-sm:grid-cols-1 max-sm:gap-8">
        <div>
          <p class="control-label">My services</p>
          <div class="flex flex-wrap gap-2.5">
            <button
              v-for="p in PROVIDERS"
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

        <div class="flex gap-4 max-sm:flex-col max-sm:gap-6">
          <div class="min-w-36 max-sm:min-w-0">
            <p class="control-label">Start at</p>
            <select
              v-model="startTimeStr"
              class="select-input"
              :class="{ active: !!startTimeStr }"
              :style="startTimeStr ? { '--c': providerColor } : {}"
            >
              <option value="">Now</option>
              <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="min-w-36 max-sm:min-w-0">
            <p class="control-label">Done by</p>
            <select
              v-model="endTimeStr"
              class="select-input"
              :class="{ active: !!endTimeStr }"
              :style="endTimeStr ? { '--c': providerColor } : {}"
            >
              <option value="">Any time</option>
              <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
            <Transition name="hint">
              <p v-if="maxRuntimeMinutes != null && maxRuntimeMinutes > 0" class="mt-2.5 text-[11px] text-text-muted tracking-wide tabular-nums flex items-center gap-1.5">
                <span class="inline-block w-1 h-1 rounded-full" :style="{ background: providerColor }" />
                {{ fmtRuntime(maxRuntimeMinutes) }} max runtime
              </p>
            </Transition>
          </div>
        </div>
      </div>

      <!-- ═══ Genre & Sort ═══ -->
      <Transition name="slide-fade">
        <div v-if="hasProviders" class="grid grid-cols-[1fr_auto] gap-10 items-start mb-12 pb-10 border-b border-border-subtle max-sm:grid-cols-1 max-sm:gap-8">
          <div>
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
            <p class="control-label">Genre</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="g in GENRES"
                :key="g.id"
                class="pill-btn pill-sm"
                :class="{ active: selectedGenre === g.id }"
                :style="{ '--c': providerColor }"
                @click="toggleGenre(g.id)"
              >
                {{ g.name }}
              </button>
            </div>
          </div>
          <div class="min-w-44 max-sm:min-w-0 flex flex-col gap-4">
            <div>
              <p class="control-label">Sort by</p>
              <select
                v-model="sortBy"
                class="select-input"
                :class="{ active: sortBy !== 'popularity.desc' }"
                :style="{ '--c': providerColor }"
              >
                <option v-for="s in SORT_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <label v-if="!startTimeStr && endTimeStr" class="expiring-toggle" :style="{ '--c': providerColor }">
              <input type="checkbox" v-model="expiringFirst" class="sr-only" />
              <span class="toggle-track" :class="{ on: expiringFirst }">
                <span class="toggle-thumb" />
              </span>
              <span class="text-[12px] text-text-muted">Expiring first</span>
            </label>
          </div>
        </div>
      </Transition>

      <!-- ═══ Person filter badge ═══ -->
      <Transition name="slide-fade">
        <div v-if="personFilter" class="mb-10 flex items-center gap-3">
          <span class="text-[10px] tracking-[3px] uppercase text-text-dim font-medium">Showing films with</span>
          <span class="person-badge" :style="{ '--c': providerColor }">
            {{ personFilter.name }}
            <button class="person-badge-close" @click="clearPersonFilter" aria-label="Clear person filter">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </span>
        </div>
      </Transition>

      <!-- ═══ Empty state ═══ -->
      <Transition name="fade" mode="out-in">
        <div v-if="!hasProviders" class="text-center pt-28 max-sm:pt-20">
          <div class="empty-rings">
            <div class="orbit ring-1" />
            <div class="orbit ring-2" />
            <div class="orbit ring-3" />
          </div>
          <p class="text-text-dim text-sm tracking-wider mt-8 font-display italic">
            Choose a platform above to explore
          </p>
        </div>
      </Transition>

      <!-- ═══ Loading ═══ -->
      <Transition name="fade">
        <div v-if="loading" class="text-center pt-28">
          <div class="loading-bars">
            <span v-for="i in 5" :key="i" class="bar" :style="{ animationDelay: `${i * 0.1}s`, background: activeProviderColors[(i - 1) % activeProviderColors.length] }" />
          </div>
          <p class="text-text-muted text-xs tracking-[3px] uppercase mt-6">Loading</p>
        </div>
      </Transition>

      <!-- ═══ Error ═══ -->
      <Transition name="fade">
        <div v-if="error" class="text-center pt-20">
          <div class="inline-flex items-center gap-3 px-6 py-3 bg-red-500/5 border border-red-500/15 rounded-xl">
            <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span class="text-red-400/80 text-[13px]">{{ error }}</span>
          </div>
        </div>
      </Transition>

      <!-- ═══ Results ═══ -->
      <template v-if="!loading && hasProviders">
        <div v-if="endTimeStr" class="flex items-end gap-4 mb-8">
          <span
            class="font-display text-5xl font-bold leading-none tracking-tight"
            :style="activeProviderColors.length > 1
              ? { backgroundImage: providerGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
              : { color: providerColor }"
          >
            {{ filtered.length }}
          </span>
          <div class="pb-1.5">
            <span class="text-text-muted text-[13px]">
              movies finishing before {{ endTimeStr }}
            </span>
            <template v-if="movies.length > filtered.length">
              <span class="text-text-dim text-[13px] ml-1.5">
                ({{ movies.length - filtered.length }} too long)
              </span>
            </template>
          </div>
        </div>

        <Transition name="fade" mode="out-in">
          <div v-if="filtered.length === 0" class="text-center py-20">
            <p class="text-text-dim text-sm font-display italic">
              Nothing fits that window. Try a later time.
            </p>
          </div>
        </Transition>

        <TransitionGroup name="grid" tag="div" class="grid grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-4 max-sm:grid-cols-[repeat(auto-fill,minmax(135px,1fr))] max-sm:gap-3">
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
            @select="openMovie"
          />
        </TransitionGroup>

        <div v-if="hasMore" ref="sentinel" class="h-24 flex items-center justify-center">
          <Transition name="fade">
            <div v-if="loadingMore" class="flex gap-1.5">
              <span v-for="i in 3" :key="i" class="w-1.5 h-1.5 rounded-full animate-pulse" :style="{ background: providerColor, animationDelay: `${i * 0.15}s` }" />
            </div>
          </Transition>
        </div>
      </template>
    </div>

    <MovieModal v-if="selectedMovie" :movie="selectedMovie" :accent-color="providerColor" :flip-origin="flipOrigin" :start-at="startMs" :deadline-ms="deadlineMs" :providers="movieProviders(selectedMovie)" @close="closeMovie" @search-person="searchPerson" />
  </div>
</template>

<style scoped>
@reference "./style.css";

/* ═══ Ambient lighting ═══ */
.ambient-layer {
  @apply fixed inset-0 pointer-events-none z-0;
  transition: background 1.2s ease;
}

/* Film grain texture */
.grain-overlay {
  @apply fixed inset-0 pointer-events-none z-2;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
  mix-blend-mode: overlay;
}

/* ═══ Control label ═══ */
.control-label {
  @apply text-[10px] tracking-[4px] uppercase text-text-dim mb-3.5 font-medium;
}

/* ═══ Pill buttons ═══ */
.pill-btn {
  @apply px-5 py-2.5 rounded-full border border-border bg-surface-raised
         text-text-muted font-body text-[13px] font-medium cursor-pointer
         whitespace-nowrap flex items-center gap-2.5;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.pill-btn:hover {
  @apply border-border-hover text-text-secondary bg-surface-alt;
}
.pill-btn.active {
  border-color: color-mix(in srgb, var(--c) 50%, transparent);
  background: color-mix(in srgb, var(--c) 8%, var(--color-surface-raised));
  color: color-mix(in srgb, var(--c) 85%, white);
  box-shadow:
    0 0 24px -4px color-mix(in srgb, var(--c) 20%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--c) 8%, transparent);
}
.pill-dot {
  @apply w-2 h-2 rounded-full opacity-40;
  transition: opacity 0.3s;
}
.pill-btn.active .pill-dot {
  @apply opacity-100;
  box-shadow: 0 0 6px currentColor;
}
.pill-sm {
  @apply text-xs px-4 py-2;
}
.pill-sm .pill-dot { @apply hidden; }

/* ═══ Person badge ═══ */
.person-badge {
  @apply inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium;
  color: var(--c);
  background: color-mix(in srgb, var(--c) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 20%, transparent);
}
.person-badge-close {
  @apply ml-1 p-0.5 rounded-full cursor-pointer bg-transparent border-0 flex items-center justify-center;
  color: var(--c);
  opacity: 0.5;
  transition: opacity 0.2s;
}
.person-badge-close:hover { opacity: 1; }

/* ═══ Expiring toggle ═══ */
.expiring-toggle {
  @apply flex items-center gap-2.5 cursor-pointer;
}
.toggle-track {
  @apply relative w-8 h-[18px] rounded-full bg-border transition-colors duration-300;
}
.toggle-track.on {
  background: color-mix(in srgb, var(--c) 50%, transparent);
}
.toggle-thumb {
  @apply absolute top-[3px] left-[3px] w-3 h-3 rounded-full bg-text-muted transition-all duration-300;
}
.toggle-track.on .toggle-thumb {
  transform: translateX(14px);
  background: var(--c);
}

/* ═══ Select ═══ */
.select-input {
  @apply w-full py-2.5 pl-4 pr-10 rounded-xl border border-border bg-surface-raised
         text-text-muted font-body text-[13px] cursor-pointer outline-none appearance-none;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%233d3832' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}
.select-input:hover {
  @apply border-border-hover;
}
.select-input.active {
  border-color: color-mix(in srgb, var(--c) 40%, transparent);
  color: var(--color-text-primary);
  box-shadow: 0 0 16px -4px color-mix(in srgb, var(--c) 15%, transparent);
}

/* ═══ Empty state rings ═══ */
.empty-rings {
  @apply relative w-24 h-24 mx-auto;
}
.orbit {
  @apply absolute rounded-full border border-border;
  inset: 0;
  animation: ring-breathe 4s ease-in-out infinite;
}
.orbit-1 { inset: 0; animation-delay: 0s; }
.orbit-2 { inset: 12px; animation-delay: 0.4s; }
.orbit-3 { inset: 24px; animation-delay: 0.8s; }

@keyframes ring-breathe {
  0%, 100% { opacity: 0.15; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.05); }
}

/* ═══ Loading bars ═══ */
.loading-bars {
  @apply flex items-end justify-center gap-1 h-8;
}
.bar {
  @apply w-1 rounded-full;
  animation: bar-dance 1s ease-in-out infinite;
}
@keyframes bar-dance {
  0%, 100% { height: 8px; opacity: 0.3; }
  50% { height: 28px; opacity: 1; }
}

/* ═══ Transitions ═══ */
.fade-enter-active,
.fade-leave-active { @apply transition-opacity duration-300; }
.fade-enter-from,
.fade-leave-to { @apply opacity-0; }

.slide-fade-enter-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-fade-leave-active { transition: all 0.3s ease; }
.slide-fade-enter-from { opacity: 0; transform: translateY(-16px); }
.slide-fade-leave-to { opacity: 0; transform: translateY(-10px); }

.hint-enter-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.hint-leave-active { transition: all 0.2s ease; }
.hint-enter-from,
.hint-leave-to { opacity: 0; transform: translateY(-6px); }

.grid-enter-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.grid-leave-active { transition: all 0.3s ease; position: absolute; }
.grid-enter-from { opacity: 0; transform: scale(0.9) translateY(8px); }
.grid-leave-to { opacity: 0; transform: scale(0.9); }
.grid-move { transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }

.modal-enter-active { transition: opacity 0.35s ease; }
.modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-from,
.modal-leave-to { @apply opacity-0; }
</style>

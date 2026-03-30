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

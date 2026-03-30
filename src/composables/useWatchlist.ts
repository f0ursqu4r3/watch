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

import { useLocale } from './useLocale'

const BASE = 'https://api.themoviedb.org/3'
const TOKEN = import.meta.env.VITE_TMDB_TOKEN

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
}

export interface TmdbOpts {
  watchRegion?: boolean
  query?: Record<string, string>
}

/** Pure URL builder — testable without network. */
export function buildTmdbUrl(path: string, opts: TmdbOpts, tmdbLang: string, region: string): string {
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v)
  url.searchParams.set('language', tmdbLang)
  if (opts.watchRegion) url.searchParams.set('watch_region', region)
  return url.toString()
}

export function useTmdb() {
  const { tmdbLang, region } = useLocale()

  async function tmdb<T = any>(path: string, opts: TmdbOpts = {}): Promise<T> {
    const url = buildTmdbUrl(path, opts, tmdbLang.value, region.value)
    const res = await fetch(url, { headers })
    const data = await res.json()
    if (!res.ok) throw new Error(data.status_message || 'API error')
    return data
  }

  return { tmdb }
}

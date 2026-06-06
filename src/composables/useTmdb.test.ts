import { describe, it, expect, beforeEach } from 'vitest'
import { buildTmdbUrl } from './useTmdb'

beforeEach(() => {
  localStorage.clear()
})

describe('buildTmdbUrl', () => {
  it('injects language on every request', () => {
    const url = buildTmdbUrl('/movie/123', {}, 'es-ES', 'ES')
    expect(url).toContain('https://api.themoviedb.org/3/movie/123')
    expect(url).toContain('language=es-ES')
  })

  it('injects watch_region only when requested', () => {
    const withRegion = buildTmdbUrl('/discover/movie', { watchRegion: true }, 'en-US', 'JP')
    expect(withRegion).toContain('watch_region=JP')
    const without = buildTmdbUrl('/movie/123', {}, 'en-US', 'JP')
    expect(without).not.toContain('watch_region')
  })

  it('preserves caller-supplied query params', () => {
    const url = buildTmdbUrl('/discover/movie', { query: { page: '2', sort_by: 'popularity.desc' } }, 'fr-FR', 'FR')
    expect(url).toContain('page=2')
    expect(url).toContain('sort_by=popularity.desc')
    expect(url).toContain('language=fr-FR')
  })
})

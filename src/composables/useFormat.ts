import { useLocale } from './useLocale'

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

export function localizeDigits(s: string, lang: string): string {
  if (lang !== 'ar') return s
  return s.replace(/[0-9]/g, d => AR_DIGITS[Number(d)]!)
}

export function fmtRuntimeFor(min: number, lang: string): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const s = h > 0 ? `${h}h ${m}m` : `${m}m`
  return localizeDigits(s, lang)
}

export function fmtClockFor(ms: number, lang: string): string {
  return new Date(ms).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
}

export function fmtCountdownFor(totalSecs: number, lang: string): string {
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const sec = totalSecs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const raw = h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
  return localizeDigits(raw, lang)
}

export function fmtRatingFor(value: number, lang: string): string {
  return new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}

/** Component-facing wrapper bound to the active locale. */
export function useFormat() {
  const { language } = useLocale()
  return {
    runtime: (min: number) => fmtRuntimeFor(min, language.value),
    clock: (ms: number) => fmtClockFor(ms, language.value),
    countdown: (secs: number) => fmtCountdownFor(secs, language.value),
    rating: (v: number) => fmtRatingFor(v, language.value),
  }
}

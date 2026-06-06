// TMDB provider_id -> brand color for global majors. Anything else gets a hashed hue.
const BRAND: Record<number, string> = {
  8: '#E50914',    // Netflix
  9: '#00A8E1',    // Prime Video
  337: '#1133A6',  // Disney+
  384: '#5822B4',  // HBO Max / Max
  1899: '#5822B4', // Max (newer id)
  15: '#1CE783',   // Hulu
  386: '#FFD700',  // Peacock
  531: '#0064FF',  // Paramount+
  283: '#F47521',  // Crunchyroll
  2: '#000000',    // Apple TV
  350: '#1B1D1F',  // Apple TV+
}

function hashToHsl(id: number): string {
  // Stable hue from id; fixed saturation/lightness tuned to the neon glow palette.
  let h = id * 2654435761 // Knuth multiplicative hash
  h = (h ^ (h >>> 15)) >>> 0
  const hue = h % 360
  return `hsl(${hue}, 70%, 55%)`
}

export function providerColor(id: number): string {
  return BRAND[id] ?? hashToHsl(id)
}

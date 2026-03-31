# Tier 1 Feature Design — watch.

**Date:** 2026-03-30
**Status:** Approved
**Scope:** 5 new features that enhance discovery, personalization, and delight — all client-side, no backend required.

---

## Overview

Five features that transform watch. from a time-window movie finder into a discovery playground:

1. **Mood-Based Browsing** — browse by feeling instead of genre
2. **Hidden Gems Filter** — surface critically loved, under-the-radar films
3. **Unified Watchlist** — save movies to a personal list, accessible via dedicated tab
4. **Inline Trailer Previews** — hover/long-press cards to preview trailers in-place
5. **Micro Sound Design** — subtle cinematic UI sounds (opt-in)

**Iconography:** All icons use [Lucide](https://lucide.dev/) — no emojis anywhere in the UI.

**Persistence:** All new state uses localStorage, consistent with existing provider selection persistence.

**Responsive:** All features must work equally well on desktop and mobile (touch equivalents for hover interactions).

---

## 1. Mood-Based Browsing

### Purpose

Genres are a technical classification. Moods are how people actually decide what to watch. This feature lets users express intent ("I want to laugh") rather than navigate taxonomy ("Comedy").

### UI Placement

A new row of pill buttons between the existing provider row and genre row, labeled `MOOD` (same uppercase tracking style as existing labels).

### Moods

Each mood maps to a combination of TMDB genre IDs and keyword IDs. Selecting a mood auto-selects the relevant genres (visible in the genre row) and applies keyword filters to the API query.

| Mood | Icon (Lucide) | Genre IDs | TMDB Keyword Strategy |
|------|---------------|-----------|----------------------|
| Make Me Laugh | `laugh` | 35 (Comedy) | satire, parody, slapstick, dark-comedy |
| Edge of My Seat | `flame` | 53 (Thriller), 28 (Action) | suspense, heist, chase, cat-and-mouse |
| Feel-Good | `heart` | 35 (Comedy), 10749 (Romance), 10751 (Family) | feel-good, wholesome, uplifting |
| Mind-Bending | `brain` | 878 (Sci-Fi), 9648 (Mystery) | time-travel, dystopia, psychological, twist-ending |
| Dark & Twisted | `skull` | 27 (Horror), 53 (Thriller) | noir, cult, revenge, serial-killer |
| Comfort Watch | `coffee` | 35 (Comedy), 10749 (Romance) | cozy, nostalgic, comfort, lighthearted |
| Background Noise | `headphones` | 99 (Documentary), 35 (Comedy) | sorted by popularity desc (light, familiar viewing) |
| Cry It Out | `cloud-rain` | 18 (Drama), 10749 (Romance) | loss, based-on-true-story, tearjerker, grief |

### Behavior

- Moods are single-select (one active at a time) or none.
- Selecting a mood:
  1. Sets `selectedMood` state
  2. Auto-selects the mapped genre(s) in the genre row (visually highlighted)
  3. Adds `with_keywords` parameter to the TMDB API query
  4. Triggers a refetch
- User can still manually toggle individual genres after selecting a mood to fine-tune results. Doing so does NOT deselect the mood — it just overrides the genre portion while keeping keywords active.
- Deselecting the mood clears keyword filters and resets genres to none.
- Pill styling matches existing genre pills. Active state uses the app's gold accent color (`--color-gold`) with glow, consistent with how active provider pills look.

### API Integration

Add `with_keywords` parameter to the existing `/discover/movie` call:

```
/3/discover/movie?with_keywords=keyword_id1|keyword_id2&with_genres=genre_id1,genre_id2&...
```

TMDB keyword IDs need to be resolved once. Use `/3/search/keyword?query=satire` during development to find IDs, then hardcode the mappings as constants (same pattern as `GENRES` and `PROVIDERS`).

### Data Model

```ts
interface Mood {
  id: string           // e.g. 'make-me-laugh'
  label: string        // e.g. 'Make Me Laugh'
  icon: string         // Lucide icon name
  genreIds: number[]   // TMDB genre IDs
  keywordIds: number[] // TMDB keyword IDs
  sortOverride?: string // optional sort override (e.g. 'background-noise' sorts by popularity)
}
```

New state: `selectedMood: string | null` — not persisted to localStorage (mood is a per-session choice).

---

## 2. Hidden Gems Filter

### Purpose

Surface highly-rated movies that most people haven't heard of. The "I never would have found this" factor.

### Filter Criteria

A movie qualifies as a "hidden gem" when:
- `vote_average >= 7.5` (high quality)
- `popularity < 50` (under the radar)
- `vote_count >= 50` (enough votes to be trustworthy, not just 3 people rating it 10/10)

### UI

**Toggle:** A pill button in the controls area (near sort dropdown), labeled "Hidden Gems" with the Lucide `gem` icon. Active state uses green accent (`#1CE783`) with glow.

**Badge:** Cards that qualify as hidden gems display a small badge in the top-right corner: the `gem` icon + "GEM" text, styled with the green accent. The badge appears regardless of whether the filter toggle is active — it's a passive discovery signal.

### API Integration

When the toggle is active, add these parameters to the discover query:
- `vote_average.gte=7.5`
- `vote_count.gte=50`
- `sort_by=vote_average.desc`

Client-side: filter results where `popularity < 50` (TMDB doesn't support `popularity.lte` in the discover endpoint).

When the toggle is inactive, the badge is computed client-side from the movie data already loaded — no extra API calls.

### Data Model

New state: `hiddenGemsOnly: boolean` (default `false`). Not persisted to localStorage.

New computed: `isHiddenGem(movie): boolean` — used for badge display on cards regardless of filter state.

---

## 3. Unified Watchlist

### Purpose

A single "save for later" list that works across all providers. When you set a time window, your saved movies that fit are easy to find.

### UI Components

#### Bookmark Icon on Cards

- Position: top-left corner of the card poster
- Icon: Lucide `bookmark` (outline) when not saved, `bookmark-check` (filled) when saved
- Visibility: always visible on mobile; appears on hover on desktop
- Color: gold (`--color-gold`) when saved, `--color-text-muted` when not
- Click/tap toggles watchlist membership
- Brief scale animation on toggle (pop effect)

#### "Add to My List" in Modal

- A button in the MovieModal, near the existing streaming service links
- Uses the same `bookmark` / `bookmark-check` icon with label text
- Same toggle behavior as the card icon

#### "My List" Tab

- A tab in the header area: `DISCOVER | MY LIST`
- Active tab indicated by gold underline (consistent with app accent)
- My List view:
  - Shows all watchlisted movies in the same card grid layout
  - Same time window controls apply — movies that fit the current window get a gold border highlight
  - Same sort options available
  - Empty state: "Your list is empty. Bookmark movies to save them here." with the `bookmark` icon

### Persistence

localStorage key: `watchlist`

```ts
interface WatchlistEntry {
  id: number              // TMDB movie ID
  title: string           // for display without re-fetching
  posterPath: string | null
  runtime: number | null  // minutes
  voteAverage: number
  addedAt: number         // timestamp
}
```

Store as JSON array. Max reasonable size: ~500 entries before localStorage concerns arise (each entry is ~150 bytes = ~75KB for 500 movies).

### Data Model

New state:
- `watchlist: WatchlistEntry[]` — initialized from localStorage on mount
- `activeTab: 'discover' | 'my-list'` — default `'discover'`

New methods:
- `toggleWatchlist(movie)` — add/remove from list, sync to localStorage
- `isInWatchlist(movieId): boolean` — for icon state

### Behavior

- When in My List tab, the existing filter/sort controls still work
- Switching tabs does not reset filters
- Movies removed from the list while viewing My List animate out of the grid

---

## 4. Inline Trailer Previews

### Purpose

Let users gut-check a movie without committing to opening the full modal. A quick preview reduces decision fatigue.

### Interaction

**Desktop:** Hover over a card for 800ms to trigger the preview. Moving the mouse away stops it.

**Mobile:** Long-press (500ms) triggers the preview. Releasing stops it. Regular tap still opens the modal as normal.

### Preview Behavior

1. **Primary: YouTube embed** — if the movie has a YouTube trailer (from TMDB `videos` data):
   - Create a YouTube iframe overlay on the card poster area
   - Autoplay, muted, no controls (`autoplay=1&mute=1&controls=0&modestbranding=1`)
   - Plays for up to 15 seconds, then pauses
   - Small progress bar at the bottom of the card (accent-colored)
   - Lucide `volume-x` / `volume-2` toggle in bottom-right corner for unmute
   - Lucide `play` icon shown briefly before video loads

2. **Fallback: Animated backdrop** — if no trailer available or YouTube embed is blocked:
   - Ken Burns effect: slow zoom + pan on the movie's backdrop image
   - Overlay with movie info: title, rating, runtime, genre pills
   - Subtle parallax motion on the text layer

### Performance

- Only one trailer iframe exists at a time — moving to a new card destroys the previous one
- Iframe is created lazily on hover, not pre-loaded
- A `data-trailer-key` attribute on each card stores the YouTube video key (populated from movie detail data)
- No trailer fetch until hover — the video key comes from the existing movie detail fetch

### Data Requirements

The app already fetches `videos` in the movie detail `append_to_response`. The trailer key needs to be extracted and stored on the movie object:

```ts
// Computed from movie detail response
const trailerKey = movie.videos?.results?.find(
  v => v.site === 'YouTube' && v.type === 'Trailer'
)?.key
```

### Edge Cases

- If the user clicks the card during preview, stop the preview and open the modal normally
- If the card scrolls out of view during preview, stop and clean up the iframe
- Respect `prefers-reduced-motion` — disable auto-preview, show a static play button instead

---

## 5. Micro Sound Design

### Purpose

Subtle audio feedback that makes interactions feel tactile and cinematic. Entirely opt-in — off by default.

### Toggle

- Location: header, right side, after the "My List" tab
- Icon: Lucide `volume-x` (when off) / `volume-2` (when on)
- Persisted in localStorage key: `soundEnabled` (default `false`)
- Click toggles the state

### Sound Events

| Event | Sound Description | Duration | Trigger |
|-------|------------------|----------|---------|
| Modal open | Soft film-projector whir | 200ms | `openMovie()` called |
| Modal close | Gentle mechanical click | 100ms | `closeMovie()` called |
| Add to watchlist | Satisfying "pop" | 150ms | `toggleWatchlist()` — adding |
| Remove from watchlist | Soft slide-away swoosh | 150ms | `toggleWatchlist()` — removing |
| Mood selected | Atmospheric tone (varies by mood) | 300ms | Mood pill clicked |
| Hidden gem found | Subtle crystal chime | 200ms | Gem badge first appears in viewport |
| Filter/sort change | Quiet tick | 80ms | Provider, genre, sort, or time changed |

### Implementation

- **Web Audio API** with an `AudioContext` created on first user interaction (browser autoplay policy)
- Sound assets: single audio sprite file (~50KB total) containing all sounds
- Utility: `playSound(eventName: string)` — looks up the sound in the sprite map, plays it if sound is enabled
- All sounds respect the system mute state
- **Mobile haptics:** For tactile events (watchlist toggle, filter change), also trigger `navigator.vibrate(10)` when sound is enabled and vibration is supported

### Sound Design Guidelines

- All sounds should feel cinematic but understated — think A24 menu UI, not arcade game
- Maximum volume: 30% of system volume (gain node at 0.3)
- No sounds on scroll, page load, or passive events
- Mood tones should subtly reflect the mood (warm for feel-good, tense for edge-of-my-seat, etc.)

### Asset Creation

Sound assets can be generated with:
- Free SFX libraries (freesound.org, mixkit.co)
- Web Audio API oscillators for simple tones (ticks, chimes)
- Record and process with Audacity for the film-projector whir

---

## Cross-Cutting Concerns

### Icon Integration

Install Lucide Vue:

```bash
bun add lucide-vue-next
```

Import icons individually to keep bundle size small:

```ts
import { Bookmark, BookmarkCheck, Gem, Laugh, Flame, Heart, Brain, Skull, Coffee, Headphones, CloudRain, Volume2, VolumeX, Play } from 'lucide-vue-next'
```

### State Summary

| State | Type | Persisted | Location |
|-------|------|-----------|----------|
| `selectedMood` | `string \| null` | No | App.vue |
| `hiddenGemsOnly` | `boolean` | No | App.vue |
| `watchlist` | `WatchlistEntry[]` | Yes (localStorage) | App.vue |
| `activeTab` | `'discover' \| 'my-list'` | No | App.vue |
| `soundEnabled` | `boolean` | Yes (localStorage) | App.vue |

### Component Changes

| Component | Changes |
|-----------|---------|
| **App.vue** | Add mood row, hidden gems toggle, watchlist state, tab switching, sound toggle in header, sound utility |
| **MovieCard.vue** | Add bookmark icon, gem badge, trailer preview on hover/long-press |
| **MovieModal.vue** | Add "Add to My List" button |

### New Files

| File | Purpose |
|------|---------|
| `src/composables/useSound.ts` | Sound system: AudioContext management, sprite playback, volume control |
| `src/composables/useWatchlist.ts` | Watchlist CRUD with localStorage sync |
| `src/data/moods.ts` | Mood definitions with genre/keyword mappings |
| `src/assets/sounds.mp3` | Audio sprite file |

### Performance Budget

- Lucide icons: tree-shaken, ~14 icons = ~7KB gzipped
- Sound sprite: ~50KB
- No new API calls beyond existing TMDB endpoints (just additional query parameters)
- YouTube iframe: loaded lazily, one at a time, destroyed on unmount
- Total bundle increase estimate: ~60KB

---

## Out of Scope (Tier 2 & 3)

These features are designed for future iterations and are explicitly not part of this spec:

- Rabbit Hole Explorer (interactive graph UI)
- Leaving Soon Alerts (requires expiration data source)
- Ambient Poster Mode
- Share Cards
- Stats Dashboard
- Group Decision Mode
- Weekly Movie Planner
- Best Value Finder

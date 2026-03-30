# Watched List with User Ratings

## Overview

Add a "Watched" tab where users track movies they've seen and rate them on a 4-tier scale using Lucide thumbs icons. Movies flow through a lifecycle: Discover → My List (want to watch) → Watched (seen + rated). Marking a movie as watched automatically removes it from My List.

## Rating System

Four tiers using Lucide icons, each with a distinct color:

| Tier | Icon | Color | Meaning |
|------|------|-------|---------|
| Loved | Two `ThumbsUp` icons side by side | `#1CE783` (green) | Must-watch |
| Good | `ThumbsUp` | `#6cb4ee` (blue) | Enjoyed it |
| Meh | `ThumbsDown` | `#f0a030` (orange) | Disappointing |
| Awful | Two `ThumbsDown` icons side by side | `#ff5555` (red) | Regret watching |

The extreme tiers render two Lucide icons side by side at a smaller size (e.g., 10px each in the card badge, 14px each in the popover buttons) with slight overlap (`margin-left: -3px` on the second icon) to read as a single "double thumbs" glyph.

## Data Model

### New `WatchedEntry` interface

```ts
interface WatchedEntry {
  id: number
  title: string
  posterPath: string | null
  runtime: number | null
  voteAverage: number
  rating: 'loved' | 'good' | 'meh' | 'awful'
  watchedAt: number // Date.now() timestamp
}
```

### Storage

- localStorage key: `watch:watched`
- Same pattern as existing `useWatchlist` composable
- New `useWatched` composable at `src/composables/useWatched.ts`

### Lifecycle integration

When a movie is marked as watched (via rating selection):
1. Create a `WatchedEntry` with the selected rating
2. If the movie exists in the watchlist (My List), remove it automatically
3. The `useWatched` composable imports and calls `useWatchlist().toggleWatchlist()` to handle removal

## UI Components

### 1. Tab Bar (App.vue)

Add third tab after MY LIST:

```
DISCOVER | MY LIST | WATCHED
```

- Tab style matches existing tabs
- Shows count badge when watched list is non-empty (same style as My List count)
- Tab accent color: `#6cb4ee` (blue, matching the thumbs-up "good" tier — the most common rating)

### 2. Rating Popover (MovieModal.vue)

Triggered by a "Mark Watched" button placed next to the existing watchlist button in the modal.

**Button appearance:**
- Same size/style as the watchlist button
- Color: `#6cb4ee` (blue)
- Icon: `CircleCheckBig` from Lucide
- Label: "Mark Watched"
- If already watched: button shows the current rating icon/color + "Watched" label, clicking opens popover to change rating

**Popover behavior:**
- Appears above the button on click
- Contains 4 rating icon buttons in a horizontal row (awful → meh → good → loved, left to right)
- Each icon button: 36px square, rounded 8px, subtle border, color on hover
- Selecting a rating saves immediately and dismisses the popover
- Clicking outside dismisses without saving
- Animate in: scale from 0.95 + opacity, 200ms ease-out, transform-origin at bottom center (toward trigger)
- Animate out: opacity fade, 150ms

**Popover positioning:**
- CSS-only, positioned with `position: absolute` relative to the button wrapper
- No external popover library needed

### 3. Rating Badge on MovieCard (MovieCard.vue)

When a movie has been watched, show a small badge on the card:

- Position: bottom-right, 8px inset
- Size: 26px square, border-radius 7px
- Background: `rgba(0, 0, 0, 0.75)` with `backdrop-filter: blur(8px)`
- Border: 1px solid, color matched to rating tier at 25% opacity
- Icon: 12px Lucide icon matching the rating tier
- This badge replaces/overlaps with the gem badge position if both apply — watched badge takes priority

### 4. Watched Tab View (App.vue)

**Stats bar** at the top:
- Same card style as existing timing-bar (surface-alt background, border, inset shadow)
- Left: total count in display font, large number
- Divider
- Right: horizontal row of 4 rating tiers, each showing icon + count
- Icons are 14px, counts are 14px semibold, colors match tier

**Poster grid:**
- Reuses the same `MovieCard` component and grid layout as Discover/My List
- Cards show the rating badge overlay
- Clicking a card opens the movie modal (same as other tabs)
- No filtering by runtime/deadline — Watched is a journal, not a discovery tool

**Empty state:**
- Similar to My List empty state
- Icon: `CircleCheckBig` (24px, text-dim)
- Title: "Nothing watched yet"
- Subtitle: "Rate a movie to start tracking what you've seen"

### 5. Modal State Awareness (MovieModal.vue)

The modal needs to know if a movie is already watched to show the correct button state:
- Not watched: "Mark Watched" button (blue)
- Already watched: Shows rating icon + "Watched" label (in rating tier color), clickable to change rating

## New Composable: `useWatched`

```ts
// src/composables/useWatched.ts
export function useWatched() {
  return {
    watched,           // ref<WatchedEntry[]>
    isWatched,         // (movieId: number) => boolean
    getWatchedRating,  // (movieId: number) => Rating | null
    markWatched,       // (movie: any, rating: Rating) => void
    removeWatched,     // (movieId: number) => void
    watchedStats,      // computed: { total, loved, good, meh, awful }
  }
}
```

`markWatched` handles the full lifecycle: creates the watched entry, removes from watchlist if present.

## Sound Integration

Using the existing `useSound` composable pattern:
- `sounds.markWatched()` — when a rating is selected (satisfying confirmation)
- No new sound for removing from watched (use existing `sounds.watchlistRemove()`)

## Animation Details

**Popover enter:**
- `transform: scale(0.95); opacity: 0` → `transform: scale(1); opacity: 1`
- 200ms, `cubic-bezier(0.16, 1, 0.3, 1)`
- `transform-origin: bottom center`

**Popover exit:**
- Opacity fade only, 150ms ease

**Rating badge on card:**
- No entrance animation (badge is static based on data state)

**Stats bar counts:**
- Reuse the same `requestAnimationFrame` count animation from the existing `displayCount` pattern in App.vue

**Button state change (after rating):**
- Crossfade: old state fades out, new state fades in, 200ms
- Subtle blur(2px) during transition to mask the swap

## Accessibility

- Popover has `role="dialog"` and `aria-label="Rate this movie"`
- Rating buttons have `aria-label` for each tier ("Loved it", "Good", "Meh", "Awful")
- Escape key dismisses popover
- Focus trapped within popover while open
- All rating buttons keyboard-accessible (Tab + Enter/Space)
- Reduced motion: popover appears instantly (no scale animation)

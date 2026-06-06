# watch.

A cinematic movie discovery app. Browse what's streaming, filter by genre, sort by rating or runtime, and find something to watch before your deadline.

## Features

- Browse movies across streaming platforms (Netflix, Hulu, Disney+, HBO Max, etc.)
- Filter by genre and sort by popularity, rating, release date, or revenue
- Set a "done by" time — only shows movies you can finish before then
- Live countdown timers for movies approaching your deadline
- Movie detail modal with cast, director, trailers, and runtime info
- Click any cast member or director to discover their other films
- Infinite scroll with parallel page loading
- Localized UI and content across 6 languages and 12 regions (see below)

## Localization

The interface and movie data are localized. **Language** (what you read) and **region**
(which streaming market) are independent settings.

- **Languages:** English, Spanish, French, German, Japanese, and Arabic. Arabic renders
  right-to-left; the whole layout mirrors. Numbers and times format per locale (Arabic uses
  Arabic-Indic digits).
- **Regions:** US, GB, ES, FR, DE, JP, MX, BR, CA, AU, IN, SA. The streaming-provider list is
  fetched live from TMDB for the selected region, and movie titles, overviews, genres, and
  certifications come back in the active language.
- **Detection:** on first visit the app picks a language and region from your browser
  (`navigator.languages`), then remembers any manual change in `localStorage`. Switch either at
  any time from the header pickers.

UI strings live in `src/locales/*.json`; a parity test (`src/locales/parity.test.ts`) keeps every
locale in sync with the English source.

## Tech

- Vue 3 + TypeScript
- Tailwind CSS v4
- Vite
- TMDB API

## Setup

```sh
bun install
```

Create a `.env` file with your [TMDB API](https://developer.themoviedb.org/) read access token:

```
VITE_TMDB_TOKEN=your_token_here
```

## Dev

```sh
bun dev
```

## Build

```sh
bun run build
```

## Deploy

Deploys automatically to GitHub Pages on push to `main` via GitHub Actions. Add your `VITE_TMDB_TOKEN` as a repository secret under **Settings > Secrets and variables > Actions**.

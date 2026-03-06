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

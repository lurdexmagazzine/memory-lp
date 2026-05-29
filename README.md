# memory-lp

A read-only, mobile-first diary for Melissa, published on GitHub Pages.

This repo turns Holographic memory facts into a comfortable browsing experience: no markdown wall, no clutter, no fake-dense dashboard nonsense.

## What it does

- Lists memory cards exported from Holographic
- Opens each memory in a readable detail pane
- Filters by category and free text search
- Stays premium on mobile and desktop

## Structure

- `index.html` — app shell
- `styles.css` — Lurdex visual system
- `app.js` — rendering, search, selection
- `data/memories.json` — published snapshot
- `scripts/export_holographic.py` — export local Holographic facts into JSON
- `scripts/seed_holographic.py` — optional local helper to seed the Holographic DB with the curated snapshot

## Local sync

1. Seed the local Holographic DB:

```bash
python3 scripts/seed_holographic.py
```

2. Export the published snapshot:

```bash
python3 scripts/export_holographic.py
```

3. Open locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## GitHub Pages

The repo is meant to be public so GitHub Pages can serve it. Once Pages is enabled, point it at the main branch root.

## Voice

- warm
- human
- editorial
- premium
- a little sharp when it fits

## Guardrails

- read-only by design
- no markdown UI
- no hidden admin layer
- no private operational details in the public snapshot

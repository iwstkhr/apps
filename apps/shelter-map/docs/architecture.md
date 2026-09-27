# Architecture

Structure, data flow, module responsibilities, and delivery pipeline for the Designated Emergency Evacuation Site Map.

See [specification.md](./specification.md) for features, screens, and data specifications.

## Overview

```text
┌──────────────────────────────────────────────────────────────┐
│ Cloudflare Workers (static asset delivery)                    │
│ build/client + public/assets/*.geojson.gz                     │
└────────────────────────────┬─────────────────────────────────┘
                             │ fetch (.geojson.gz)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ Browser SPA (React Router / Vite, ssr: false)                  │
│                                                              │
│ ShelterMapProvider                                           │
│   ├─ useShelterData ──► fetchShelters → Shelter[]              │
│   ├─ useLeafletMap  ──► Leaflet Map + tiles                    │
│   └─ useShelterMap  ──► filters + viewport sync                │
│          │                                                   │
│          ├─ displayedShelters ──► MapTable (virtualized list)  │
│          └─ visible subset ──► Leaflet layers (map)            │
└──────────────────────────────────────────────────────────────┘
```

There is no backend API or database. Evacuation site data is delivered as static files alongside the build output; the client decompresses, validates, and renders it.

## Technology stack

| Layer | Technology |
| --- | --- |
| UI | React 19, TypeScript |
| Routing / Build | React Router 8 (SPA), Vite 8 |
| Map | Leaflet |
| Table | TanStack Virtual |
| Styling | Tailwind CSS 4 |
| Quality | Biome, Vitest, Testing Library, pre-commit |
| Runtime management | mise (Node.js / pnpm / pre-commit) |
| Delivery | Cloudflare Workers (static assets only; custom domain `shelter-map.wasabee.dev`; configured in `wrangler.jsonc`) |

## Directory structure

```text
app/
  components/
    layout/     # Header and app shell
    map/        # Tile switching, interaction hints, loading spinner
    table/      # Table header, rows, column filters, virtual scrolling
  context/      # ShelterMapContext and Provider
  data/         # Fetch gzip GeoJSON
  generated/    # Data update date metadata (generated)
  hooks/        # Data loading, map, and shared state
  lib/
    map/        # Viewport filtering, layer synchronization, popups
    *.ts        # Leaflet initialization, gzip, public URLs, etc.
  routes/       # Pages (home only)
  test/         # Test helpers and fixtures
  types/        # Domain types, validation, and filters
public/assets/  # Static assets such as compressed GeoJSON
scripts/        # Generate dataset-meta
../../.github/workflows/       # At the repository root
  shelter-map-test.yml            # Quality checks for PRs / main
  shelter-map-deploy.yml          # Deploy to Workers on pushes to main
  shelter-map-update-geojson.yml  # Monthly GeoJSON update PR
```

## Runtime data flow

### 1. Startup and data loading

```text
Home
  └─ ShelterMapProvider
       └─ useShelterMap
            └─ useShelterData
                 └─ fetchShelters()
                      ├─ publicUrl('assets/mergeFromCity_2.geojson.gz')
                      ├─ decompressGzipResponse (decompress gzip if needed)
                      ├─ JSON.parse
                      └─ parseShelterGeoJson → Shelter[]
```

- `fetchShelters` caches the result at module scope
- It also handles hosts that return an already decompressed body (gzip is detected using the magic bytes `1f 8b`)
- Loading state reaches the UI through Context as `isLoading` / `loadError`

### 2. Shared filters

```text
MapTable
  draftFilters (immediate)
       │ 200ms debounce
       ▼
  updateColumnFilters
       ▼
  useShelterMap.columnFilters
       ▼
  filterSheltersByColumns(shelters, columnFilters)
       ▼
  displayedShelters ──┬──► MapTable (all results, virtual scrolling)
                      └──► filterSheltersWithinMap ──► syncShelterLayers
```

The table displays all filtered results, while the map creates layers only for results within the current viewport.

### 3. Map layer synchronization

On `moveend` / `zoomlevelschange`, the app:

1. Extracts evacuation sites within the viewport using `map.getBounds()`
1. Chooses markers or circles based on zoom and result count
1. Uses `ShelterLayerRegistry` to apply only additions, removals, and changes in layer type

## Module responsibilities

### Context / Hooks

| Module | Responsibility |
| --- | --- |
| `ShelterMapProvider` | Provide the map container ref and shared state |
| `useShelterMap` | Integrate data, filters, and viewport synchronization |
| `useShelterData` | Manage the GeoJSON loading lifecycle |
| `useLeafletMap` | Initialize Leaflet, switch tiles, and handle resizing |
| `useShelterMapContext` | Subscribe to Context (throw an error outside a Provider) |
| `useShelterTableFilters` | Manage draft filters and debounced updates |
| `useDebouncedValueEffect` | Debounce effects triggered by value changes |

### Data / Types

| Module | Responsibility |
| --- | --- |
| `fetch-shelters` | Fetch, decompress, parse, and cache assets |
| `types/shelter` | Convert GeoJSON to `Shelter` and validate it |
| `types/shelter-type` | Define disaster type keys and Japanese labels |
| `types/shelter-filters` | Define column filter types and filtering logic |
| `types/tile-layer` | Define tile layers and defaults |
| `generated/dataset-meta` | Provide the data update date displayed in the UI |

### Map helpers (`app/lib/map/`)

| Module | Responsibility |
| --- | --- |
| `constants` | Initial view, circle styling, and marker thresholds |
| `viewport-filter` | Filter by bounds |
| `shelter-renderer` | Layer registry and incremental synchronization |
| `shelter-popup` | Popup HTML, including escaping |

### UI Components

| Area | Main components |
| --- | --- |
| layout | `AppShell`, `AppHeader` |
| map | `MapTileLayerControl`, `MapHelpHint`, loading overlay |
| table | `MapTable`, header, rows, column filters |

`routes/home.tsx` is a thin page that assembles the map and table under the Provider.

## Routing and build

- `react-router.config.ts`: `ssr: false`
- Production `basename` / Vite `base` uses the `BASE_PATH` environment variable (defaults to `/`; leave it unset for Workers, which serves at the root)
- Always reference static assets using `publicUrl()` (through `import.meta.env.BASE_URL`)
- Do not use root-absolute paths such as `/favicon.svg`

## Data update pipeline

Runs on the first day of each month at 00:00 UTC (09:00 JST), or manually through `workflow_dispatch`.

```text
GSI GeoJSON
  → fetch with curl + validate JSON
  → gzip compression → public/assets/mergeFromCity_2.geojson.gz
  → generate app/generated/dataset-meta.ts from Last-Modified
  → create-pull-request (branch: automated/update-geojson)
```

Related files:

- [`.github/workflows/shelter-map-update-geojson.yml`](../../../.github/workflows/shelter-map-update-geojson.yml)
- [`scripts/write-dataset-meta.mjs`](../scripts/write-dataset-meta.mjs)

## CI / CD

```text
PR / push to main
  ├─ [repo] Pre-commit (entire repository)
  │    └─ pre-commit run --all-files
  └─ [shelter-map] Test (only for changes under apps/shelter-map/)
       ├─ pnpm run check
       ├─ pnpm run typecheck
       └─ pnpm run test

push to main (only for changes under apps/shelter-map/) / manual run
  └─ [shelter-map] Deploy
       ├─ pnpm run build
       └─ pnpm run deploy (wrangler deploy publishes build/client to Workers)
```

Test and Deploy run independently, as in tsudou. Deploy runs only on pushes to `main` and manual runs, so pull requests (including those from forks) never reach it. The Cloudflare secrets are passed only to the deploy step, not to dependency installation or the build. Navigation to unknown paths returns `index.html` (`not_found_handling: single-page-application`).

## Design considerations

1. **Single source of state** — Share filtered results through Context to keep the map and table consistent
1. **Reduced rendering cost** — Render only the map viewport, use circles at low zoom, and update layers incrementally
1. **Large result sets** — Use virtual scrolling to handle all rows in the table
1. **Simple delivery** — Serve a static SPA and gzip assets on Cloudflare Workers without an API or Worker script
1. **Data safety** — Validate GeoJSON at runtime, skip invalid Features, and fail only when the collection itself is invalid

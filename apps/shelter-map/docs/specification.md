# Specification

Specifications for a web application that displays designated emergency evacuation site data from the Geospatial Information Authority of Japan (GSI) on a map and in a table.

**Demo:** <https://shelter-map.wasabee.dev/>

## Overview

- Client-only SPA with no server API
- Evacuation site GeoJSON is delivered as a static asset, then decompressed and validated in the browser
- The map and table share the same filtering state

## Features

| Feature | Description |
| --- | --- |
| Map | Render evacuation sites within the viewport using Leaflet |
| Table | Display all filtered results with virtual scrolling |
| Filtering | Filter the map and table together by name, address, and disaster type |
| Tile switching | OpenStreetMap / GSI aerial imagery |
| Data loading | Fetch, decompress, and validate gzip-compressed GeoJSON |
| Loading indicator | Show a spinner over the map while loading and an error message on failure |
| Responsive layout | Keep the map and table usable on mobile screens |

## Screen layout

```text
┌──────────────────────────────────────────────────┐
│ Header (title / GitHub link)                      │
├──────────────────────────────────────────────────┤
│ Map (tile switch / hints / loading indicator)     │  flex 5
├──────────────────────────────────────────────────┤
│ Data source / result count                       │
│ Table (column filters / virtual scrolling)       │  flex 4
└──────────────────────────────────────────────────┘
```

- There is a single page route (`/`)
- The overall layout is vertical with `h-svh`, fitting the map and table within the screen
- Loading errors appear in red at the top of the map

### Header

- App name "指定緊急避難場所マップ" (Designated Emergency Evacuation Site Map) and favicon
- External link to the GitHub repository

### Map

- Initial center: approximately the Kanto region (latitude 35.4122, longitude 139.413)
- Initial zoom: 8
- Zoom range: 5–18
- Default tiles: OpenStreetMap

#### Interactions

| Action | Desktop | Mobile |
| --- | --- | --- |
| Zoom | Ctrl/⌘ + mouse wheel | Pinch |
| Pan | Drag | Drag |
| View details | Click | Tap |

The mouse wheel alone does not zoom, preventing interference with page scrolling.

#### Marker rendering

Only evacuation sites within the viewport are rendered.

| Condition | Rendering |
| --- | --- |
| Zoom ≥ 15, or 100 or fewer visible results | Pins (markers) |
| Otherwise | Small circles |

Layers are synchronized incrementally after panning or zooming ends to avoid unnecessary recreation.

#### Popups

Clicking or tapping shows:

- Facility or site name
- Address
- Designation status for each disaster type, styled to distinguish designated and undesignated sites

Strings from the data are HTML-escaped before insertion.

### Table

| Column | Contents |
| --- | --- |
| Name | Facility or site name |
| Address | Address |
| Disaster type × 8 | Designated ✅ / Not designated ❌ |

- Display the filtered result count at the upper right
- Display the source link and data update date (`DATASET_UPDATED_AT`)
- Use TanStack Virtual for virtual scrolling
- Use a minimum width of approximately 58rem with horizontal scrolling

## Filter behavior

The map and table share column filters. Input is applied after a 200ms debounce.

### Text columns (name and address)

- Substring matching (`includes`)
- Trim leading and trailing whitespace before comparison
- Empty strings do not filter that column

### Disaster type columns

Each disaster type accepts one of the following:

| Value | Meaning |
| --- | --- |
| `all` | No filtering (default) |
| `yes` | Only sites designated for this disaster type |
| `no` | Only sites not designated for this disaster type |

Multiple disaster type filters are combined with AND.

## Data model

### Domain type `Shelter`

```ts
interface Shelter {
  id: string; // Common ID
  name: string; // Facility or site name
  address: string; // Address
  type: ShelterType; // Designation status for each disaster type
  latitude: number;
  longitude: number;
}
```

### Disaster types

GeoJSON property names and table labels below retain their original Japanese values.

| Key | GeoJSON property name | Abbreviated table label |
| --- | --- | --- |
| `flood` | 洪水 | 洪水 |
| `landslide` | 崖崩れ、土石流及び地滑り | 崖崩れ |
| `storm_surge` | 高潮 | 高潮 |
| `earthquake` | 地震 | 地震 |
| `tsunami` | 津波 | 津波 |
| `big_fire` | 大規模な火事 | 火事 |
| `flood_within_levee` | 内水氾濫 | 内水氾濫 |
| `volcanic_activity` | 火山現象 | 火山現象 |

In GeoJSON, the string `"1"` indicates designation; all other values indicate no designation.

### Source GeoJSON

- Format: `FeatureCollection` containing Point `Feature` entries
- Repository path: `public/assets/mergeFromCity_2.geojson.gz`
- Source: <https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData/geoJSON/mergeFromCity_2.geojson>
- Source page: <https://www.gsi.go.jp/bousaichiri/hinanbasho.html>

### Validation and conversion rules

1. The root must be a `FeatureCollection` with a `features` array
1. Each Feature must have valid Point coordinates, common ID, name, address, and all disaster type properties
1. Only valid Features are converted to `Shelter` and included
1. Invalid Features are skipped
1. An invalid collection causes a loading error

## Tile layers

| Key | Display name | Provider |
| --- | --- | --- |
| `osm` | OpenStreetMap | OpenStreetMap |
| `gia_photo` | 国土地理院 (写真) (GSI imagery) | GSI seamlessphoto |

Tile URLs:

- `osm`: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- `gia_photo`: `https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg`

## Nonfunctional requirements

| Item | Details |
| --- | --- |
| Runtime | Modern browsers (uses `DecompressionStream`) |
| Delivery | Cloudflare Workers static assets (served at the root of `https://shelter-map.wasabee.dev/`) |
| Data updates | Actions creates a PR on the first day of each month |
| Quality gates | pre-commit, Biome, TypeScript, Vitest |

## Out of scope

The following are currently out of scope:

- User authentication and storage of personal data
- Server-side API / database
- Offline support (Service Workers, etc.)
- Route guidance and distance calculations from the user's current location
- Integrated display of shelter data other than designated emergency evacuation sites

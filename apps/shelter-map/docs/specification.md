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
| Map | Render evacuation sites within the viewport using Leaflet, colored by the selected disaster types |
| Table | Display all filtered results (or only those in the viewport) with virtual scrolling |
| Filtering | Filter the map and table together with a keyword (name or address) and disaster type chips |
| Map and table link | Selecting a row flies the map to the site and opens its popup; opening a popup highlights its row |
| Current location | Fly the map to the user's location using the Geolocation API |
| Directions | Open directions to a site in Google Maps from its popup |
| Tile switching | OpenStreetMap / GSI aerial imagery |
| Data loading | Fetch, decompress, and validate gzip-compressed GeoJSON |
| Loading indicator | Show a spinner over the map while loading and an error message on failure |
| Responsive layout | Wide screens show a card list beside the map, tablets stack the map over the table, and phones switch between them with tabs |

## Screen layout

```text
┌──────────────────────────────────────────────────┐
│ Header (title)                                    │
├──────────────────────────────────────────────────┤
│ Filter bar (keyword / disaster type chips)        │
│ [Map | List] tabs (phones only)                   │
├──────────────────────────────────────────────────┤
│ Map (tile switch / help / current location /      │  flex 5
│      loading indicator)                           │
├──────────────────────────────────────────────────┤
│ Viewport toggle / result count                    │
│ Table (virtual scrolling)                         │  flex 4
└──────────────────────────────────────────────────┘
```

- There is a single page route (`/`)
- The overall layout fits within the screen with `h-svh`
- The layout above applies between the `sm` (40rem) and `lg` (64rem) breakpoints
- From `lg`, the list (cards, 24rem wide) sits left of a full-height map; a handle on the map's left edge collapses and expands the list
- Below `sm`, tabs show either the map or the list; the map stays mounted while hidden
- Loading errors appear in red at the top of the map

### Header

- App name "指定緊急避難場所マップ" (Designated Emergency Evacuation Site Map) and favicon

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

The help panel at the lower left can be collapsed to a "?" button. It is open by default on desktops and closed on phones, and the choice is remembered in `localStorage`.

The tile switch at the upper right is a segmented control (地図 / 写真).

#### Attribution

The attribution control at the lower right credits the tiles and the dataset: "避難場所: 国土地理院 (`DATASET_UPDATED_AT` 時点)", linking to the GSI source page. It stays visible with the map on every layout, is at most 16rem wide (two lines) to stay clear of the map help, and the current location button is a Leaflet control stacked above it.

#### Current location

The button at the lower right reads the position with the Geolocation API (high accuracy, 10-second timeout), draws the position with its accuracy circle, and flies the map there (zoom 15 or more). Denied permission, timeouts, other failures, and browsers without the API show a dismissible message at the top of the map.

#### Marker rendering

Only evacuation sites within the viewport are rendered.

| Condition | Rendering |
| --- | --- |
| Zoom ≥ 15, or 100 or fewer visible results | Pins (markers) |
| Otherwise | Circle markers (half size below zoom 10, three-quarter size below zoom 13) |

Colors follow the selected disaster types:

| Style | Condition | Color |
| --- | --- | --- |
| default | No disaster type is selected | Blue |
| match | A disaster type is selected (only sites designated for every selected type are shown) | The type's color with one type selected, dark slate with several; white outline |

Layers are synchronized incrementally after panning or zooming ends to avoid unnecessary recreation.

#### Popups

Clicking or tapping shows:

- Facility or site name
- Address
- Designation status for each disaster type in two columns, styled to distinguish designated and undesignated sites
- A link that opens directions in Google Maps (`https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`); the starting point is left to Google Maps
- A note to check the latest designations with the municipality (the data is updated monthly)

Strings from the data are HTML-escaped before insertion. The site whose popup is open keeps its layer even when the popup's auto-pan moves it out of the viewport.

### Table

| Column | Contents |
| --- | --- |
| Name | Facility or site name |
| Address | Address |
| Disaster type × 8 | Designated (dot in the type's color) / Not designated (gray dot) |

- Display the result count at the upper right; with "地図の表示範囲のみ" on, show only sites inside the map viewport and the count as "N 件 / 該当 M 件"
- Use TanStack Virtual for virtual scrolling
- Between `sm` and `lg`, use a minimum width of approximately 58rem with horizontal scrolling
- Selecting a row (click, Enter, or Space) flies the map to the site (zoom 16 or more) and opens its popup; on phones it also switches to the map tab
- Map flights (to a selected site or the current location) take a fixed 0.8 seconds regardless of distance, and jump without animation when the OS asks for reduced motion (`prefers-reduced-motion`)
- The row of the site whose popup is open is highlighted and scrolled into view below the sticky header (on phones, when the list tab is opened)
- On phones and beside the map from `lg`, each site is shown as a card (name, address, and designated disaster types) without horizontal scrolling

## Filter behavior

The map and table share the filters in the filter bar above the map.

### Keyword

- Matches the name or the address by substring (`includes`)
- Split by whitespace after trimming; every term must match (AND)
- Applied after a 200ms debounce
- An empty keyword does not filter

### Disaster type chips

- Each chip toggles one disaster type (`aria-pressed`); a selected chip takes the type's color as its outline and tint
- A site matches when it is designated for every selected type (AND)
- Chip changes apply immediately

"条件をクリア" (shown while a keyword or a type is set) clears the keyword and the types, and keeps "地図の表示範囲のみ".

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

| Key | GeoJSON property name | Abbreviated table label | Color |
| --- | --- | --- | --- |
| `flood` | 洪水 | 洪水 | `#2a78d6` blue |
| `landslide` | 崖崩れ、土石流及び地滑り | 崖崩れ | `#008300` green |
| `storm_surge` | 高潮 | 高潮 | `#4a3aa7` violet |
| `earthquake` | 地震 | 地震 | `#eb6834` orange |
| `tsunami` | 津波 | 津波 | `#1baf7a` aqua |
| `big_fire` | 大規模な火事 | 火事 | `#e34948` red |
| `flood_within_levee` | 内水氾濫 | 内水氾濫 | `#e87ba4` magenta |
| `volcanic_activity` | 火山現象 | 火山現象 | `#eda100` yellow |

The colors are a validated 8-hue categorical palette. They appear as dots beside the labels (chips, table header and cells, cards, popups) and as the fill of matching markers; labels always stay in the text color because several hues are below 3:1 contrast on white.

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
| `osm` | 地図 (OpenStreetMap) | OpenStreetMap |
| `gia_photo` | 写真 (国土地理院, GSI imagery) | GSI seamlessphoto |

Tile URLs:

- `osm`: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- `gia_photo`: `https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg`

## Nonfunctional requirements

| Item | Details |
| --- | --- |
| Runtime | Modern browsers (uses `DecompressionStream`) |
| Delivery | Cloudflare Workers static assets (served at the root of `https://shelter-map.wasabee.dev/`) |
| Data updates | Actions creates a PR on the first day of each month |
| Quality gates | pre-commit, Biome, TypeScript, Vitest, Playwright |

## Out of scope

The following are currently out of scope:

- User authentication and storage of personal data
- Server-side API / database
- Offline support (Service Workers, etc.)
- Route guidance and distance calculations in the app (directions are delegated to Google Maps)
- Integrated display of shelter data other than designated emergency evacuation sites

# Designated Emergency Evacuation Site Map

A web application for browsing designated emergency evacuation site data from the Geospatial Information Authority of Japan (GSI) on a map and in a table.

**Demo:** <https://shelter-map.wasabee.dev/>

## Features

- Render evacuation sites within the current viewport on an interactive map
- Display all evacuation sites in a table with virtual scrolling
- Filter the map and table by name, address, and disaster type (flood, earthquake, tsunami, etc.)
- Switch between OpenStreetMap and GSI aerial imagery
- Load data efficiently using gzip-compressed GeoJSON
- Show a spinner over the map while evacuation site data is loading
- Use the map and table on mobile screens with a responsive layout

## Technology stack

- [React](https://react.dev/) 19 and [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/) 8 (SPA, client-side rendering)
- [Vite](https://vite.dev/) 8
- [Leaflet](https://leafletjs.com/) — map rendering
- [TanStack Virtual](https://tanstack.com/virtual) — virtual scrolling for the table
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Biome](https://biomejs.dev/) — linting and formatting
- [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) — testing
- [pre-commit](https://pre-commit.com/) — Git hooks and lint tools (Biome, actionlint, shellcheck, markdownlint, gitleaks, etc.)

## Prerequisites

- [mise](https://mise.jdx.dev/) (version management for Node.js, pnpm, and pre-commit)
- Node.js (specified in [`mise.toml`](../../mise.toml) at the repository root and `engines.node` in `package.json`)
- pnpm (dependencies are managed in a repository-wide pnpm workspace)
- A Cloudflare account for deployment (sign in with `pnpm exec wrangler login`)

## Setup

```bash
git clone https://github.com/iwstkhr/apps.git
cd apps
mise install
pre-commit install
pnpm install
cd apps/shelter-map
pnpm run dev
```

The development server starts at <http://localhost:5173>.

### Scripts

| Command | Description |
| --- | --- |
| `pnpm run dev` | Start the development server |
| `pnpm run build` | Create a production build |
| `pnpm run start` | Serve the production build locally |
| `pnpm run preview` | Create a production build and serve it locally with `wrangler dev` using the Workers configuration |
| `pnpm run deploy` | Deploy `build/client` to Cloudflare Workers (run `pnpm run build` first) |
| `pnpm run lint` | Run Biome linting |
| `pnpm run format` | Format code with Biome |
| `pnpm run format:check` | Check for formatting differences |
| `pnpm run check` | Check linting and formatting with Biome |
| `pnpm run check:fix` | Apply Biome lint fixes, formatting, and import organization |
| `pnpm run typecheck` | Run TypeScript type checking |
| `pnpm run test` | Run tests with Vitest |
| `pnpm run test:watch` | Run Vitest in watch mode |
| `pre-commit run --all-files` | Run pre-commit hooks on all files (from the repository root) |

## Documentation

See [`docs/`](docs/README.md) for detailed specifications and architecture.

| Document | Contents |
| --- | --- |
| [Specification](docs/specification.md) | Features, screens, data model, filters, and map behavior |
| [Architecture](docs/architecture.md) | Structure, data flow, module responsibilities, and CI/CD |

## Data source

Evacuation site data is based on [GSI designated emergency evacuation sites](https://www.gsi.go.jp/bousaichiri/hinanbasho.html). See the [specification](docs/specification.md) and [architecture](docs/architecture.md) for data formats, validation rules, and the update workflow.

- Data in the repository: `public/assets/mergeFromCity_2.geojson.gz`
- Data update date displayed in the app: `app/generated/dataset-meta.ts`
- Source URL: <https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData/geoJSON/mergeFromCity_2.geojson>

## CI / Deployment

When files under `apps/shelter-map/` change in a PR or a push to `main`, [\[shelter-map\] Check](../../.github/workflows/shelter-map-check.yml) runs. After Check succeeds on `main`, [\[shelter-map\] Deploy](../../.github/workflows/shelter-map-deploy.yml) publishes to [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/). Delivery is configured in [`wrangler.jsonc`](wrangler.jsonc), and deployment uses the GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. See [Architecture](docs/architecture.md#ci--cd) for details.

Workers serves the app at the domain root, so leave `BASE_PATH` unset. Set it at build time only when serving under a subpath:

```bash
BASE_PATH=/sub-path/ pnpm run build
```

Reference static assets under `public/` through `publicUrl()` (`app/lib/public-url.ts`). Do not use root-absolute paths such as `/favicon.svg`.

## Contributing

### Git hooks

Run `pre-commit install` after `mise install` to enable the hooks in [`.pre-commit-config.yaml`](../../.pre-commit-config.yaml) at the repository root when committing.

To run them manually on all files (from the repository root):

```bash
pre-commit run --all-files
```

To run the same checks as CI (run `pre-commit` from the repository root and `pnpm` from `apps/shelter-map/`):

```bash
pre-commit run --all-files
pnpm run check
pnpm run typecheck
pnpm run test
```

### Commit messages

This repository follows [Conventional Commits](https://www.conventionalcommits.org/).

```text
<type>[optional scope]: <description>
```

- Write the **description** in English using the imperative, starting with a lowercase letter and omitting the final period
- Choose a **type** that matches the change (`feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`)
- Add a **scope** when appropriate (`map`, `table`, `data`, `deploy`, etc.)

Examples:

```text
feat(table): add spreadsheet-style column filters
fix(map): require modifier key for map scroll zoom
chore(data): update shelter GeoJSON data
docs: document project setup in readme
```

## License

The source code of this project is released under the [MIT License](LICENSE).

Evacuation site data is provided by GSI. See the [GSI terms of use](https://www.gsi.go.jp/kikakuchousei/kikakuchousei41042.html) for conditions on using the data.

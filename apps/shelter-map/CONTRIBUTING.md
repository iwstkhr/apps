# Contributing

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Type

| Type | Purpose |
| --- | --- |
| `feat` | Add a feature visible to users |
| `fix` | Fix a bug |
| `refactor` | Reorganize code or replace a library without changing behavior |
| `perf` | Improve performance |
| `test` | Add or update tests only |
| `docs` | Documentation only |
| `build` | Build configuration or dependencies (Vite, wrangler, Biome, pnpm packages, etc.) |
| `ci` | CI configuration (`.github/workflows/`, etc.) |
| `chore` | Maintenance that does not fit any category above |
| `style` | Formatting only, without changing behavior or meaning |

### Scope (optional)

Include a scope when the affected area is clear. Examples: `map` (Leaflet map and layers), `table` (table and column filters), `data` (GeoJSON data and its validation), and `deploy` (Cloudflare Workers delivery settings).

```text
feat(table): add spreadsheet-style column filters
fix(map): require modifier key for map scroll zoom
chore(data): update shelter GeoJSON data
```

### Body

The diff shows **what changed**, so explain **why**.
Record the reasoning when you reject an alternative or choose an implementation that may seem indirect.

### Language and style

Write commit subjects, bodies, PR descriptions, and documentation in English.
Use the imperative present tense (`add`, `fix`, `remove`) in the subject, start with a lowercase letter, and omit the final period. Aim for no more than 72 characters.

Code comments may remain in Japanese. Preserve actual Japanese UI labels when quoting them in documentation.

## Implementation conventions

- Name source files in kebab-case (`app-header.tsx`, `use-shelter-map.ts`), including components and hooks.
  Biome's `useFilenamingConvention` rule enforces this in `pnpm run check`.
- Reference static assets under `public/` through `publicUrl()` (`app/lib/public-url.ts`).
  Do not use root-absolute paths such as `/favicon.svg`, which break when the app is built with `BASE_PATH`.
- Do not edit `app/generated/dataset-meta.ts` by hand; `scripts/write-dataset-meta.mjs` generates it.

## Development

See [README.md](README.md) for setup, scripts, and deployment.

### Git hooks

Run `pre-commit install` after `mise install` to enable the hooks in [`.pre-commit-config.yaml`](../../.pre-commit-config.yaml) at the repository root when committing.

To run them manually on all files (from the repository root):

```bash
pre-commit run --all-files
```

### Checks

To run the same checks as CI (run `pre-commit` from the repository root and `pnpm` from `apps/shelter-map/`):

```bash
pre-commit run --all-files
pnpm run check
pnpm run typecheck
pnpm run test
pnpm run test:e2e
```

`pnpm run test:e2e` builds the app and serves `build/client/` with `wrangler dev` at `http://localhost:8789`, as in production, then drives it with the installed Google Chrome (no browser download is needed). Map tiles are stubbed, and most scenarios replace the GeoJSON with a small fixture in `e2e/fixtures.ts`; one scenario loads the real dataset. Set `E2E_SKIP_BUILD=1` to reuse an existing `build/client/`.

GitHub Actions runs the following on pull requests and pushes to `main` (workflows live at the monorepo root; `shelter-map-test.yml` runs only when files under `apps/shelter-map/` change):

| Workflow | Checks |
| --- | --- |
| `.github/workflows/shelter-map-test.yml` | Type checking (`pnpm run typecheck`), unit tests (`pnpm run test`), and E2E tests (`pnpm run test:e2e`) |
| `.github/workflows/pre-commit.yml` | pre-commit hooks (Biome, markdownlint, actionlint, gitleaks, etc.) |

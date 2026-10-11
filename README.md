# apps

A monorepo for personal app projects. Each app lives under `apps/`, and the entire repository is managed as a single pnpm workspace.

| Directory | Contents |
| :-- | :-- |
| [`apps/shelter-map/`](apps/shelter-map/) | Designated emergency evacuation site map (React Router, Cloudflare Workers) |
| [`apps/tsudou/`](apps/tsudou/) | Tsudou scheduling app (React, Express, Cloudflare Workers + D1) |
| [`apps/todo/`](apps/todo/) | Local-only TODO manager with JSON export and import (React Router, IndexedDB, Cloudflare Workers) |

## Setup

Tool versions are pinned in [`mise.toml`](mise.toml) at the repository root.

```sh
mise install
pre-commit install
pnpm install
```

Dependencies are managed with a single `pnpm-lock.yaml` at the repository root. Run `pnpm install` to install dependencies for all apps together.
Run app-specific scripts from each app's directory. See the README in each directory for details.

To run checks across all apps, use the following commands at the repository root:

```sh
pnpm run typecheck
pnpm test
```

Build and deployment procedures differ between apps, so run those commands from each app's directory.

## Shared configuration

These files live at the repository root and are shared by all apps.

| File | Contents |
| :-- | :-- |
| `package.json` | Scripts that run across all apps and the pnpm version (`packageManager`) |
| `pnpm-workspace.yaml` | Workspace packages and dependencies allowed to run installation scripts |
| `pnpm-lock.yaml` | Shared lockfile for all apps |
| `.pre-commit-config.yaml` | pre-commit hooks |
| `.markdownlint-cli2.yaml` | markdownlint-cli2 configuration |
| `biome.json` | Root Biome configuration (each app's `biome.json` is a nested configuration with `"root": false`) |
| `mise.toml` | Node.js, pnpm, and pre-commit versions |
| `renovate.json` | Renovate configuration |
| `.github/workflows/` | CI / CD (filenames are prefixed with the app name; `pre-commit.yml` covers the entire repository) |

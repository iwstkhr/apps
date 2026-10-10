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

Include a scope when the affected area is clear. Examples: `list` (todo list and items), `filter` (filters and sorting), `storage` (IndexedDB), `data` (export and import), and `deploy` (Cloudflare Workers delivery settings).

```text
feat(filter): add a tag filter
fix(storage): reload todos when another tab changes them
feat(data): merge imported todos by update time
```

### Body

The diff shows **what changed**, so explain **why**.
Record the reasoning when you reject an alternative or choose an implementation that may seem indirect.

### Language and style

Write commit subjects, bodies, PR descriptions, and documentation in English.
Use the imperative present tense (`add`, `fix`, `remove`) in the subject, start with a lowercase letter, and omit the final period. Aim for no more than 72 characters.

Code comments may remain in Japanese. Preserve actual Japanese UI labels when quoting them in documentation.

## Implementation conventions

- Name source files in kebab-case (`app-header.tsx`, `use-todos.ts`), including components and hooks.
  Biome's `useFilenamingConvention` rule enforces this in `pnpm run check`.
- Reference static assets under `public/` through `publicUrl()` (`app/lib/public-url.ts`).
  Do not use root-absolute paths such as `/favicon.svg`.
- Keep old data readable when changing the `Todo` shape (`app/types/todo.ts`).
  Fill new fields with defaults in `toTodo()`, and bump `EXPORT_VERSION` (`app/lib/export-import.ts`) or `DB_VERSION` (`app/lib/todo-db.ts`) with a migration only when old data cannot be read as is.

## Development

See [README.md](README.md) for setup, scripts, and deployment.

### Git hooks

Run `pre-commit install` after `mise install` to enable the hooks in [`.pre-commit-config.yaml`](../../.pre-commit-config.yaml) at the repository root when committing.

To run them manually on all files (from the repository root):

```bash
pre-commit run --all-files
```

### Checks

To run the same checks as CI (run `pre-commit` from the repository root and `pnpm` from `apps/todo/`):

```bash
pre-commit run --all-files
pnpm run check
pnpm run typecheck
pnpm run test
pnpm run test:e2e
```

`pnpm run test:e2e` builds the app and serves `build/client/` with `wrangler dev` at `http://localhost:8790`, as in production, then drives it with the installed Google Chrome (no browser download is needed). Each test starts with an empty IndexedDB in a new browser context. Set `E2E_SKIP_BUILD=1` to reuse an existing `build/client/`.

GitHub Actions runs the following on pull requests and pushes to `main` (workflows live at the monorepo root; `todo-test.yml` runs only when files under `apps/todo/` change):

| Workflow | Checks |
| --- | --- |
| `.github/workflows/todo-test.yml` | Type checking (`pnpm run typecheck`), unit tests (`pnpm run test`), and E2E tests (`pnpm run test:e2e`) |
| `.github/workflows/pre-commit.yml` | pre-commit hooks (Biome, markdownlint, actionlint, gitleaks, etc.) |

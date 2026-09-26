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
| `build` | Build configuration or dependencies (Vite, wrangler, pnpm packages, etc.) |
| `ci` | CI configuration (`.github/workflows/`, etc.) |
| `chore` | Maintenance that does not fit any category above |
| `style` | Formatting only, without changing behavior or meaning |

### Scope (optional)

Include a scope when the affected area is clear. Examples: `data` (D1 tables, migrations, data formats), `api` (Express API server and HTTP routes), `infra` (Worker configuration in `backend/wrangler.jsonc`), `ui` (pages and components), and `hosting` (Cloudflare Workers delivery settings).

```text
feat(data): add a maximum number of participants to an event
fix(ui): prevent answering after the event has been closed
```

### Breaking changes

Add `!` after the type and include a `BREAKING CHANGE:` footer.
In this project, this covers **changes that break HTTP API compatibility** (removing routes or fields, making fields required, changing stored record formats, etc.) and **changes that invalidate URLs already issued**.

```text
feat(data)!: require an end time on date candidates

BREAKING CHANGE: existing Event records have no endAt, so a backfill is
required before deploying.
```

### Body

The diff shows **what changed**, so explain **why**.
Record the reasoning when you reject an alternative or choose an implementation that may seem indirect.

### Language and style

Write commit subjects, bodies, PR descriptions, documentation, and Claude skills in English.
Use the imperative present tense (`add`, `fix`, `remove`) in the subject, start with a lowercase letter, and omit the final period. Aim for no more than 72 characters.

Code comments may remain in Japanese. Preserve actual Japanese UI labels when quoting them in documentation or skills.

## Implementation conventions

- Define input limits only in `shared/src/limits.ts`.
  Both server validation (`validate.ts`) and frontend validation (`frontend/src/lib/formValidators.ts`) reference this file.
- **Client validation improves the user experience; it is not an authorization or validation boundary.**
  Whenever you add an input field, also validate it on the server (`validate.ts`).
- Do not add `.authorization()` to the `Event` / `Answer` models.
  The schema-level default (`allow.resource(eventApi)`) applies; individual model authorization would allow clients to perform CRUD directly.
- When changing API routes or input/output, update `backend/src/schemas.ts` and `backend/src/openapi.ts`, regenerate `docs/openapi.yaml` with `pnpm run openapi`, and include it in the commit. Otherwise, `pnpm test` fails.
- Use `a.customType` (`EventView` / `AnswerView`) for public API responses instead of returning models directly, to avoid exposing token hashes.

## Development

See [README.md](README.md) for setup, local development, and deployment.

```bash
pnpm run typecheck   # Type checking
pnpm run lint        # Lint and formatting checks (Biome)
pnpm run lint:fix    # Apply Biome fixes
pnpm test            # Unit tests
pnpm run build       # Production build
```

GitHub Actions runs the following on pull requests and pushes to `main`:

| Workflow | Checks |
| --- | --- |
| `.github/workflows/test.yml` | Type checking (`pnpm run typecheck`) and unit tests (`pnpm test`) |
| `.github/workflows/pre-commit.yml` | pre-commit hooks (Biome, markdownlint, actionlint, gitleaks, etc.) |

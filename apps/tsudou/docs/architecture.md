# Architecture

The technical structure of Tsudou and the reasoning behind it.
See the [Specification](specification.md) for UI and API behavior.

## Overview

Tsudou is a serverless SPA without sign-in.
A single Cloudflare Worker (`tsudou`) serves the UI and API.
The UI is delivered as Worker static assets (`frontend/dist/`), bypassing the Worker script.
Only `/api/*` reaches the script, which runs a standard Express.js HTTP server.
The `node:http` compatibility provided by `nodejs_compat`, together with `httpServerHandler` from `cloudflare:node`, converts Worker `fetch` calls into Express requests. Data is stored in D1 (SQLite).
Configuration lives in `backend/wrangler.jsonc`.

```text
  Browser
  +-------------------------+
  | React SPA               |
  | Memory: tokens          |
  | Saved preferences       |
  +----------+--------------+
             | HTTPS (same origin; API has no authentication, with rate limiting)
             v
  +--------------------------------------------------------------------------+
  | Cloudflare Worker "tsudou"                                                |
  |                                                                          |
  |  Non-/api/* -> Static assets (frontend/dist/)                              |
  |                Unknown paths return index.html for SPA routing            |
  |                Response headers applied through _headers                  |
  |                                                                          |
  |  /api/*     -> httpServerHandler -> Express (Worker internal port :8080)   |
  |                Rate limiting / input validation / token checks /          |
  |                business logic; only seven operation routes exposed        |
  |                                                                          |
  |  scheduled (daily Cron Trigger) -> Expiry cleanup                          |
  +----------+---------------------------------------------------------------+
             | D1 binding (env.DB)
             v
  +--------------------------------------------------+
  | D1 "tsudou" (SQLite)                              |
  |   events  : INDEX expires_at                      |
  |   answers : FK event_id ON DELETE CASCADE,         |
  |             UNIQUE (event_id, name)               |
  +--------------------------------------------------+
```

**The browser has no direct access to the `events` / `answers` tables.**
Only the API server can access D1 through Worker bindings, and Express defines only seven operation routes.
Authorization (token checks) and input validation always run on the server.

## Technology stack

| Layer | Technology |
| --- | --- |
| UI | React 19 / React Router 8 (`createBrowserRouter`) |
| Forms | TanStack Form (`@tanstack/react-form`) |
| Server state | TanStack Query (`@tanstack/react-query`) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Build | Vite 8 / TypeScript (composite builds with project references) |
| API | REST-style routes under `/api` on the UI origin; no authentication, with Workers Rate Limiting for abuse prevention |
| API server | Express 5 |
| Runtime | Cloudflare Workers (`nodejs_compat`, `httpServerHandler` from `cloudflare:node`); local development uses `wrangler dev` |
| Persistence | Cloudflare D1 (SQLite; migrations through `wrangler d1 migrations`) |
| Scheduling | Workers Cron Trigger (expiry cleanup) |
| Configuration | `backend/wrangler.jsonc` (static assets, D1, Rate Limiting, Cron Trigger) |
| Hosting | One Cloudflare Worker for UI and API on the custom domain `tsudou.wasabee.dev`, deployed with wrangler through GitHub Actions |
| Quality | Vitest / Testing Library / Playwright / Biome / pre-commit |

## Repository structure

Tsudou has four packages in the monorepo pnpm workspace (`pnpm-workspace.yaml` at the repository root): `frontend/` (`@tsudou/frontend`), `backend/` (`@tsudou/backend`), shared code in `shared/` (`@tsudou/shared`), and E2E tests in `e2e/` (`@tsudou/e2e`).
Each package has its own dependencies and scripts in `package.json`. `apps/tsudou/package.json` contains Biome and shortcuts that invoke package scripts (`pnpm run dev` / `pnpm run dev:api` / `pnpm test`, etc.).

Both frontend and backend depend on `@tsudou/shared` through `workspace:*`, importing modules such as `@tsudou/shared/limits`.
The frontend does not depend on the backend package and cannot import server internals (see "Code shared by server and frontend").

```text
backend/                        Backend (@tsudou/backend)
├─ package.json                 Dependencies and scripts
├─ wrangler.jsonc               Worker settings (static assets / D1 / Rate Limiting / Cron Trigger)
├─ migrations/                  D1 migrations (0001_init.sql ...)
├─ vitest.config.ts             Backend test configuration (node environment)
├─ scripts/openapi.ts           Generate docs/openapi.yaml (pnpm run openapi)
└─ src/
   ├─ worker.ts                 Worker entry (Express listen / httpServerHandler / Cron)
   ├─ app.ts                    Express app (/api routes / error handling / rate limiting)
   ├─ schemas.ts                API input/output shapes (Zod schemas)
   ├─ openapi.ts                Generate OpenAPI documentation from schemas and routes
   ├─ operations.ts             Business logic (injected Repository)
   ├─ repository.ts             Data access boundary (interface)
   ├─ d1Repository.ts           Production implementation (D1) and expiry cleanup
   ├─ memoryRepository.ts       In-memory implementation for tests
   ├─ tokens.ts                 ID/token generation, hashing, constant-time comparison
   ├─ validate.ts               Input validation and normalization
   ├─ retention.ts              Expiry calculation and checks
   └─ errors.ts                 AppError (code + description) and error-to-status mapping

shared/                         Shared code (@tsudou/shared)
├─ package.json                 Exposes limits / messages / types through exports
├─ tsconfig.json                No DOM or Node types
└─ src/
   ├─ limits.ts                 Input limits and retention period
   ├─ messages.ts               Validation messages
   └─ types.ts                  Domain types

frontend/                       Frontend (@tsudou/frontend)
├─ package.json                 Dependencies and scripts
├─ index.html                   Entry HTML
├─ vite.config.ts               Vite and frontend tests (development /api proxy, sw.js generation)
├─ public/manifest.webmanifest  PWA manifest
├─ scripts/capture-guide.mjs    Capture guide screenshots
└─ src/
   ├─ main.tsx / router.tsx     Entry and route definitions
   ├─ sw.js                     Service Worker source (built as dist/sw.js)
   ├─ routes/                   Screens (Root / Home / Guide / EventCreated / EventPublic /
   │                            EventManage / NotFound)
   ├─ assets/guide/             Guide screenshots (ja/ and en/) and their sizes (sizes.json)
   ├─ components/               UI components and ui/ primitives
   └─ lib/                      api, queryClient, errors, storage, urls, format,
                                formValidators, tally, and hooks

e2e/                            E2E tests (@tsudou/e2e)
├─ playwright.config.ts         ja / en projects and server startup
├─ fixtures.ts                  Language-aware text lookup and helpers
├─ scripts/serve.mjs            Build, fresh local D1, wrangler dev --env e2e
└─ tests/                       Host, participant, and closing scenarios
```

## Backend

### Authorization model

There is no authentication. Permission separation is enforced structurally through three boundaries:

- Only the API Worker, with its `env.DB` binding, can access D1.
- Express defines only the seven operation routes below, with no routes for enumerating events or responses.
  The Worker forwards `/api/*` to Express (`run_worker_first`); Express returns 404 for undefined paths.
- Editing routes always perform server-side token checks. Tokens arrive in dedicated headers.

| Route | Operation | Token |
| --- | --- | --- |
| `POST /api/events` | Create event | – |
| `GET /api/events/{eventId}` | Get event, including responses | – |
| `PATCH /api/events/{eventId}` | Update event / close responses | `X-Manage-Token` |
| `DELETE /api/events/{eventId}` | Delete event | `X-Manage-Token` |
| `POST /api/events/{eventId}/answers` | Create response | – |
| `PUT /api/answers/{answerId}` | Update response | `X-Edit-Token` |
| `DELETE /api/answers/{answerId}` | Delete response | `X-Edit-Token` or `X-Manage-Token` |

Headers keep tokens out of access logs and browser history associated with paths and query strings.

The public, unauthenticated API uses the following abuse controls:

- Rate limiting per client IP (`CF-Connecting-IP`): 100 requests per 60 seconds, configured through `ratelimits` in `wrangler.jsonc`.
  Exceeding the limit returns `429 RATE_LIMITED`. Workers Rate Limiting is eventually consistent per location, so this is an abuse threshold rather than an exact global cap.
- The API shares the UI origin and enables no CORS for other origins (no CORS headers are returned).
  Browser calls from pages on other sites are blocked, but non-browser calls are not; rate limiting is the primary abuse control.

### Why response types are separate

Stored record types (`EventRecord` / `AnswerRecord`) are separate from public types (`EventView` / `AnswerView`).
`manageTokenHash` / `editTokenHash` **do not exist as public type fields**, preventing accidental exposure through implementation mistakes.
`toEventView` / `toAnswerView` in `operations.ts` are the only mapping points; types enforce the boundary.

### API server layers

```text
worker.ts       Entry: Express listens on internal Worker port 8080.
                httpServerHandler converts fetch calls into requests to that port
                without opening a real socket. D1 and rate limiting bindings come
                from cloudflare:workers env and are injected into createApp.
   ↓
app.ts          Express app: after rate limiting, routes under /api map path
                parameters, headers, and bodies to operations arguments.
                The error handler converts AppError to a response with a status.
                Unexpected exceptions alone are logged (Workers Logs) and mapped
                to INTERNAL. Body shapes are validated with Zod schemas from
                schemas.ts; value validation (lengths and ranges) is delegated
                to validate.ts.
   ↓
operations.ts   Business logic: receives Repository and never accesses D1 directly.
   ↓
repository.ts   Data access boundary (interface).
   ├─ d1Repository.ts      Production: D1
   └─ memoryRepository.ts  Tests: in-memory
```

### OpenAPI documentation

`docs/openapi.yaml` is generated from Zod schemas in `schemas.ts` and route definitions in `openapi.ts` using `@asteasolutions/zod-to-openapi` (`pnpm run openapi`).
Request schemas also perform actual validation, keeping documented input shapes aligned with the implementation.
Response schemas cause type errors if they differ from `shared/src/types.ts`.
`openapi.test.ts` verifies that generated documentation is current.

- Length and range limits are documentation metadata rather than Zod validation, since lengths are counted after trimming. Actual value validation remains in `validate.ts`.
- Metadata uses Zod's standard `.meta()`, rather than zod-to-openapi's `.openapi()`. zod-to-openapi is loaded only for documentation generation and does not enter the Worker bundle.

`app.ts` does not depend on Workers (bindings are injected as functions), so supertest can test it directly on Node.js.
`operations.ts` depends only on the `Repository` interface, allowing creation → response → editing → deletion tests without a database (`operations.test.ts`; HTTP input/output is covered by `app.test.ts`).

### Data model

Schemas live in `backend/migrations/` and are applied with `wrangler d1 migrations apply`.
Columns use snake_case; `d1Repository.ts` maps them to camelCase record types.
`d1Repository.ts` writes `created_at` / `updated_at` as ISO 8601 strings.
D1 is a separate resource from the Worker, so deleting the Worker preserves data.
D1 Time Travel can restore an earlier state after accidental deletion or corruption.

The `events` table:

| Column | Type | Description |
| --- | --- | --- |
| `id` | TEXT (PK) | 128-bit random value in base64url (22 characters), included in the shared URL |
| `title` | TEXT | Event title |
| `fee` | INTEGER? | Fee in yen; `NULL` means unset, `0` means free |
| `memo` | TEXT? | Free text |
| `candidates` | TEXT (JSON) | `Candidate[]` (`{ id, startAt }`), sorted by start time |
| `closed` | INTEGER | Responses closed flag (0 / 1) |
| `manage_token_hash` | TEXT | SHA-256 management token hash (hex) |
| `expires_at` | INTEGER | Expiry in epoch seconds, indexed for cleanup |

The `answers` table:

| Column | Type | Description |
| --- | --- | --- |
| `id` | TEXT (PK) | `crypto.randomUUID()` |
| `event_id` | TEXT (FK) | Parent event; `ON DELETE CASCADE` deletes the response with it |
| `name` | TEXT | Respondent name, unique within the event through `UNIQUE (event_id, name)` |
| `message` | TEXT? | Optional message |
| `choices` | TEXT (JSON) | `Choice[]` (`{ candidateId, status }`), one per candidate |
| `edit_token_hash` | TEXT | SHA-256 response edit key hash (hex) |
| `expires_at` | INTEGER | Inherited directly from the parent event |

Candidates and choices are embedded in JSON columns because they are always read and written with their event or response.
Events are expected to have at most a few dozen responses, so sorting and aggregation run in the API server and browser.
The composite `UNIQUE (event_id, name)` index also supports fetching an event's responses.

`operations.ts` checks for duplicate names before writing and returns `DUPLICATE_NAME`. Concurrent submissions can both pass that check; the `UNIQUE` constraint rejects the later write, and `d1Repository.ts` converts the failure to `DUPLICATE_NAME`.

### Tokens and authorization

- Event IDs are 128-bit random values; management tokens and response edit keys are 256-bit random values (`randomBytes` from `node:crypto`).
- Tokens are **never stored in plaintext**. Only SHA-256 hashes are stored; plaintext is returned once at issuance.
- Comparisons use `crypto.timingSafeEqual`. Fixed-length hashes are always compared to avoid early returns based on differing lengths.
- Management tokens are passed in URL fragments (`#k=...`) rather than query strings. Fragments are not sent to the server and do not enter access logs or Referer headers.

### Error handling

The API server throws `AppError` (code and human-readable description). The error handler in `app.ts` converts it to an HTTP status and `{ "error": { "code", "message" } }` body.

| Code | Status |
| --- | --- |
| `VALIDATION` | 400 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CLOSED` / `DUPLICATE_NAME` | 409 |
| `RATE_LIMITED` | 429 |
| `INTERNAL` | 500 |

The frontend's `parseApiError` (`frontend/src/lib/errors.ts`) extracts the code and display message.
Unknown codes, such as Cloudflare errors, become `INTERNAL`.

## Frontend

### State management

Server data lives in a single app-wide TanStack Query cache (`frontend/src/lib/queryClient.ts`). There is no other global state store; state is placed according to its purpose.

| State | Location |
| --- | --- |
| Server event, including responses | TanStack Query cache (`useEvent`, key `['event', eventId]`) |
| Form drafts | TanStack Form, owned by each form component |
| Pending operations and errors | `useAsyncAction` (internally TanStack Query's `useMutation`) |
| Temporary feedback, such as saved confirmations | `useFlash` |
| Management tokens / response edit keys | Memory only (`frontend/src/lib/keyring.ts`), loaded from URL fragments |
| Display language | External store (`lib/i18n.ts`), `localStorage` (`tsudou:language`), and `useSyncExternalStore`; translation catalog in `lib/translations.ts` |
| Theme preference | `localStorage` and `<html data-theme>` (`frontend/src/lib/theme.ts`) |

Initial values are not synchronized with `useEffect`.
`eventFormToInput` in `lib/eventForm.ts` converts validated form values into the common creation/edit payload, including whitespace normalization, optional fields, fees, and candidate IDs.

When the target changes (another event or a change in whether the current user has a response), the caller changes the form's `key` to recreate it.

`useEvent` fetches events with `useQuery`. Query handles stale responses after `eventId` changes and **refetching when window focus returns** (`refetchOnWindowFocus`).
Hosts can leave the management page open and see new responses when returning to the tab.
Public and management pages share a query key, displaying cached data immediately and refetching in the background when navigating between them.

- After a save, `replace` (`setQueryData`) stores the server response directly, avoiding another round trip.
  Operations whose response does not include event responses (response creation/update/deletion) use `reload` (`invalidateQueries`) to refetch.
- Event deletion uses `forget` (`removeQueries`) to remove cached data, preventing old content from appearing on back navigation.
- If data has already been fetched, a background refetch failure keeps it visible instead of showing an error screen.
- Fetches retry once only for network failures and unexpected server errors (`NETWORK` / `INTERNAL`).
  Rate limiting and similar errors appear immediately because repeating the request will not resolve them.
- The cache holds only `EventView`, never management tokens or response edit keys; those remain exclusively in `keyring.ts` memory.

`usePublicEvent` and `useManagedEvent` compose fetching, mutations, keys, and cache updates for the public and management screens.
`useEventKeys` imports keys from URL fragments into memory and immediately removes the fragments.
Routes render the resulting state and delegate operations to these hooks.

`useAsyncAction` uses one mutation that runs the supplied operation, rather than separate mutations per action, so saving, closing, and deleting on one page share a pending flag and errors.
Event creation (`Home`) has only one operation and passes `createEvent` directly to `useMutation`.

### API calls

`request` in `frontend/src/lib/api.ts` wraps `fetch`, returning JSON on success and throwing `ApiError` on failure.
Communication failures become `NETWORK`; 404 from `GET /api/events/{eventId}` returns `null`.
Casts from responses to application types are confined to this function, while return type annotations enforce the boundary.

Since the API is under `/api` on the UI origin, `api.ts` uses relative paths such as `/api/events`.
No API URL is needed at build time. During local development, Vite proxies `/api` to `wrangler dev` at `localhost:8080` (`server.proxy` in `frontend/vite.config.ts`).

### Token handling

To support shared computers, management tokens and response edit keys are not persisted in browser storage.
`keyring.ts` holds them in a module-level `Map` and exposes them through `useSyncExternalStore`.
They survive app navigation but disappear on reload or tab closure.
Management URLs (`#k=...`) and response edit URLs (`#a=...&k=...`) carry them between sessions.

At startup, `purgeLegacyTokens` in `storage.ts` removes tokens previously stored in `localStorage` (`tsudou:hosted` / `tsudou:answered`).
Because `localStorage` can throw in situations such as private browsing, failures are caught and ignored.

### Theme

The `@custom-variant` in `index.css` makes Tailwind's `dark:` depend on `<html data-theme="dark">`, rather than directly on OS settings.
`useTheme` in `theme.ts` determines `data-theme` from the saved choice (`tsudou:theme`) and `prefers-color-scheme`.
An inline script in `index.html` performs the same check before React renders, preventing a flash of the light theme. Update both locations when changing keys or values.
Both locations also update `<meta name="theme-color">`, which controls browser UI colors (address bar or installed app title bar), to match the header background (`THEME_COLORS`).

### Display language

`LanguageSelect` in the header switches between Japanese (`ja`) and English (`en`). `lib/i18n.ts` persists the choice, notifies mounted components through `useSyncExternalStore`, and handles cross-tab storage events. Without a valid saved choice, it selects the first Japanese or English entry in `navigator.languages`, falling back to `navigator.language` when the list is empty and English when no entry matches. Storage read failures also use browser detection; failed writes keep the manual choice in memory.

`lib/translations.ts` maps Japanese application text to English. Translation happens at rendering, including existing field and server errors, so switching preserves TanStack Form drafts and server data. Interpolated values stay plain text; user-generated content is never translated. Weekday labels follow the language while date values, local time zones, and yen amounts retain their meaning. Backend validation rules and API messages remain unchanged.

The initial script in `index.html` uses the same saved-choice and browser-language priority to set document language and title before rendering. `main.tsx` and subsequent language changes also update description metadata. When editing UI wording, update both language entries and check the guide in both languages.

### PWA

`public/manifest.webmanifest` enables installation; a Service Worker allows the UI to start offline.
The Service Worker source is `src/sw.js`. At build time, the `serviceWorker` plugin in `vite.config.ts` prepends `VERSION` (a hash of HTML / JS / CSS contents) and `PRECACHE` (`/`, JS and CSS under `/assets/`, and `/favicon.svg`), producing `dist/sw.js`.
`lib/serviceWorker.ts` registers it only in production builds, since the development server has no `sw.js` and a Service Worker would interfere with HMR.

| Request | Strategy |
| --- | --- |
| Page navigation | Network first; only when offline, return cached `index.html` (`/`). Do not cache individual URLs |
| `/assets/*` | Cache first; fetch and cache on a miss, since hashed filenames have immutable contents |
| `/api/*` | Do not handle, keeping data and tokens out of caches |
| Other files from `public/` | Network first; use the cache only when offline |

New Service Workers activate immediately (`skipWaiting` / `clients.claim`) and delete old caches with a different `VERSION`.

## Code shared by server and frontend

Both frontend and backend import three files from `shared/` (`@tsudou/shared`) by package name, such as `@tsudou/shared/limits`. Only modules in `exports` in `shared/package.json` are public.

| File | Shared contents |
| --- | --- |
| `limits.ts` | Input limits (`LIMITS`) and retention (`RETENTION_MONTHS`) |
| `messages.ts` | Validation message text |
| `types.ts` | Domain types (`Candidate` / `Choice` / `EventView` / `AnswerView`, etc.) |

These files are **bundled into both browser and Worker code, so they cannot use platform-specific APIs**.
`shared/tsconfig.json` includes neither DOM nor Node types, so `document` or `process` cause type errors (covered by `pnpm run typecheck`). The frontend does not depend on the backend package and cannot import `validate.ts` / `operations.ts`, which pull in `node:crypto`. Place shared types in `types.ts`.

Client validation (`formValidators.ts`) helps users catch errors before submitting; final validation always happens on the server (`validate.ts`). Shared limits and messages prevent divergence.

## Data retention

Events and responses are automatically deleted after `RETENTION_MONTHS` (default: three months) from creation.

- The API server writes `expires_at` (epoch seconds) at record creation.
- A daily Cron Trigger (18:00 UTC = 03:00 JST) invokes `scheduled` in `worker.ts`; `deleteExpired` in `d1Repository.ts` deletes expired events. Responses disappear through the foreign key's `ON DELETE CASCADE`.
- Retention starts at **event creation** and is not extended by edits or responses. Responses inherit the event's `expires_at` and disappear with it.
- Daily cleanup may leave records in storage for up to about one day after expiry. `isExpired` in `retention.ts` also treats them as nonexistent, so users see them disappear exactly at expiry. A failed Cron run merely delays physical cleanup until the next day without changing visible behavior.
- `retention.test.ts` pins `RETENTION_MONTHS`, catching unintended changes.

## Deployment

`.github/workflows/tsudou-deploy.yml` (at the monorepo root) runs automatically on pushes to `main` that change `apps/tsudou/**` or the workspace dependencies. It can also be run manually from the Actions tab (`workflow_dispatch`). It performs these steps:

1. Build the frontend with `pnpm run build` (`frontend/dist/`, served by the Worker).
2. If the D1 database (`tsudou`) is absent, create it with `wrangler d1 create tsudou --location apac` (first deployment only).
3. Apply pending migrations with `wrangler d1 migrations apply tsudou --remote`.
   This runs before Worker deployment so new code can rely on the new schema.
4. Run `wrangler deploy` from `backend/` to publish the Worker (`tsudou`) serving the UI and API.

Cloudflare authentication uses secrets `CLOUDFLARE_API_TOKEN` (Workers and D1 edit permissions) and `CLOUDFLARE_ACCOUNT_ID`. The account ID is not a credential, but is stored as a secret to keep it out of logs.

The D1 binding in `backend/wrangler.jsonc` has no `database_id`, only `database_name` (`tsudou`).
At deployment, wrangler resolves the database by name within the account, keeping account-specific IDs out of the repository.
The workflow creates the database only when `wrangler d1 info` cannot find it on the first deployment.

`wrangler deploy` can also create a missing bound database (resource provisioning), but this feature is not used.
It cannot specify a region, so the database might be created near the GitHub Actions runner and far from Japan. It also runs after the migration step, making first-deployment migrations fail.
D1 regions cannot be changed after creation, so the workflow explicitly creates the database with `--location apac`.
If `wrangler d1 info` fails temporarily, `d1 create` stops with an error when the name already exists, preventing duplicates.

Static asset configuration (`assets`) lives in `backend/wrangler.jsonc`; `directory` points to `../frontend/dist`.
The configuration is placed alongside Worker code and D1 migrations in `backend/`.
`run_worker_first: ["/api/*"]` forwards only API paths to the Worker script; other paths return assets directly without invoking the Worker.
Hosting is at the root, so Vite's `base` and the router's `basename` keep their defaults.

`not_found_handling: "single-page-application"` returns `index.html` with status 200 for navigation to unknown paths, leaving routing to the SPA.

Response headers come from `frontend/public/_headers`, copied into `dist/` during the build.
All paths receive HSTS / `X-Content-Type-Options` / `X-Frame-Options` / `Permissions-Policy` and `Referrer-Policy: no-referrer`. `/assets/*` uses long-term caching; `/sw.js` uses `no-cache`.
Although tokens are in fragments, `<meta name="referrer" content="no-referrer">` in `frontend/index.html` also suppresses Referer headers to avoid leakage through external links.

## Local development

Start API (`pnpm run dev:api`) and UI (`pnpm run dev`) development servers separately.

`pnpm run dev:api` applies local migrations with `wrangler d1 migrations apply tsudou --local`, then starts the Worker with `wrangler dev --port 8080`. wrangler uses the production runtime (workerd) and substitutes local D1 and Rate Limiting implementations. No Cloudflare account is required.
Local D1 data persists in `backend/.wrangler/state/` after shutdown.
Since wrangler requires `assets.directory` (`frontend/dist/`) to exist, an empty directory is created first if needed.

Vite (`pnpm run dev`) proxies `/api` to `localhost:8080`, preserving the same-origin behavior seen in production.
After `pnpm run build`, opening `localhost:8080` lets you verify the production arrangement with one Worker serving everything.

Cron Triggers do not run automatically locally; invoke them with `curl http://localhost:8080/cdn-cgi/local/scheduled`.

`wrangler types` generates TypeScript types (`Env`, `D1Database`, and `cloudflare:*` modules) in `backend/worker-configuration.d.ts`.
This file is regenerated from `wrangler.jsonc` for each `pnpm run typecheck` and is not committed.

## Tests

`pnpm test` runs each package's Vitest suite in sequence.
Frontend tests (`frontend/vite.config.ts`, `frontend/src/**/*.test.{ts,tsx}`) use jsdom; backend tests (`backend/vitest.config.ts`, `backend/**/*.test.ts`) use node.

| Area | Tests |
| --- | --- |
| HTTP input/output | `app.test.ts` (supertest: /api routing, statuses, token headers, invalid JSON, rate limiting) |
| Business logic | `operations.test.ts` (injected `memoryRepository`, covering creation → response → editing → deletion) |
| D1 implementation | `d1Repository.test.ts` (local D1 through wrangler's `getPlatformProxy`, with migrations applied) |
| Validation and normalization | `validate.test.ts` |
| Tokens | `tokens.test.ts` (hashing and constant-time comparison) |
| Retention | `retention.test.ts` |
| Frontend pure functions | `format.test.ts` / `errors.test.ts` / `formValidators.test.ts` / `answerDraft.test.ts` / `candidateDraft.test.ts` / `urls.test.ts` / `keyring.test.ts` |
| Data-fetching hooks | `useEvent.test.tsx` / `useAsyncAction.test.tsx` / `eventActions.test.tsx` (fresh `createQueryClient()` per test, mocked `api.ts`) |
| Components | `AnswerForm.test.tsx` / `AnswerGrid.test.tsx` / `ShareLinkBox.test.tsx` / `EventUrlBoxes.test.tsx` / `Root.test.tsx` (Testing Library) |

### E2E tests

`pnpm run test:e2e` runs Playwright scenarios in `e2e/tests/` against the production arrangement: the built frontend and the API served by one `wrangler dev` Worker.
They cover flows that span screens, the API, and D1, which unit tests cannot: creating and editing an event with the management URL, losing the management token on reload, answering and editing through the response edit URL in another browser, duplicate names, closing and reopening, and deleting an event.

- Each scenario runs in Japanese and English (projects `ja` / `en`). `fixtures.ts` looks up labels through `frontend/src/lib/translations.ts`, so tests are written once with the Japanese source text.
- Hosts and participants use separate browser contexts (`newUser`), so tokens held in one browser's memory do not leak into another.
- `scripts/serve.mjs` recreates local D1 in `e2e/.wrangler/` for every run and starts `wrangler dev --env e2e`. Locally, every request shares one rate-limit key regardless of headers, so the `e2e` environment in `wrangler.jsonc` raises the limit. It is not used for deployment.
- Service Workers are blocked so cached pages do not affect results. Tests use the installed Google Chrome (`channel: 'chrome'`), which GitHub Actions runners also provide.

## Design decisions

Without sign-in, permissions use unguessable URLs and tokens.
There is no need to collect email addresses or passwords, and participants can respond simply by opening a URL.
Management tokens and response edit keys are not persisted in the browser, preventing the next user on a shared computer from changing events or responses. Management and response edit URLs are shown immediately after issuance, and users must keep them.
Leaving no tokens on the device takes priority over the inconvenience of losing editing access on reload.
Creation confirmation and post-submission screens explain this restriction.

A single Worker (Express app) handles all operations, rather than separate Workers per operation.
Validation, token checks, and repository implementations are shared; splitting operations would add more wiring overhead than benefit.

The app originally used Amplify Gen 2 (AppSync + API Key). API keys expire after at most 365 days, requiring annual redeployment; Lambda type checking depended on generated `ampx` output; and only a few operations needed exposure, offering little benefit from GraphQL. It moved to API Gateway (HTTP API) + Lambda + DynamoDB, defined directly with CDK.
HTTP API is cheaper and has lower latency than REST API (v1), while providing the required throttling and CORS support.

Later, handlers tied directly to Lambda event formats were replaced with a standard Express HTTP server running through Lambda Web Adapter. The same Docker image ran in Lambda and local `docker compose`, enabling API development and verification without AWS and tests through supertest.
Since the image lacked the Lambda runtime's AWS SDK, esbuild bundled the SDK and application into a single file.

The backend then moved to Cloudflare (Workers + D1), alongside the frontend, for these reasons:

- One hosting and deployment destination removes AWS authentication setup (OIDC roles, CDK bootstrap) and Docker image builds.
- D1 `UNIQUE` constraints and foreign keys prevent concurrent duplicate names and orphaned responses at the database level. The DynamoDB read-then-write approach could not prevent simultaneous submissions.
- Local development needs only `wrangler dev`, without a DynamoDB Local Docker container.

Existing Express code runs on Workers through `nodejs_compat` and `httpServerHandler`.
Immediately after migration, the API used a separate Worker and origin; it was then combined with the UI in one Worker.
Sharing an origin removes CORS configuration, Variables for allowed origins and API URLs, and build-time `VITE_API_URL`, eliminating those configuration failures that could prevent API calls from the UI.
API routes moved under `/api` to separate them from SPA paths.
Because the `Repository` interface already separated business logic from data access, only `dynamoRepository.ts` → `d1Repository.ts` and the entry point (`server.ts` → `worker.ts`) needed replacement.
D1 has no TTL feature, so a Cron Trigger performs expiry cleanup.

## Atomic candidate updates

`Repository.updateEvent` also reconciles existing response choices whenever candidates change.
D1 batches the event update and response reconciliation in one transaction: a failure rolls back both.
Reconciliation uses the response choices stored at execution time, preserving retained selections and filling new candidates with `MAYBE`.
The memory repository follows the same contract.

`Repository.deleteEvent` deletes the event and its associated responses together.
D1 uses `ON DELETE CASCADE`; the memory repository also removes associated responses.
Business logic performs authorization and delegates deletion without listing or individually deleting responses.

# Tsudou

A web app for scheduling events without signing in.
Hosts create an event and receive a shareable URL. Anyone with the URL can respond to each candidate date with ○ (yes), △ (maybe), or × (no).

**Demo:** <https://tsudou.wasabee.dev/>

- **Frontend**: React 19 + React Router (SPA) + TanStack Query + TanStack Form + Tailwind CSS v4 + Vite
- **Backend**: Express.js API server running on Cloudflare Workers (`nodejs_compat`), with Cloudflare D1 (SQLite) for storage
- **Hosting**: A single Cloudflare Worker serves the UI (static assets) and API on the custom domain `tsudou.wasabee.dev`, deployed through GitHub Actions

## Features

| Role | Capabilities |
| --- | --- |
| Host | Create events (title, multiple candidate dates/times, fee, memo), edit details, close/reopen responses, delete responses, and delete events |
| Participant | Respond with ○△× for each candidate, attach an optional message, and edit/delete their own response |

The header lets users switch between Japanese and English. English is the default. The choice is saved in the browser; event titles, memos, names, and messages stay as entered.

The app supports PWA installation on smartphone home screens and desktop computers.

The in-app user guide (`/guide`) explains how to use the screens with screenshots.

Creating an event issues two URLs:

| URL | Purpose |
| --- | --- |
| `/e/<eventId>` | **Sharing**: send to participants |
| `/e/<eventId>/manage#k=<manageToken>` | **Management**: keep private to the host |

## Security model

Without sign-in, permissions are represented by unguessable URLs and tokens.

- **Event IDs are 128-bit random values** (22 base64url characters). People who do not know the shared URL cannot reach the event.
- **Clients cannot access the database directly.** Only the API server can access D1's `events` / `answers` tables through Worker bindings.
- **There are only seven API routes** (`POST /api/events`, `GET` / `PATCH` / `DELETE /api/events/{eventId}`, `POST /api/events/{eventId}/answers`, and `PUT` / `DELETE /api/answers/{answerId}`). There are no routes to enumerate events or responses.
  All token checks and input validation run on the server.
- **Tokens are sent in dedicated headers (`X-Manage-Token` / `X-Edit-Token`).** They are absent from URL paths and query strings, keeping them out of access logs.
- **Abuse prevention**: Workers Rate Limiting restricts each client IP to 100 requests per 60 seconds.
- **The API is under `/api` on the same origin as the UI.** CORS is not enabled for other origins, preventing browser calls from pages on other sites.
- **The Service Worker caches only build assets (HTML / JS / CSS / images).** It does not handle `/api` requests, so event data, responses, and tokens are not left in the browser cache. Page HTML is not stored per URL, so management URLs do not remain as cache keys.
- **Tokens are not stored in plaintext.** Only SHA-256 hashes of management tokens and response edit keys are stored, and comparisons use `crypto.timingSafeEqual`. Plaintext is returned only once, when issued.
- **Public response types have no hash fields.** `EventView` / `AnswerView` are separate from stored record types, and the API server maps records to those views, structurally preventing accidental hash exposure.
- **Management tokens and response edit keys are passed in URL fragments (`#k=...`) rather than query strings.**
  Fragments are not sent to the server, so they do not appear in access logs or Referer headers.
  Tokens are loaded into memory immediately, and `history.replaceState` removes them from the URL.
  The `Referrer-Policy: no-referrer` header and `<meta name="referrer">` in `frontend/index.html` also suppress Referer headers.

> **Note**: Management tokens and response edit keys are **not persisted in the browser**, to support shared computers.
> Keep the management URL issued at event creation and the response edit URL issued at submission. They cannot be displayed again later.

## Data retention

Events and responses are **automatically deleted three months after creation**.

- The API server writes `expires_at` (epoch seconds) when creating records. A daily Cron Trigger (`triggers.crons` in `backend/wrangler.jsonc`) deletes expired events. Responses are deleted with them through the foreign key's `ON DELETE CASCADE`.
- **Retention starts when the event is created.** Edits and responses do not extend it.
- Since deletion runs daily, records may remain for up to about one day after expiry. To prevent access during that interval, the app also treats expired events as nonexistent (`isExpired` in `backend/src/retention.ts`). To users, they disappear at expiry.
- To change retention, update `RETENTION_MONTHS` in `shared/src/limits.ts` and redeploy.
  **Existing records' `expires_at` values are not rewritten**; the change applies only to newly created records.
- The automatic deletion date appears on the event and management pages.

## About the name

The name comes from the Japanese word "集う" (to gather). The romanized `Tsudou` is the wordmark; repository and package names use lowercase `tsudou`.

## Setup

```bash
pnpm install
```

Tsudou consists of three packages in the monorepo pnpm workspace: `frontend/` (`@tsudou/frontend`), `backend/` (`@tsudou/backend`), and shared code in `shared/` (`@tsudou/shared`).
Run `pnpm install` once anywhere in the repository to install all packages. Run all commands below from `apps/tsudou/`.

### Local development

Start the API and UI development servers in separate terminals. No Cloudflare account is required.

```bash
pnpm run dev:api
```

```bash
pnpm run dev
```

- `pnpm run dev:api` applies migrations (`backend/migrations/`) to local D1, then starts the Worker with `wrangler dev` at `http://localhost:8080`. Saving source files reloads it.
  D1 data is stored in `backend/.wrangler/` and survives shutdown. The directory is gitignored; to clear it, stop the server and delete the directory.
- `pnpm run dev` starts Vite at `http://localhost:5173`. Requests to `/api` are proxied to `localhost:8080` (`server.proxy` in `frontend/vite.config.ts`), so API calls use the same origin, as in production.
- After building the frontend with `pnpm run build`, you can also use `http://localhost:8080` to verify the production arrangement: the same Worker serves the UI and API.
- Cron Triggers do not run automatically locally. To test expiry cleanup, call `curl http://localhost:8080/cdn-cgi/local/scheduled`.

### Other commands

```bash
pnpm run build             # Frontend type check and production build (frontend/dist/)
pnpm run build:api         # Bundle the Worker without deploying (backend/dist/; run pnpm run build first)
pnpm run typecheck         # Type-check all packages; backend generates Worker types with wrangler types first
pnpm test                  # Unit tests for both packages (Vitest)
pnpm run lint              # Lint and formatting checks (Biome, all of apps/tsudou/)
pnpm run lint:fix          # Apply Biome fixes
pnpm run openapi           # Regenerate API documentation (docs/openapi.yaml)
pnpm run guide:capture     # Recapture user guide screenshots (development servers must be running)
```

When changing API routes or input/output, update `backend/src/schemas.ts` (Zod schemas) and `backend/src/openapi.ts` (route definitions), then regenerate `docs/openapi.yaml` with `pnpm run openapi`. `pnpm test` detects outdated generated documentation.

After changing the UI appearance, run `pnpm run guide:capture` with both `pnpm run dev:api` and `pnpm run dev` running to recapture guide screenshots (`frontend/src/assets/guide/`).
The script creates sample data (a "チーム歓迎会" team welcome party and four responses) in local D1 and captures it using the installed Google Chrome.
If image dimensions change, update `width` / `height` in `frontend/src/routes/Guide.tsx` accordingly.

When changing the D1 schema, run `pnpm exec wrangler d1 migrations create tsudou <name>` from `backend/` to add a file under `backend/migrations/`. Do not rewrite migrations that have already been applied.

## Deployment (Cloudflare Workers)

Manually run `.github/workflows/tsudou-deploy.yml` (at the monorepo root) from the Actions tab (`workflow_dispatch`). It performs these steps:
(Automatic deployment on pushes to `main` is currently disabled.)

1. Build the frontend with `pnpm run build` (`frontend/dist/`).
2. If the D1 database (`tsudou`) does not exist, create it with `wrangler d1 create tsudou --location apac` (first deployment only).
3. Apply pending D1 migrations with `wrangler d1 migrations apply tsudou --remote`.
4. Run `wrangler deploy` from `backend/` to publish the Worker (`tsudou`) serving the UI and API.

### Initial setup

1. **Create a Cloudflare API token.** In My Profile → API Tokens, use the "Edit Cloudflare Workers" template, restrict it to the deployment account, and add **Account → D1 → Edit** permission.
   The Worker (`tsudou`) and D1 database (`tsudou`) are created automatically on the first deployment.
   `backend/wrangler.jsonc` resolves the database by name without a `database_id`, so no ID needs to be added to the configuration.
2. **Configure repository secrets** (Settings → Secrets and variables → Actions).

   | Type | Name | Value |
   | --- | --- | --- |
   | Secret | `CLOUDFLARE_API_TOKEN` | Token from step 1 |
   | Secret | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

   The Worker is served on the custom domain `tsudou.wasabee.dev` (`routes` in `backend/wrangler.jsonc`). `wrangler deploy` creates the DNS record and certificate, so the `wasabee.dev` zone must be in the same account. The `workers.dev` and preview URLs are disabled. No other configuration is needed because the UI and API share an origin.

### Removing resources

Manually run `.github/workflows/tsudou-destroy.yml` (at the monorepo root) from the Actions tab to delete Cloudflare resources.
Because this cannot be undone, it runs only when the `confirm` input matches the Worker name (`tsudou`).

1. Delete the Worker (`tsudou`), stopping UI/API delivery and the Cron Trigger.
2. Delete the D1 database (`tsudou`) only when `delete_database` is checked.
   **All event and response data is lost**. By default, the checkbox is off and the database is retained.

Keeping the database allows redeployment with the original data.
The workflow uses the same concurrency group as deployment, preventing overlapping runs.

### Delivery behavior

Configuration lives in `backend/wrangler.jsonc` (`assets`) and `frontend/public/_headers`.
Static assets bypass the Worker script; only `/api/*` reaches the Worker (Express) through `run_worker_first`.

- **SPA routing**: `not_found_handling: "single-page-application"` returns `index.html` with status 200 for navigation to unknown paths such as `/e/<eventId>`, allowing client-side routing.
- **Response headers**: `_headers` adds `Strict-Transport-Security` / `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` to all static asset paths. Hashed `/assets/*` files use long-term `immutable` caching. HTML uses the default `max-age=0, must-revalidate` and is revalidated each time.
- **Search engines**: All paths receive `X-Robots-Tag: noindex, nofollow`, except the home page (`/`).
  The headers on SPA fallback `index.html` responses follow the requested path.
- **PWA**: Provided by `public/manifest.webmanifest` and generated `sw.js`. The source is `frontend/src/sw.js`; the `serviceWorker` plugin in `vite.config.ts` adds a precache file list and cache version during the build.
  Page navigation always uses the network, falling back to cached `index.html` only when offline. `/assets/*` uses the cache first.
  Since `sw.js` has a fixed filename, `_headers` sets `no-cache` so updates arrive promptly after deployment. The Service Worker is registered only in production builds and does not run on the development server (`pnpm run dev`).
- **Root hosting**: No subpath is used, so Vite's `base` and the router's `basename` keep their defaults.
- To verify production delivery locally, run `pnpm run build`, then `pnpm run dev:api`, and open `http://localhost:8080`.

## Structure

```text
backend/                         @tsudou/backend
├─ package.json                  Dependencies and scripts
├─ wrangler.jsonc                Worker settings (static assets / D1 / Rate Limiting / Cron Trigger)
├─ migrations/                   D1 migrations (wrangler d1 migrations)
├─ vitest.config.ts              Backend test configuration (node environment)
├─ scripts/openapi.ts            Generate docs/openapi.yaml (pnpm run openapi)
└─ src/
   ├─ worker.ts                  Worker entry (Express listen / httpServerHandler / Cron)
   ├─ app.ts                     Express app (routes under /api, error handling, rate limiting)
   ├─ http.ts                    Body validation (Zod), error-to-status mapping
   ├─ schemas.ts                 API input/output shapes (Zod schemas)
   ├─ openapi.ts                 Generate OpenAPI documentation from schemas and routes
   ├─ operations.ts              Business logic (injected Repository; tested directly)
   ├─ repository.ts              Data access boundary (interface)
   ├─ d1Repository.ts            Production implementation (D1) and expiry cleanup
   ├─ memoryRepository.ts        In-memory implementation for tests
   ├─ tokens.ts                  ID/token generation, hashing, constant-time comparison
   ├─ validate.ts                Input validation and normalization
   ├─ retention.ts               Expiry calculation and checks
   └─ errors.ts                  AppError (code + description)

shared/                          @tsudou/shared (bundled into both frontend and backend)
├─ package.json                  Exposes limits / messages / types through exports
├─ tsconfig.json                 No DOM or Node types (platform-specific APIs cause type errors)
└─ src/
   ├─ limits.ts                  Input limits and retention period
   ├─ messages.ts                Validation messages
   └─ types.ts                   Domain types

frontend/                        @tsudou/frontend
├─ package.json                  Dependencies and scripts
├─ index.html / vite.config.ts   Entry HTML and Vite/Vitest configuration (development /api proxy)
├─ public/_headers               Response headers
├─ public/favicon.*              Favicons (favicon.svg is the source and header logo), apple-touch-icon.png
├─ public/manifest.webmanifest   PWA manifest (public/icon-*.png exported from favicon.svg)
├─ scripts/capture-guide.mjs     Capture guide screenshots (pnpm run guide:capture)
└─ src/
   ├─ sw.js                      Service Worker source (built as dist/sw.js)
   ├─ router.tsx                 Route definitions
   ├─ routes/                    Home / Guide / EventCreated / EventPublic / EventManage / NotFound
   ├─ assets/guide/              Guide screenshots
   ├─ components/                AnswerForm, AnswerGrid, CandidateEditor,
   │                             EventEditForm, EventFormFields, EventUrlBoxes,
   │                             ShareLinkBox, ui/
   └─ lib/                       api, queryClient, errors, format, formValidators,
                                 keyring, storage, serviceWorker, theme, urls, useEvent,
                                 useAsyncAction, types
```

### Design notes

- **API business logic depends on the `Repository` interface.** Tests inject `memoryRepository.ts` to verify creation, responses, edits, and deletion without a database.
  The D1 implementation (`d1Repository.test.ts`) is tested against local D1 through wrangler's `getPlatformProxy`.
- **Consistency when editing candidate dates**: Deleting a candidate removes its choices; adding a candidate fills existing responses with `MAYBE` (`reconcileChoices` in `validate.ts`). Clients send candidate IDs back, preserving links to existing responses during edits.
- **Each name may respond only once per event.** A second submission returns `DUPLICATE_NAME`; only someone with the response edit URL can edit the response. D1's `UNIQUE (event_id, name)` constraint also prevents concurrent duplicate submissions.
- **Server data is fetched and cached with TanStack Query (`@tanstack/react-query`).**
  Refetching on window focus lets hosts see new responses when returning to an open management tab.
- **Forms use TanStack Form (`@tanstack/react-form`).** Each form component owns its state. Callers change its `key` to recreate it with new initial values, avoiding state synchronization through `useEffect`.
- **Input limits have a single definition.** Both server validation (`validate.ts`) and frontend validation (`frontend/src/lib/formValidators.ts`) reference `shared/src/limits.ts`, preventing divergence. Client validation catches issues before submission; the server always performs final validation.

## Documentation

| Document | Contents |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Structure, authorization model, API layers, shared code, deployment, and design decisions |
| [docs/specification.md](docs/specification.md) | Screens / URLs / API / business rules / input constraints / error codes |
| [docs/openapi.yaml](docs/openapi.yaml) | OpenAPI 3.1 API definition (generated by `pnpm run openapi`) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for Conventional Commits and implementation conventions.

## Out of scope

Notifications (email, etc.), calendar integration, languages other than Japanese and English, and image uploads are not included.

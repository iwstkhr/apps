# Architecture

Structure, data flow, module responsibilities, and delivery pipeline for the TODO app.

See [specification.md](./specification.md) for features, screens, and data specifications.

## Overview

```text
┌──────────────────────────────────────────────────────────┐
│ Cloudflare Workers (static asset delivery only)          │
│ build/client                                             │
└──────────────────────────┬───────────────────────────────┘
                           │ HTML / JS / CSS
                           ▼
┌──────────────────────────────────────────────────────────┐
│ Browser SPA (React Router / Vite, ssr: false)            │
│                                                          │
│ Home (routes/home.tsx)                                   │
│   ├─ useTodos ──► todo-db ──► IndexedDB ("todo" DB)      │
│   │      └─ BroadcastChannel ("todo-changes") ◄─► tabs   │
│   ├─ applyFilters ──► TodoList / TodoItem                │
│   └─ export-import ──► JSON file download / upload       │
└──────────────────────────────────────────────────────────┘
```

There is no backend API or database. The Worker has no script and only serves the build output.

## Technology stack

| Layer | Technology |
| --- | --- |
| UI | React 19, TypeScript |
| Routing / Build | React Router 8 (SPA), Vite 8 |
| Storage | IndexedDB (native API) |
| Styling | Tailwind CSS 4 |
| Quality | Biome, Vitest, Testing Library, fake-indexeddb, Playwright, pre-commit |
| Delivery | Cloudflare Workers static assets (wrangler) |

## Directory structure

```text
app/
  root.tsx                      HTML layout and error boundary
  routes/home.tsx               The only screen; wires state, filters, and import/export
  hooks/use-todos.ts            Todo state, persistence, and cross-tab sync
  lib/todo-db.ts                IndexedDB access (open, read, put, delete, replace)
  lib/export-import.ts          Export file creation, import parsing, and merging
  lib/todo-filters.ts           Filtering and sorting (pure functions)
  lib/styles.ts                 Shared Tailwind class strings
  types/todo.ts                 Todo type, factories, validation, and date helpers
  components/layout/            Header with export and import buttons
  components/todo/              Add/edit form, toolbar, list, and item
  components/data/              Import confirmation dialog
e2e/                            Playwright tests against wrangler dev
```

## Data flow

1. On mount, `useTodos` reads every record from the `todos` object store (key path `id`) and normalizes it with `toTodo()`.
2. Each change updates React state first and then writes to IndexedDB, so the UI responds immediately. If the write fails, an error is shown and the state is reloaded from IndexedDB.
3. After a successful write, `useTodos` posts a message on the `todo-changes` BroadcastChannel; other tabs reload from IndexedDB when they receive it.
4. Filtering and sorting are derived in `routes/home.tsx` with `applyFilters()` and are not persisted.
5. Export serializes the in-memory todos to a Blob and triggers a download. Import reads the file with `File.text()`, validates it with `parseImport()`, and passes the result to `importTodos()` after the user picks merge or replace.

## Module responsibilities

| Module | Responsibility |
| --- | --- |
| `types/todo.ts` | `createTodo`, `updateTodo`, `setTodoStatus`, tag parsing, `toTodo` (validation and defaults for untrusted data), `getDueStatus` |
| `lib/todo-db.ts` | A single cached connection; one transaction per write so multi-record writes are atomic |
| `lib/export-import.ts` | Export envelope (`app`, `version`, `exportedAt`, `todos`), `parseImport` with Japanese error messages, `mergeTodos` by `updatedAt` |
| `lib/todo-filters.ts` | Status, tag, and keyword filters; per-status counts; due, priority, status, and creation sorts |
| `hooks/use-todos.ts` | CRUD API for components, optimistic updates, error handling, and tab sync |

## Testing

| Level | Tool | Scope |
| --- | --- | --- |
| Unit | Vitest | Types, filters, export/import, IndexedDB access (fake-indexeddb) |
| Component | Vitest, Testing Library, happy-dom | `useTodos` and the whole `Home` screen |
| E2E | Playwright | Production build served by `wrangler dev`: persistence across reloads, editing, export → delete → import |

## CI / CD

| Workflow | Trigger | Job |
| --- | --- | --- |
| `todo-test.yml` | PR and push to `main` touching `apps/todo/` | Type check, unit tests, E2E tests |
| `todo-preview.yml` | PR opened / updated / closed | Create a `wrangler preview` per PR and comment its URL; delete it when the PR closes |
| `todo-deploy.yml` | Push to `main` touching `apps/todo/`, or manual | Build and `wrangler deploy` to `todo.wasabee.dev` |
| `pre-commit.yml` | All PRs and pushes | Biome, markdownlint, actionlint, gitleaks, and other hooks |

`wrangler.jsonc` serves `build/client` with `not_found_handling: "single-page-application"`, disables `workers.dev` for production, and enables preview URLs. The custom domain `todo.wasabee.dev` is created by `wrangler deploy` because the `wasabee.dev` zone is in the same Cloudflare account.

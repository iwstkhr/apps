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
│   │      │           (stores: todos, folders)            │
│   │      └─ BroadcastChannel ("todo-changes") ◄─► tabs   │
│   ├─ folder-tree ──► FolderSidebar / FolderSelect        │
│   ├─ filterByFolder → applyFilters ──► TodoList / Item   │
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
  lib/folder-tree.ts            Folder tree helpers: ordering, paths, subtrees, repair, counts
  lib/export-import.ts          Export file creation, import parsing, and merging
  lib/todo-filters.ts           Filtering and sorting (pure functions)
  lib/styles.ts                 Shared Tailwind class strings
  types/todo.ts                 Todo type, factories, validation, and date helpers
  types/folder.ts               Folder type, factories, and validation
  components/layout/            Header with export and import buttons, and the shared modal
  components/folder/            Folder list, create/edit dialog, and folder selector
  components/todo/              Add/edit form, toolbar, list, and item
  components/data/              Import confirmation dialog
e2e/                            Playwright tests against wrangler dev
```

## Data flow

1. On mount, `useTodos` reads every record from the `todos` and `folders` object stores (key path `id`) and normalizes them with `toTodo()` and `toFolder()`. The database is at version 2; version 1 had only the `todos` store, and the upgrade adds `folders`.
2. Each change updates React state first and then writes to IndexedDB, so the UI responds immediately. If the write fails, an error is shown and the state is reloaded from IndexedDB.
3. After a successful write, `useTodos` posts a message on the `todo-changes` BroadcastChannel; other tabs reload from IndexedDB when they receive it.
4. The folder selection, collapsed folders, filters, and sort order live in `routes/home.tsx` state and are not persisted. `filterByFolder()` narrows the todos to the selected folder and its subfolders, then `applyFilters()` filters and sorts them.
5. Deleting a folder removes its subtree and rewrites the affected todos to 未分類 in one IndexedDB transaction, so a failure leaves both unchanged.
6. Export serializes the in-memory todos and folders to a Blob and triggers a download. Import reads the file with `File.text()`, validates and repairs it with `parseImport()`, and passes the result to `importData()` after the user picks merge or replace.

## Module responsibilities

| Module | Responsibility |
| --- | --- |
| `types/todo.ts` | `createTodo`, `updateTodo`, `setTodoStatus`, tag parsing, `toTodo` (validation and defaults for untrusted data), `getDueStatus` |
| `types/folder.ts` | `createFolder`, `updateFolder`, `toFolder` (validation for untrusted data) |
| `lib/folder-tree.ts` | `flattenFolderTree` (tree order with collapsing), `getSubtreeIds`, `formatFolderPath`, `wouldCreateCycle`, `sanitizeFolders` / `sanitizeTodoFolders` (repair missing parents, cycles, and dangling folder ids), `filterByFolder`, `countOpenByFolder` |
| `lib/todo-db.ts` | A single cached connection; every write is one transaction over both stores, so multi-record and cross-store writes are atomic |
| `lib/export-import.ts` | Export envelope (`app`, `version`, `exportedAt`, `folders`, `todos`), `parseImport` with Japanese error messages, `mergeData` by `updatedAt`, `sanitizeData` |
| `lib/todo-filters.ts` | Status, tag, and keyword filters; per-status counts; due, priority, status, and creation sorts |
| `hooks/use-todos.ts` | CRUD API for todos and folders, optimistic updates, error handling, and tab sync |

## Testing

| Level | Tool | Scope |
| --- | --- | --- |
| Unit | Vitest | Types, filters, folder tree helpers, export/import, IndexedDB access (fake-indexeddb) |
| Component | Vitest, Testing Library, happy-dom | `useTodos` and the whole `Home` screen |
| E2E | Playwright | Production build served by `wrangler dev`: persistence across reloads, editing, nested folders, folder deletion, export → delete → import, and the folder toggle on narrow screens |

## CI / CD

| Workflow | Trigger | Job |
| --- | --- | --- |
| `todo-test.yml` | PR and push to `main` touching `apps/todo/` | Type check, unit tests, E2E tests |
| `todo-preview.yml` | PR opened / updated / closed | Create a `wrangler preview` per PR and comment its URL; delete it when the PR closes |
| `todo-deploy.yml` | Push to `main` touching `apps/todo/`, or manual | Build and `wrangler deploy` to `todo.wasabee.dev` |
| `pre-commit.yml` | All PRs and pushes | Biome, markdownlint, actionlint, gitleaks, and other hooks |

`wrangler.jsonc` serves `build/client` with `not_found_handling: "single-page-application"`, disables `workers.dev` for production, and enables preview URLs. The custom domain `todo.wasabee.dev` is created by `wrangler deploy` because the `wasabee.dev` zone is in the same Cloudflare account.

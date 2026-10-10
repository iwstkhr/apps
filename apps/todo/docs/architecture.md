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
  hooks/use-view-state.ts       Sort mode, selected and collapsed folders, and the folder list width, kept in localStorage
  lib/todo-db.ts                IndexedDB access (open, read, put, delete, replace)
  lib/folder-tree.ts            Folder tree helpers: ordering, paths, subtrees, repair, counts
  lib/todo-drag.ts              Drag data for moving a todo onto a folder
  lib/todo-order.ts             Custom comparator and reordering visible slots without moving hidden tasks
  lib/export-import.ts          Export file creation, import parsing, and merging
  lib/todo-filters.ts           Filtering and sorting (pure functions)
  lib/styles.ts                 Shared Tailwind class strings
  lib/i18n.ts                   Language selection (browser default, saved choice) and t()
  lib/translations.ts           English text for each Japanese UI string
  types/todo.ts                 Todo type, factories, validation, and date helpers
  types/folder.ts               Folder type, factories, and validation
  components/layout/            Header and its ⋯ menu (language, theme dialog, export, import), the shared modal, responsive sidebar panel, and folder list resizer
  components/folder/            Folder list, create/edit dialog, and folder selector
  components/todo/status-sidebar.tsx Status filter buttons, icons, and counts for the selected folder
  components/todo/status-icon.tsx    Icon shape and color for each status
  components/todo/              Add/edit form, toolbar, list, and item
  components/data/              Import confirmation dialog
e2e/                            Playwright tests against wrangler dev
```

## Data flow

1. On mount, `useTodos` reads every record from the `todos` and `folders` object stores (key path `id`) and normalizes them with `toTodo()` and `toFolder()`. The database is at version 2; version 1 had only the `todos` store, and the upgrade adds `folders`.
   `toFolder()` normalizes icon colors to lowercase `#rrggbb` and defaults missing or invalid colors to amber. This additive field keeps existing database and export versions readable without a migration.
2. Each change updates React state first and then writes to IndexedDB, so the UI responds immediately. If the write fails, an error is shown and the state is reloaded from IndexedDB.
3. After a successful write, `useTodos` posts a message on the `todo-changes` BroadcastChannel; other tabs reload from IndexedDB when they receive it.
4. Filters live in `routes/home.tsx` state and are not persisted. The sort mode, selected and collapsed folders, and folder list width come from `useViewState`, which reads `localStorage` (`todo:view`) after the first render, so the prerendered HTML still matches, and writes it on every change. `filterByFolder()` narrows the todos to the selected folder and its subfolders, then `applyFilters()` filters and sorts them. In custom mode, `TodoList` accepts todo drops with insertion feedback and provides up/down controls. `reorderTodos()` replaces visible slots in the global order and assigns integer `customOrder` ranks; `useTodos` saves changed records in one transaction and broadcasts the change. Missing or invalid ranks become null in `toTodo()`, so existing DB/export versions remain readable.
5. Only the todo header (title and grip) is draggable; the memo and controls sit outside it. Dragging the header puts its id in the `DataTransfer` under the custom type `application/x-todo-id` and replaces the drag image with a small title label offset from the pointer (built off-screen for `setDragImage()` and removed right after). Folder rows accept the drop only for that type (so dragged files or text are ignored), and the drop calls `moveTodo()`, which saves only the moved todo.
6. Deleting a folder removes its subtree and rewrites the affected todos to 未分類 in one IndexedDB transaction, so a failure leaves both unchanged.
7. Export serializes the in-memory todos and folders to a Blob and triggers a download. Import reads the file with `File.text()`, validates and repairs it with `parseImport()`, and passes the result to `importData()` after the user picks merge or replace.

## Module responsibilities

| Module | Responsibility |
| --- | --- |
| `types/todo.ts` | `createTodo`, `updateTodo`, `setTodoStatus`, tag parsing, `toTodo` (validation and defaults for untrusted data), `getDueStatus` |
| `types/folder.ts` | `createFolder`, `updateFolder`, `toFolder` (validation for untrusted data) |
| `lib/folder-tree.ts` | `flattenFolderTree` (tree order with collapsing), `getSubtreeIds`, `formatFolderPath`, `wouldCreateCycle`, `sanitizeFolders` / `sanitizeTodoFolders` (repair missing parents, cycles, and dangling folder ids), `filterByFolder`, `countOpenByFolder` |
| `lib/todo-db.ts` | A single cached connection; every write is one transaction over both stores, so multi-record and cross-store writes are atomic |
| `lib/export-import.ts` | Export envelope (`app`, `version`, `exportedAt`, `folders`, `todos`), `parseImport` with Japanese error messages, `mergeData` by `updatedAt`, `sanitizeData` |
| `lib/todo-filters.ts` | Status, tag, and keyword filters; per-status counts; due, priority, status, and creation sorts |
| `lib/todo-drag.ts` | `setDraggedTodo` (also sets the drag image), `isDraggingTodo` (checks only the type, because data cannot be read during `dragover`), `getDraggedTodo` |
| `hooks/use-todos.ts` | CRUD API for todos and folders (including `moveTodo`, `changePriority`, and `removeTag`), optimistic updates, error handling, and tab sync |
| `hooks/use-view-state.ts` | Restores and saves the sort mode, selected and collapsed folders, and the folder list width (clamped to 180–480 px); ignores broken values and storage errors |
| `lib/i18n.ts` / `lib/translations.ts` | As in tsudou, Japanese UI text is the key and `translations.ts` maps it to English. `t(text, values)` translates and fills `{0}`-style placeholders with values that are never translated; a key may carry context after `\|` (for example `フォルダ\|項目`) when one Japanese word needs different English words, and only the part before `\|` is shown in Japanese. `getLanguage()` returns the saved choice (`todo:language`) or the first supported browser language; `setLanguage()` saves it, updates `lang` and the description, and notifies `useLanguage()` subscribers (also on `storage` events from other tabs). `Home` calls `useLanguage()` so the whole screen re-renders on a change; event handlers and errors call `t()` directly. The prerendered HTML contains only the app shell, so reading the language on the client causes no hydration mismatch |
| `hooks/use-theme.ts` / `lib/themes.ts` | Validates and restores `todo:theme` and `todo:appearance` after mounting and sets `data-theme` and the resolved `data-mode` on the document root; storage failures do not prevent selection. `themes.css` preserves shared neutral tokens, maps the blue accent tokens to indigo for the default (also when `data-theme` is not set yet) or to shades of each preset's selected-row color, and styles the header and sidebar with a shared dark background and bright text, with accent shades derived from the selected-row color; dark variants follow `data-mode` through the custom variant in `app.css`, and automatic mode listens to OS color-scheme changes; semantic colors remain available |
| `components/todo/status-icon.tsx` | Maps each status filter to a react-icons shape and a fixed color. Colors are set with an inline `style` because `themes.css` whitens sidebar icons without one under dark sidebars (the same mechanism keeps folder colors); すべて has no color and follows the text. Icons are `aria-hidden` because the label is next to them |
| `components/layout/header-menu.tsx` | The メニュー button (⋯ plus text that is visible from the `lg` breakpoint and screen-reader-only below it, so the accessible name is always メニュー) and a WAI-ARIA menu (`menuitemradio` items for the language in a `group`, then `menuitem` items for the theme, export, and import). It focuses the first item on open, handles arrow keys, Home, End, Escape, and Tab, closes on outside pointer down, and returns focus to the button. Export uses `aria-disabled` so it stays focusable when unavailable. The import item clicks the hidden file input kept in `app-header.tsx` |
| `components/layout/theme-dialog.tsx` | A native modal dialog with palette samples and radio inputs for six presets, opened from the header menu through a ref; it stays mounted so `useTheme()` applies the saved theme on load. Native dialog behavior traps focus, handles Escape, and returns focus to the menu button on close |
| `components/todo/markdown-memo.tsx` | Renders memo strings with `react-markdown` and `remark-gfm`. React elements keep raw HTML inert and the default URL transform blocks unsafe schemes. Image references become links to avoid automatic remote requests; CSS in `app.css` styles the output and confines code/table scrolling to the memo. The stored source stays unchanged |
| `components/layout/sidebar-panel.tsx` | A persistent sidebar at widths of 1024px and above; a modal drawer named フォルダとステータス, opened from the ☰ button (フォルダとステータスを開く) below that breakpoint. The ☰ button has its own light color rule in `themes.css` for dark headers. Media query changes release the mobile focus trap and scroll lock. The drawer makes the header, main column, and menu button inert, restores focus on close, and closes on Escape, backdrop click, or navigation selection |
| `components/layout/sidebar-resizer.tsx` | A `separator` handle that resizes the folder list by pointer drag or keyboard and resets on double click. The width is applied through the `--sidebar-width` CSS variable on the layout grid. The folder list is `sticky` with a height of the window minus the fixed-height (`h-14`) header, and the footer is in the right column so the folder list stays in place down to the end of the page |

## Testing

| Level | Tool | Scope |
| --- | --- | --- |
| Unit | Vitest | Types, filters, folder tree helpers, export/import, IndexedDB access (fake-indexeddb), language selection, and a check that every `t()` string and label literal has an English translation with the same placeholders. `app/test/setup.ts` selects Japanese before each test, because most tests assert Japanese UI text |
| Component | Vitest, Testing Library, happy-dom | `useTodos`, the header menu (items, keyboard navigation, closing, and disabled export), and the whole `Home` screen |
| E2E | Playwright | Production build served by `wrangler dev`: the default language in Japanese and English browsers, switching the language and keeping it after a reload, persistence across reloads, editing, nested folders, moving a todo by drag and drop, folder deletion, export → delete → import, restoring the folder view after a reload, resizing the folder list, keeping the folder list as tall as the window while scrolling, and the mobile drawer, including focus trapping, close controls, background scroll locking, and switching back to the desktop sidebar |

## CI / CD

| Workflow | Trigger | Job |
| --- | --- | --- |
| `todo-test.yml` | PR and push to `main` touching `apps/todo/` | Type check, unit tests, E2E tests |
| `todo-preview.yml` | PR opened / updated / closed | Create a `wrangler preview` per PR and comment its URL; delete it when the PR closes |
| `todo-deploy.yml` | Push to `main` touching `apps/todo/`, or manual | Build and `wrangler deploy` to `todo.wasabee.dev` |
| `pre-commit.yml` | All PRs and pushes | Biome, markdownlint, actionlint, gitleaks, and other hooks |

`wrangler.jsonc` serves `build/client` with `not_found_handling: "single-page-application"`, disables `workers.dev` for production, and enables preview URLs. The custom domain `todo.wasabee.dev` is created by `wrangler deploy` because the `wasabee.dev` zone is in the same Cloudflare account.

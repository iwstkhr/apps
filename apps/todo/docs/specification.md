# Specification

Specifications for a TODO management web app that keeps all data in the browser.

**Demo:** <https://todo.wasabee.dev/>

## Overview

- Client-only SPA with no server API and no server-side storage
- Todos and folders are stored in the browser's IndexedDB and stay on the device
- JSON export and import are the only way to back up or move data between browsers and devices

## Features

| Feature | Description |
| --- | --- |
| Add | Enter a title and press Enter or 追加. 詳細 opens the memo, tags, due date, priority, and folder fields. New todos go into the folder selected in the folder list |
| Edit | The pencil button turns an item into an edit form, where the todo can also be moved to another folder. Escape or キャンセル discards the changes |
| Status | Each todo has one of 未着手 (not started), 進行中 (in progress), 保留 (on hold), or 完了 (done). Change it with the status selector on the item. The checkbox is a shortcut: checking it sets 完了 and unchecking it returns to 未着手. New todos start as 未着手 |
| Delete | The trash button deletes one todo after a confirmation. 完了済みを削除 deletes all completed todos in the current view |
| Folders | See [Folders](#folders) |
| Filter | Status (すべて / 未着手 / 進行中 / 保留 / 完了, each with a count), tag, and keyword (title, memo, and tags, case-insensitive) |
| Sort | 期限順 (default), 優先度順, ステータス順, 新しい順, カスタム. Completed todos are listed after the others except in カスタム |
| Export | Saves every todo and folder to `todo-export-YYYYMMDD.json` |
| Import | Reads an exported file, then asks whether to merge it with or replace the current todos and folders |
| Tab sync | Changes made in another tab of the same browser are reloaded automatically |

### Memos

Memos render as Markdown (CommonMark with GitHub-flavored Markdown), including headings, emphasis, lists, links, quotes, code blocks, tables, strikethrough, and read-only task lists. Plain text keeps its line breaks. Links open in a new tab. Raw HTML is displayed as text, and unsafe URL schemes are blocked. Image references appear as links using their alt text instead of loading remote images automatically. Code blocks and wide tables scroll horizontally within the memo on small screens.

Editing shows the original Markdown source. Storage, keyword search, and JSON export/import continue to use that source without conversion.

### Folders

- The left pane includes a ステータス section with すべて, 未着手, 進行中, 保留, and 完了. Selecting a status filters the selected folder and its subfolders together with the tag and keyword filters. Counts show the totals in that folder before applying status, tag, and keyword filters. The main toolbar contains sorting, tag, and keyword controls; status selection is available only in the left pane. On narrow screens, open the pane with the menu button; selecting a status closes it.

- Folders can be nested to any depth. Each todo belongs to at most one folder; todos without a folder are 未分類 (unfiled).
- The folder list shows すべて (all), 未分類, and the folder tree, with the number of open (not 完了) todos next to each. A folder's count includes its subfolders.
- Selecting a folder shows the todos in that folder and all of its subfolders. Todos that are not directly in the selected folder show their folder path (for example `仕事 / 案件 A`). The status, tag, and keyword filters apply within the selected folder.
- The folder icon next to フォルダ creates a top-level folder. Each folder row has buttons to create a folder inside it, rename or move it (choose a new parent; a folder cannot be moved into itself or its subfolders), and delete it.
- The create/edit dialog offers eight named color presets (yellow, orange, red, pink, purple, blue, green, and gray). The selected preset is highlighted and can be chosen by keyboard. The chosen color appears on the folder icons in the tree and the heading. Each folder has its own color; colors are saved and exported with the folders. Old records and invalid colors use the default amber (`#f59e0b`).
- On wide screens a todo can be dragged from its header (title and grip) and dropped on a folder or 未分類 in the folder list to move it there. The header shows a grab cursor; the memo, status, tags, checkbox, and action buttons do not start a todo drag. While dragging, only a small label with the todo title follows below and to the right of the pointer, instead of the browser's default image of the whole card, so it does not cover the folder names. The row under the pointer is filled with a solid blue that stands out from the selected folder in both light and dark mode, and hovering over a collapsed folder for a moment opens it so its subfolders can be targeted. すべて is not a drop target. A message confirms the move. On narrow screens, use the folder field in the edit form instead.
- Deleting a folder also deletes its subfolders after a confirmation, and moves the todos in them to 未分類.
- Folders with children can be collapsed. Siblings are sorted by name.
- On wide screens the folder list fills the window height below the header and stays in place while the todo list scrolls; a long folder list scrolls inside it. The footer sits under the todo list.
- On wide screens the folder list can be resized by dragging its right edge (180–480 px, 240 px by default). The edge can also be focused and moved with ← / → (Shift for larger steps) and Home / End, and double-clicking it restores the default width.
- The selected folder, the collapsed folders, and the folder list width are restored after a reload. If the restored folder no longer exists, すべて is shown.
- On narrow screens, a menu button on the left side of the header opens a menu that slides in from the left over the task list. The menu contains status and folder navigation and closes when a status or folder is selected, the close button or backdrop is tapped, or Escape is pressed. While open, it keeps keyboard focus inside and prevents background interaction and scrolling.

### Sort order

| Sort | Order |
| --- | --- |
| 期限順 | Due date ascending (todos without a due date last), then priority, then newest first |
| 優先度順 | Priority (high → low), then due date, then newest first |
| ステータス順 | 進行中 → 未着手 → 保留 → 完了, then due date, then priority, then newest first |
| 新しい順 | Creation time, newest first |
| カスタム | User-defined order, including completed todos |

In カスタム, drag a task header onto the upper or lower half of another task to insert it before or after that task. A blue line marks the insertion point. Up/down buttons also reorder tasks on narrow screens and by keyboard. The order is shared across folders and filters; reordering a filtered list changes only the slots of its visible tasks, keeping hidden tasks in place. Before the first reorder, tasks appear newest first. New tasks are appended once a custom order has been established. The order is saved in IndexedDB and included in exports; the selected sort mode is restored from localStorage after a reload. Other sort modes retain their existing behavior.

### Due date display

Open todos whose due date is before today are marked 期限切れ in red, and todos due today are marked 今日 in orange. Dates are compared in the browser's local time zone.

## Screen layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: TODO                          [エクスポート] [インポート] │
├────────────────┬─────────────────────────────────────────────┤
│ すべて       5 │ 仕事 / 案件 A                               │
│ 未分類       2 │ Add form: [やること      ] [詳細] [追加]    │
│ フォルダ   [+] │ Filters: [並び順] [タグ]        │
│ ▾ 仕事       2 │ [キーワードで検索                         ] │
│   ▾ 案件 A   1 │ ┌─────────────────────────────────────────┐ │
│       資料   1 │ │ ☐ Title                        ✎  🗑    │ │
│     会議       │ │   [進行中▾] 優先度: 高  📁 仕事 / 案件 A │ │
│   家         1 │ └─────────────────────────────────────────┘ │
│                │                       [完了済みを削除 (n)]  │
├────────────────┴─────────────────────────────────────────────┤
│ Footer: note on local storage and backups                    │
│         © <year> wasabee.dev. All Rights Reserved.           │
└──────────────────────────────────────────────────────────────┘
```

On narrow screens, the menu button appears on the left side of the header and opens the sidebar as a drawer without moving the tasks. The header buttons show icons only. Folder rows show their buttons only on hover or focus on wide screens.

## Data model

```ts
interface Todo {
  customOrder: number | null; // Saved custom position; legacy records default to null
  id: string;                 // crypto.randomUUID()
  title: string;              // required, trimmed
  memo: string;
  status: 'todo' | 'in_progress' | 'on_hold' | 'done';
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;     // 'YYYY-MM-DD' in local time
  tags: string[];             // trimmed, unique
  folderId: string | null;    // null means 未分類
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
  completedAt: string | null; // ISO 8601, set only while status is 'done'
}
```

```ts
interface Folder {
  color: string;             // Icon color in #rrggbb format; defaults to #f59e0b
  id: string;                 // crypto.randomUUID()
  name: string;               // required, trimmed, up to 100 characters
  parentId: string | null;    // null means top level
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
}
```

Tags are entered as comma-separated text (ASCII `,` or Japanese `、` `，`).

## Export file format

```json
{
  "app": "todo",
  "version": 1,
  "exportedAt": "2026-10-10T03:00:00.000Z",
  "folders": [ /* Folder[] */ ],
  "todos": [ /* Todo[] */ ]
}
```

### Import rules

- Files that are not JSON, that do not have `"app": "todo"` and a `todos` array, or whose `version` is not `1` are rejected with an error message.
- A file without `folders` is read as having no folders.
- Todos without a non-empty `id` and `title`, folders without a non-empty `id` and `name`, and items with invalid `createdAt` / `updatedAt` are skipped. Invalid optional fields fall back to defaults (`priority: "medium"`, `dueDate: null`, and so on), and unknown fields are dropped.
- When the file contains the same `id` more than once, the item with the newest `updatedAt` is kept.
- Folders whose parent is missing or whose parents form a cycle are moved to the top level, and todos that point to a missing folder become 未分類.
- The confirmation dialog shows how many todos and folders will be imported and how many items were skipped.
- **Merge** adds the imported todos and folders to the current ones. When both have the same `id`, the one with the newer `updatedAt` wins.
- **Replace** deletes all current todos and folders and stores the imported ones in a single transaction.

## Data persistence

- Data is lost when the user clears site data for the app, uses a private window, or switches browsers or devices. The footer reminds users to export regularly.
- The sort mode, selected folder, collapsed folders, and folder list width are view preferences for this browser. They are kept in `localStorage` under `todo:view`, separately from the todo data, and are not exported. The app works without them when `localStorage` is unavailable.
- On startup the app calls `navigator.storage.persist()` to ask the browser not to evict the data under storage pressure. The app works the same when the request is denied.

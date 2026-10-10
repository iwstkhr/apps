# Specification

Specifications for a TODO management web app that keeps all data in the browser.

**Demo:** <https://todo.wasabee.dev/>

## Overview

- Client-only SPA with no server API and no server-side storage
- Todos are stored in the browser's IndexedDB and stay on the device
- JSON export and import are the only way to back up or move data between browsers and devices

## Features

| Feature | Description |
| --- | --- |
| Add | Enter a title and press Enter or 追加. 詳細 opens the memo, tags, due date, and priority fields |
| Edit | The pencil button turns an item into an edit form. Escape or キャンセル discards the changes |
| Status | Each todo has one of 未着手 (not started), 進行中 (in progress), 保留 (on hold), or 完了 (done). Change it with the status selector on the item. The checkbox is a shortcut: checking it sets 完了 and unchecking it returns to 未着手. New todos start as 未着手 |
| Delete | The trash button deletes one todo after a confirmation. 完了済みを削除 deletes all completed todos |
| Filter | Status (すべて / 未完了 (everything but 完了) / 未着手 / 進行中 / 保留 / 完了, each with a count), tag, and keyword (title, memo, and tags, case-insensitive) |
| Sort | 期限順 (default), 優先度順, ステータス順, 新しい順. Completed todos are always listed after the others |
| Export | Saves every todo to `todo-export-YYYYMMDD.json` |
| Import | Reads an exported file, then asks whether to merge it with or replace the current todos |
| Tab sync | Changes made in another tab of the same browser are reloaded automatically |

### Sort order

| Sort | Order |
| --- | --- |
| 期限順 | Due date ascending (todos without a due date last), then priority, then newest first |
| 優先度順 | Priority (high → low), then due date, then newest first |
| ステータス順 | 進行中 → 未着手 → 保留 → 完了, then due date, then priority, then newest first |
| 新しい順 | Creation time, newest first |

### Due date display

Open todos whose due date is before today are marked 期限切れ in red, and todos due today are marked 今日 in orange. Dates are compared in the browser's local time zone.

## Screen layout

```text
┌──────────────────────────────────────────────┐
│ Header: TODO  [エクスポート] [インポート] [GitHub] │
├──────────────────────────────────────────────┤
│ Add form: [やること          ] [詳細] [追加]  │
│   (memo / tags / due date / priority)        │
│ Filters: [ステータス] [並び順] [タグ]          │
│ [キーワードで検索                           ] │
│ ┌──────────────────────────────────────────┐ │
│ │ ☐ Title                        ✎  🗑     │ │
│ │   Memo                                   │ │
│ │   [進行中▾] 優先度: 高  期限: 10/10 (今日) │ │
│ └──────────────────────────────────────────┘ │
│                         [完了済みを削除 (n)] │
│ Footer: note on local storage and backups    │
└──────────────────────────────────────────────┘
```

On narrow screens the header buttons show icons only.

## Data model

```ts
interface Todo {
  id: string;                 // crypto.randomUUID()
  title: string;              // required, trimmed
  memo: string;
  status: 'todo' | 'in_progress' | 'on_hold' | 'done';
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;     // 'YYYY-MM-DD' in local time
  tags: string[];             // trimmed, unique
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
  completedAt: string | null; // ISO 8601, set only while status is 'done'
}
```

Tags are entered as comma-separated text (ASCII `,` or Japanese `、` `，`).

## Export file format

```json
{
  "app": "todo",
  "version": 1,
  "exportedAt": "2026-10-10T03:00:00.000Z",
  "todos": [ /* Todo[] */ ]
}
```

### Import rules

- Files that are not JSON, that do not have `"app": "todo"` and a `todos` array, or whose `version` is not `1` are rejected with an error message.
- Items without a non-empty `id` and `title` or with invalid `createdAt` / `updatedAt` are skipped. Invalid optional fields fall back to defaults (`priority: "medium"`, `dueDate: null`, and so on), and unknown fields are dropped.
- When the file contains the same `id` more than once, the item with the newest `updatedAt` is kept.
- The confirmation dialog shows how many todos will be imported and how many were skipped.
- **Merge** adds the imported todos to the current ones. When both have the same `id`, the one with the newer `updatedAt` wins.
- **Replace** deletes all current todos and stores the imported ones in a single transaction.

## Data persistence

- Data is lost when the user clears site data for the app, uses a private window, or switches browsers or devices. The footer reminds users to export regularly.
- On startup the app calls `navigator.storage.persist()` to ask the browser not to evict the data under storage pressure. The app works the same when the request is denied.

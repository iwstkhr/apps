# Specification

Specifications for a TODO management web app that keeps all data in the browser.

**Demo:** <https://todo.wasabee.dev/>

## Overview

- Client-only SPA with no server API and no server-side storage
- Todos and folders are stored in the browser's IndexedDB and stay on the device
- JSON export and import are the only way to back up or move data between browsers and devices
- On the first visit, sample todos and folders are added so the features can be seen right away (see [Sample data](#sample-data))

## Features

| Feature | Description |
| --- | --- |
| Add | Enter a title and press Enter or + 追加. 詳細 opens the memo, tags, due date, repeat, priority, and folder fields. New todos go into the folder selected in the folder list. So that the add form is not mistaken for search, its title field has a + mark and the placeholder 新しいタスクを入力…, while the keyword search below has a magnifier. 追加 always shows as the primary button; pressing it with an empty title adds nothing and moves focus to the title field |
| Edit | The pencil button turns an item into an edit form, where the todo can also be moved to another folder. Escape or キャンセル discards the changes |
| Status | Each todo has one of 未着手 (not started), 進行中 (in progress), 保留 (on hold), or 完了 (done). Change it with the status selector on the item. The checkbox is a shortcut: checking it sets 完了 and unchecking it returns to 未着手. New todos start as 未着手 |
| Delete | The trash button moves one todo to the trash without asking, and 完了済みをゴミ箱に移動 moves all completed todos in the current view there. A notice with 元に戻す (undo) appears; see [Trash](#trash) |
| Repeat | See [Repeat](#repeat) |
| Folders | See [Folders](#folders) |
| Filter | Status (すべて / 未着手 / 進行中 / 保留 / 完了, each with a count), tag, and keyword (title, memo, and tags, case-insensitive). The keyword field, 並び順, and タグ sit on one row and wrap on narrow screens; 並び順 and タグ show visible captions. While a tag is selected its selector is highlighted and an × button next to it clears the tag filter. The タグ selector is hidden while no todo has tags. In the status control each status has an icon with its own shape and color: すべて a stack in the text color, 未着手 an empty gray circle, 進行中 a blue play icon, 保留 a purple pause icon, and 完了 a green check. The colors stay the same in every theme and keep at least 3:1 contrast against white and dark mode |
| Sort | 新しい順 (default), 期限順, 優先度順, ステータス順, カスタム. Chosen from the 並び順 selector. Completed todos are listed after the others except in カスタム |
| Header menu | See [Header menu](#header-menu) |
| Export | Saves every todo and folder to `todo-export-YYYYMMDD.json` |
| Import | Reads an exported file, then asks whether to merge it with or replace the current todos and folders |
| Tab sync | Changes made in another tab of the same browser are reloaded automatically |
| Install and offline | See [Install and offline use](#install-and-offline-use) |

### Tags

In the task list, a task's tags appear on their own row right under its title, above the memo and the status, priority, and due date row. Tasks without tags have no tag row.

Click a tag name in the task list to filter by it. The タグ selector in the toolbar then shows the tag highlighted, with an × button to clear the filter. The adjacent × button removes only that tag from that task and saves immediately; it does not activate the tag filter. Other tasks with the same tag are unchanged. If a removed tag no longer matches the current filter, the task leaves the filtered list.

In the add and edit forms, the タグ field shows the selected tags as chips, each with an × button to remove it. Focusing or typing in the field lists the existing tags that are not selected yet, narrowed by the typed text; picking one adds it and keeps the list open so more tags can be picked in a row. ↑ and ↓ move through the list, Enter picks the highlighted tag, Escape closes the list (a second Escape cancels editing), and Backspace in the empty field removes the last chip. Text that is not an existing tag becomes a new tag with Enter or a comma (`,`, `、`, or `，`); text left in the field is also saved as a tag.

### Priority

Change priority (高 / 中 / 低) directly with the selector on each task in the list, or in the edit form. Changes are saved immediately and reflected in priority-based sorting, without altering the task status or other fields.

### Color themes

テーマ… in the header menu opens a dialog titled テーマ with six presets: インディゴ, オーベルジーヌ, オーシャン, ミント, サンセット, and グラファイト. インディゴ is the default; it keeps the header and sidebar white and uses an indigo accent, and it also applies before the saved theme is restored so the accent does not flash a different color on load. Inspired by Slack, the other presets use a shared dark color for the header and sidebar, with bright text and a distinct selected row, while the main content retains neutral backgrounds, text, and borders for readability. Buttons, links, focus indicators, and selected rows use shades of the same subdued accent hue, including Markdown links. The header logo follows the theme. The 表示モード controls offer ライト, ダーク, and 自動. Light and dark override the OS preference; 自動 (the default) follows OS changes immediately. Folder icon colors and semantic warning, priority, and completed-status colors remain distinct.

The selection is stored separately in localStorage (`todo:theme`) and restored after a reload. Missing, invalid, or inaccessible preferences, including presets that no longer exist, use インディゴ; if storage is unavailable, themes can still be selected for the current session. Display mode is saved separately as `todo:appearance`; missing or invalid values fall back to 自動. Theme and mode settings are not included in task exports. The dialog supports radio-button keyboard navigation, Escape, a close button, and clicking the backdrop, and returns focus to the header button when closed.

### Header menu

Next to the TODO title, a lock icon and ブラウザで完結 ("Runs entirely in your browser") state the app's main trait at widths of 640px and above. The browser tab shows the same phrase as `TODO | ブラウザで完結` (`TODO | Runs entirely in your browser` in English), following the selected language. It is not part of the page heading, and narrower screens leave it to the footer note to keep room for the ☰ and メニュー buttons. On the dark headers of non-default themes it is a translucent white that keeps at least 4.5:1 contrast.

The メニュー button at the right of the header (⋯ followed by the text メニュー at widths of 1024px and above; only ⋯ on narrower screens, where its accessible name is still メニュー) opens a menu with, from top to bottom: 言語 (English and 日本語, in that order, with a check mark on the current language), テーマ…, エクスポート, and インポート. These are occasional actions, so they share one button and keep the header uncluttered on narrow screens; the ☰ button on the left stays reserved for the folder navigation and is named for it (フォルダを開く), so the two buttons are never both called メニュー. Choosing an item closes the menu and runs it: a language applies immediately, テーマ… opens the theme dialog, エクスポート downloads the file, and インポート opens the file picker. エクスポート is shown but unavailable while there are no todos and no folders.

The menu follows the WAI-ARIA menu pattern: the button announces the popup and its state, opening it (by click, Enter, Space, ↓, or ↑) focuses the first item, ↑ / ↓ move between items and wrap around, Home and End jump to the first and last item, and Escape closes the menu and returns focus to the button. Tab or a click outside closes it as well. The menu fits within narrow screens.

### Install and offline use

The app is a PWA. Browsers that support installation offer to add it to the home screen or desktop, where it opens in its own window named TODO with the check-mark icon. The window title bar is white, or dark slate in dark mode, to match the default header.

After the first visit, the app opens without a network connection. All the files of the app are stored in the browser when it is first opened, and the todos are already in IndexedDB, so every feature works offline. When online, opening the app always loads the latest version; a newly deployed version replaces the stored files in the background and is used from the next time the app is opened, without reloading open tabs.

### Language

The UI is available in English and Japanese. Choosing 日本語 or English in the header menu switches the whole screen immediately, including button labels, accessible names, confirmations, notifications, and import errors. Language names are always shown in their own language.

Until a language is chosen, the app uses the first of Japanese or English found in the browser's preferred languages (`navigator.languages`, falling back to `navigator.language`); browsers that prefer neither use English. The choice is stored in localStorage (`todo:language`) and wins over the browser language after a reload; if storage is unavailable, the choice lasts for the current page. Changing the language in another tab is applied here too. The `lang` attribute of the page and its description follow the selected language.

Content entered by the user (todo titles, memos, tags, and folder names) is never translated. Dates keep the `YYYY/MM/DD` format in both languages. The language setting is not included in task exports.

### Memos

Memos render as Markdown (CommonMark with GitHub-flavored Markdown), including headings, emphasis, lists, links, quotes, code blocks, tables, strikethrough, and read-only task lists. Plain text keeps its line breaks. Links open in a new tab. Raw HTML is displayed as text, and unsafe URL schemes are blocked. Image references appear as links using their alt text instead of loading remote images automatically. Code blocks and wide tables scroll horizontally within the memo on small screens.

Editing shows the original Markdown source. Storage, keyword search, and JSON export/import continue to use that source without conversion.

### Trash

- Deleting a todo moves it to the trash instead of removing it. No confirmation is shown; instead the notice that confirms the move has a 元に戻す button that restores the todo (or all the completed todos moved together). The notice sticks below the header so the button stays visible after deleting a todo further down the list.
- A todo can also be dragged onto ゴミ箱 in the folder list.
- ゴミ箱 is shown below the folders in the left pane with the number of todos in it. Selecting it shows the trashed todos, newest first, with their original folder (or 未分類) and how many days remain before they are deleted automatically. The add form, status tabs, and toolbar are not shown there.
- Each trashed todo has 元に戻す, which returns it to its original folder with its status and other fields unchanged, and 完全に削除, which deletes it forever after a confirmation. ゴミ箱を空にする deletes all trashed todos forever after a confirmation. The same ゴミ箱を空にする button also appears on the ゴミ箱 row in the left pane while the trash has todos (on wide screens only on hover or focus), so the trash can be emptied without opening it.
- Confirmations use a dialog inside the app instead of the browser's `confirm()`, so they follow the theme and dark mode. The question is the dialog heading, with details such as この操作は元に戻せません。 below it. キャンセル comes first and has the focus when the dialog opens, so pressing Enter by accident cancels; the red button on the right (削除, 完全に削除, or 空にする) carries out the action. Escape also cancels, and focus returns to the button that opened the dialog.
- Todos that have been in the trash for 30 days are deleted forever the next time the app is opened.
- Trashed todos are excluded from the other views, counts, and tag lists. They are included in exports with `deletedAt`, so importing restores them to the trash. Deleting a folder moves its trashed todos to 未分類 as well, so restoring them later does not point to a missing folder.

### Repeat

A todo can repeat 毎日 (daily), 平日 (weekdays, Monday to Friday), 毎週 (weekly), 毎月 (monthly), or 毎年 (yearly), chosen from 繰り返し in the add and edit forms. Repeating todos show a badge with a circular arrow and the repeat, such as 毎週.

- A repeat counts from the due date. If none is set, the due date becomes today, and the form says so while the due date is empty.
- Completing a repeating todo, with its checkbox or its status selector, keeps it as 完了 and adds the next one as a new 未着手 todo with the same title, memo, priority, tags, and folder. The repeat moves to the new todo, so reopening and completing the old one again does not add another. A notice shows the new due date, and its 元に戻す removes the new todo and restores the old one.
- The next due date is counted from the previous due date, not from the day it was completed: 毎日 adds a day, 平日 moves to the next weekday, 毎週 adds seven days, and 毎月 and 毎年 keep the day of the month. A day that does not exist in a month, such as the 31st or February 29, falls on the last day of that month, and later months return to the original day. When the next date is still before today, it keeps advancing until it is today or later, so the new todo does not start overdue.
- Editing the due date of a repeating todo also changes the day that 毎月 and 毎年 keep.
- Importing data never adds next occurrences.

### Folders

- A ステータス segmented control directly above the task list, below the toolbar, offers すべて, 未着手, 進行中, 保留, and 完了, each with its icon and a count badge. The options sit in a bordered gray track and the selected one is raised in white with an accent outline, so the control stands out from plain text. Selecting a status filters the selected folder and its subfolders together with the tag and keyword filters. Counts show the totals in that folder before applying status, tag, and keyword filters. Status is a filter on the current list rather than a place, so it sits in the main area right above the list it switches, apart from the add form, instead of in the left pane, and on narrow screens it can be chosen without opening the drawer. When the tabs do not fit, the row scrolls sideways instead of wrapping. The side with hidden tabs fades out and shows an arrow (‹ or ›), so it is clear the row can be scrolled that way.

- Folders can be nested to any depth. Each todo belongs to at most one folder; todos without a folder are 未分類 (unfiled).
- The folder list shows, under the フォルダ heading, すべて (all), 未分類, and then the folder tree, with the number of open (not 完了) todos next to each. すべて and 未分類 are not folders, but they sit at the top of the same list because they also choose which folder to show, so the status list's own すべて is not confused with them; their icons line up with the top-level folder icons. A folder's count includes its subfolders.
- Selecting a folder shows the todos in that folder and all of its subfolders. Todos that are not directly in the selected folder show their folder path (for example `仕事 / 案件 A`). The status, tag, and keyword filters apply within the selected folder.
- The folder icon next to フォルダ creates a top-level folder. Each folder row has buttons to create a folder inside it, rename or move it (choose a new parent; a folder cannot be moved into itself or its subfolders), and delete it.
- When a folder is selected, a pencil button next to its name in the main area heading opens the same edit dialog as the folder row's edit button, so the folder can be renamed, recolored, or moved without finding it in the folder list. すべて and 未分類 have no such button because they are not folders.
- The create/edit dialog offers eight named color presets (yellow, orange, red, pink, purple, blue, green, and gray). The selected preset is highlighted and can be chosen by keyboard. The chosen color appears on the folder icons in the tree and the heading. Each folder has its own color; colors are saved and exported with the folders. Old records and invalid colors use the default amber (`#f59e0b`).
- On wide screens a todo can be dragged from its header (title and grip) and dropped on a folder or 未分類 in the folder list to move it there. The header shows a grab cursor; the memo, status, tags, checkbox, and action buttons do not start a todo drag. While dragging, only a small label with the todo title follows below and to the right of the pointer, instead of the browser's default image of the whole card, so it does not cover the folder names. The row under the pointer is filled with a solid blue that stands out from the selected folder in both light and dark mode, and hovering over a collapsed folder for a moment opens it so its subfolders can be targeted. すべて is not a drop target. A message confirms the move; its close button dismisses the notification without changing the task. On narrow screens, use the folder field in the edit form instead.
- Deleting a folder also deletes its subfolders after a confirmation, and moves the todos in them to 未分類. The confirmation states how many subfolders will be deleted and how many todos will move to 未分類.
- Folders with children can be collapsed. Siblings are sorted by name.
- On wide screens the folder list fills the window height below the header and stays in place while the todo list scrolls; a long folder list scrolls inside it. The footer sits under the todo list.
- On wide screens the folder list can be resized by dragging its right edge (180–480 px, 240 px by default). The edge can also be focused and moved with ← / → (Shift for larger steps) and Home / End, and double-clicking it restores the default width.
- The selected folder, the collapsed folders, and the folder list width are restored after a reload. If the restored folder no longer exists, すべて is shown.
- On narrow screens, the ☰ button (フォルダを開く) on the left side of the header opens a panel titled フォルダ that slides in from the left over the task list. The panel contains the folder navigation and the trash, and closes when one of them is selected, the close button or backdrop is tapped, or Escape is pressed. While open, it keeps keyboard focus inside and prevents background interaction and scrolling.

### Sort order

| Sort | Order |
| --- | --- |
| 新しい順 | Creation time, newest first |
| 期限順 | Due date ascending (todos without a due date last), then priority, then newest first |
| 優先度順 | Priority (high → low), then due date, then newest first |
| ステータス順 | 未着手 → 進行中 → 保留 → 完了 (logical ascending order), then due date, then priority, then newest first |
| カスタム | User-defined order, including completed todos |

In カスタム, drag a task header onto the upper or lower half of another task to insert it before or after that task. A blue line marks the insertion point. Up/down buttons also reorder tasks on narrow screens and by keyboard. The order is shared across folders and filters; reordering a filtered list changes only the slots of its visible tasks, keeping hidden tasks in place. Before the first reorder, tasks appear newest first. New tasks are appended once a custom order has been established. The order is saved in IndexedDB and included in exports; the selected sort mode is restored from localStorage after a reload. Other sort modes retain their existing behavior.

### Due date display

Open todos whose due date is before today are marked 期限切れ in red, and todos due today are marked 今日 in orange. Dates are compared in the browser's local time zone.

## Screen layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: TODO │ 🔒 ブラウザで完結                [⋯ メニュー] │
├────────────────┬─────────────────────────────────────────────┤
│ フォルダ   [+] │ 仕事 / 案件 A                               │
│   すべて     5 │ Add form: [+ 新しいタスク ] [詳細] [+ 追加] │
│   未分類     2 │ [🔍 キーワード]並び順[新しい順▾] タグ[#家▾]×│
│ ▾ 仕事       2 │ すべて 5 | 未着手 2 | 進行中 1 | 保留 1 | … │
│   ▾ 案件 A   1 │ ┌─────────────────────────────────────────┐ │
│       資料   1 │ │ ☐ Title                        ✎  🗑    │ │
│     会議       │ │   [進行中▾] 優先度: 高  📁 仕事 / 案件 A │ │
│   家         1 │ └─────────────────────────────────────────┘ │
│                │                                             │
│ ゴミ箱         │                       [完了済みを削除 (n)]  │
├────────────────┴─────────────────────────────────────────────┤
│ Footer: note on local storage and backups                    │
│         © <year> wasabee.dev. All Rights Reserved.           │
└──────────────────────────────────────────────────────────────┘
```

On narrow screens, the ☰ button appears on the left side of the header and opens the sidebar as a drawer without moving the tasks, and the メニュー button shows only ⋯. Folder rows show their buttons only on hover or focus on wide screens.

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
  deletedAt: string | null;   // ISO 8601 when moved to the trash; null otherwise (missing in older data)
  repeat: {                   // null when the todo does not repeat (missing in older data)
    frequency: 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
    anchorDay: number;        // 1-31, the day of the month that monthly and yearly repeats keep
  } | null;
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

## Sample data

When the app creates its IndexedDB database for the first time, it adds a few samples: the folders 仕事 (with the subfolder 資料作成) and 暮らし (Work, Slide deck, and Home in English), and six todos. Together they cover every status, overdue, due-today, and upcoming due dates, a weekly repeat, tags, and Markdown memos (a numbered list and a task list). The todo TODO へようこそ explains in its memo that data stays in this browser, how to back it up with export, and how to move a todo by dragging it. Due dates are counted from the day of the first visit, so the samples never all appear overdue.

- The samples are written in the language in use on the first visit. Like other user content, they are not translated when the language changes later.
- The samples are ordinary todos and folders: they can be edited, deleted, and exported like any others.
- They are added only when the database is created, so they do not come back after they are deleted, and browsers that already have data never get them. Clearing the site data starts over with the samples.

## Data persistence

- Data is lost when the user clears site data for the app, uses a private window, or switches browsers or devices. The footer reminds users to export regularly.
- The sort mode, selected folder, collapsed folders, and folder list width are view preferences for this browser. They are kept in `localStorage` under `todo:view`, separately from the todo data, and are not exported. The app works without them when `localStorage` is unavailable.
- On startup the app calls `navigator.storage.persist()` to ask the browser not to evict the data under storage pressure. The app works the same when the request is denied.

import { sanitizeFolders, sanitizeTodoFolders } from '~/lib/folder-tree';
import { t } from '~/lib/i18n';
import type { StoredData } from '~/lib/todo-db';
import { type Folder, toFolder } from '~/types/folder';
import { type Todo, toLocalDateString, toTodo } from '~/types/todo';

export const EXPORT_APP = 'todo';
export const EXPORT_VERSION = 1;

export interface TodoExport {
  app: typeof EXPORT_APP;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  folders: Folder[];
  todos: Todo[];
}

export function createExport({ todos, folders }: StoredData, now: Date = new Date()): TodoExport {
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    folders: [...folders],
    todos: [...todos],
  };
}

export function exportFileName(now: Date = new Date()): string {
  return `todo-export-${toLocalDateString(now).replaceAll('-', '')}.json`;
}

/** JSON をファイルとして保存させる。 */
export function downloadExport(data: StoredData, now: Date = new Date()): void {
  const json = JSON.stringify(createExport(data, now), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(now);
  document.body.append(link);
  link.click();
  link.remove();
  // クリック直後に解放するとダウンロードが始まらないブラウザがあるので少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class ImportError extends Error {
  override name = 'ImportError';
}

export interface ParsedImport extends StoredData {
  /** 形式が正しくない・重複していて読み飛ばした件数 (TODO とフォルダの合計) */
  skipped: number;
}

/** id が重複していたら更新日時が新しい方を残す。 */
function dedupe<T extends { id: string; updatedAt: string }>(
  items: readonly unknown[],
  convert: (value: unknown) => T | null,
): { items: T[]; skipped: number } {
  const byId = new Map<string, T>();
  let skipped = 0;
  for (const value of items) {
    const item = convert(value);
    if (item === null) {
      skipped++;
      continue;
    }
    const existing = byId.get(item.id);
    if (existing) skipped++;
    if (!existing || existing.updatedAt < item.updatedAt) byId.set(item.id, item);
  }
  return { items: [...byId.values()], skipped };
}

/** 親の無いフォルダや存在しないフォルダを指す TODO を直す。 */
export function sanitizeData({ todos, folders }: StoredData): StoredData {
  const fixedFolders = sanitizeFolders(folders);
  return { folders: fixedFolders, todos: sanitizeTodoFolders(todos, fixedFolders) };
}

/** エクスポートしたファイルの中身 (文字列) を検証して TODO とフォルダを取り出す。 */
export function parseImport(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError(t('JSON として読み込めませんでした。'));
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ImportError(t('このアプリでエクスポートしたファイルではありません。'));
  }
  const record = data as Record<string, unknown>;
  if (record.app !== EXPORT_APP || !Array.isArray(record.todos)) {
    throw new ImportError(t('このアプリでエクスポートしたファイルではありません。'));
  }
  if (record.version !== EXPORT_VERSION) {
    throw new ImportError(
      t('対応していない形式のバージョンです ({0})。', [String(record.version)]),
    );
  }

  const todos = dedupe(record.todos, toTodo);
  const folders = dedupe(Array.isArray(record.folders) ? record.folders : [], toFolder);
  return {
    ...sanitizeData({ todos: todos.items, folders: folders.items }),
    skipped: todos.skipped + folders.skipped,
  };
}

function mergeById<T extends { id: string; updatedAt: string }>(
  current: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    const existing = byId.get(item.id);
    if (!existing || Date.parse(item.updatedAt) > Date.parse(existing.updatedAt)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

/** 今のデータにインポートしたデータを合わせる。id が同じものは更新日時が新しい方を採る。 */
export function mergeData(current: StoredData, incoming: StoredData): StoredData {
  return sanitizeData({
    todos: mergeById(current.todos, incoming.todos),
    folders: mergeById(current.folders, incoming.folders),
  });
}

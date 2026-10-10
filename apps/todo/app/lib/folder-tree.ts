import type { Folder } from '~/types/folder';
import type { Todo } from '~/types/todo';

/**
 * 一覧で選んでいるフォルダ。'all' はすべて、'unfiled' はどのフォルダにも入っていない TODO、
 * 'trash' はゴミ箱 (ゴミ箱の中身は filterByFolder ではなく画面側で出す)。
 */
export type FolderSelection = 'all' | 'unfiled' | 'trash' | string;

export interface FolderTreeEntry {
  folder: Folder;
  depth: number;
  hasChildren: boolean;
}

const byName = (a: Folder, b: Folder) =>
  a.name.localeCompare(b.name, 'ja') || a.id.localeCompare(b.id);

function childrenMap(folders: readonly Folder[]): Map<string | null, Folder[]> {
  const map = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const siblings = map.get(folder.parentId) ?? [];
    siblings.push(folder);
    map.set(folder.parentId, siblings);
  }
  for (const siblings of map.values()) siblings.sort(byName);
  return map;
}

/**
 * フォルダを木の順 (親の直後に子、兄弟は名前順) に並べる。
 * collapsed に入っているフォルダの子孫は出さない。
 */
export function flattenFolderTree(
  folders: readonly Folder[],
  collapsed: ReadonlySet<string> = new Set(),
): FolderTreeEntry[] {
  const children = childrenMap(folders);
  const result: FolderTreeEntry[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const folder of children.get(parentId) ?? []) {
      const hasChildren = (children.get(folder.id)?.length ?? 0) > 0;
      result.push({ folder, depth, hasChildren });
      if (!collapsed.has(folder.id)) visit(folder.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

/** 指定したフォルダとその子孫すべての id。 */
export function getSubtreeIds(folders: readonly Folder[], id: string): Set<string> {
  const children = childrenMap(folders);
  const ids = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (ids.has(current)) continue;
    ids.add(current);
    for (const child of children.get(current) ?? []) stack.push(child.id);
  }
  return ids;
}

/** 最上位から指定したフォルダまでの道のり。見つからなければ空。 */
export function getFolderPath(folders: readonly Folder[], id: string | null): Folder[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: Folder[] = [];
  const seen = new Set<string>();
  let current = id === null ? undefined : byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return path;
}

export function formatFolderPath(folders: readonly Folder[], id: string | null): string {
  return getFolderPath(folders, id)
    .map((folder) => folder.name)
    .join(' / ');
}

/** folder を newParentId の下へ動かすと、自分自身や子孫の下に入ってしまうか。 */
export function wouldCreateCycle(
  folders: readonly Folder[],
  folderId: string,
  newParentId: string | null,
): boolean {
  return newParentId !== null && getSubtreeIds(folders, folderId).has(newParentId);
}

/**
 * 親が存在しないフォルダや、親をたどると輪になるフォルダを最上位に置き直す。
 * インポートしたデータを信用しないため。
 */
export function sanitizeFolders(folders: readonly Folder[]): Folder[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const fixed = new Map<string, Folder>();
  for (const folder of folders) {
    let parentId = folder.parentId;
    if (parentId !== null) {
      const seen = new Set([folder.id]);
      let current = byId.get(parentId);
      while (current && current.parentId !== null && !seen.has(current.id)) {
        seen.add(current.id);
        current = byId.get(current.parentId);
      }
      // 親が無い、またはたどった先で自分に戻ってくる
      const broken = !byId.has(parentId) || (current !== undefined && seen.has(current.id));
      if (broken) parentId = null;
    }
    fixed.set(folder.id, parentId === folder.parentId ? folder : { ...folder, parentId });
  }
  return [...fixed.values()];
}

/** 存在しないフォルダを指している TODO を未分類に戻す。 */
export function sanitizeTodoFolders(todos: readonly Todo[], folders: readonly Folder[]): Todo[] {
  const ids = new Set(folders.map((folder) => folder.id));
  return todos.map((todo) =>
    todo.folderId !== null && !ids.has(todo.folderId) ? { ...todo, folderId: null } : todo,
  );
}

/** 選んでいるフォルダ (子孫を含む) に入っている TODO だけにする。 */
export function filterByFolder(
  todos: readonly Todo[],
  folders: readonly Folder[],
  selection: FolderSelection,
): Todo[] {
  if (selection === 'all') return [...todos];
  if (selection === 'trash') return [];
  if (selection === 'unfiled') return todos.filter((todo) => todo.folderId === null);
  const ids = getSubtreeIds(folders, selection);
  return todos.filter((todo) => todo.folderId !== null && ids.has(todo.folderId));
}

/** フォルダごと (子孫を含む) の未完了の TODO の件数。'unfiled' と 'all' も入れる。 */
export function countOpenByFolder(
  todos: readonly Todo[],
  folders: readonly Folder[],
): Map<FolderSelection, number> {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const counts = new Map<FolderSelection, number>([
    ['all', 0],
    ['unfiled', 0],
  ]);
  for (const folder of folders) counts.set(folder.id, 0);
  for (const todo of todos) {
    if (todo.status === 'done') continue;
    counts.set('all', (counts.get('all') ?? 0) + 1);
    if (todo.folderId === null || !byId.has(todo.folderId)) {
      counts.set('unfiled', (counts.get('unfiled') ?? 0) + 1);
      continue;
    }
    for (const folder of getFolderPath(folders, todo.folderId)) {
      counts.set(folder.id, (counts.get(folder.id) ?? 0) + 1);
    }
  }
  return counts;
}

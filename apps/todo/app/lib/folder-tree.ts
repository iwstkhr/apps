import type { DropPosition } from '~/lib/todo-order';
import type { Folder } from '~/types/folder';
import type { Todo } from '~/types/todo';

/**
 * The folder selected in the list. 'all' is everything, 'unfiled' is todos in no folder,
 * and 'trash' is the trash (its contents are shown by the UI, not by filterByFolder).
 */
export type FolderSelection = 'all' | 'unfiled' | 'trash' | string;

export interface FolderTreeEntry {
  folder: Folder;
  depth: number;
  hasChildren: boolean;
}

/** Where a dragged folder goes relative to the target: next to it ('before' / 'after') or into it ('inside'). */
export type FolderDropPosition = DropPosition | 'inside';

/** Siblings in the order set by drag and drop. Those without an order come after, by name. */
export function compareFolders(a: Folder, b: Folder): number {
  const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
  return aOrder - bOrder || a.name.localeCompare(b.name, 'ja') || a.id.localeCompare(b.id);
}

function childrenMap(folders: readonly Folder[]): Map<string | null, Folder[]> {
  const map = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const siblings = map.get(folder.parentId) ?? [];
    siblings.push(folder);
    map.set(folder.parentId, siblings);
  }
  for (const siblings of map.values()) siblings.sort(compareFolders);
  return map;
}

/**
 * Order folders as a tree (children right after their parent, siblings by name).
 * Descendants of folders in collapsed are omitted.
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

/** The ids of the given folder and all its descendants. */
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

/** The path from the top level to the given folder. Empty if not found. */
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

/** Whether moving folder under newParentId would put it under itself or a descendant. */
export function wouldCreateCycle(
  folders: readonly Folder[],
  folderId: string,
  newParentId: string | null,
): boolean {
  return newParentId !== null && getSubtreeIds(folders, folderId).has(newParentId);
}

/**
 * Move a folder next to the target folder or into it. A null targetId moves it to the end of the top level.
 * The siblings at the destination are numbered again from 0, and only folders whose parent or order changed are rewritten.
 * Moves under itself or a descendant are ignored.
 */
export function moveFolder(
  folders: readonly Folder[],
  movedId: string,
  targetId: string | null,
  position: FolderDropPosition,
  now: Date = new Date(),
): Folder[] {
  const moved = folders.find((folder) => folder.id === movedId);
  const target = targetId === null ? null : folders.find((folder) => folder.id === targetId);
  if (!moved || target === undefined || targetId === movedId) return [...folders];
  const parentId = target === null ? null : position === 'inside' ? target.id : target.parentId;
  if (wouldCreateCycle(folders, movedId, parentId)) return [...folders];

  const siblings = folders
    .filter((folder) => folder.parentId === parentId && folder.id !== movedId)
    .sort(compareFolders);
  const index =
    target === null || position === 'inside'
      ? siblings.length
      : siblings.indexOf(target) + Number(position === 'after');
  siblings.splice(index, 0, moved);

  const orders = new Map(siblings.map((folder, order) => [folder.id, order]));
  const updatedAt = now.toISOString();
  return folders.map((folder) => {
    const order = orders.get(folder.id);
    if (order === undefined) return folder;
    const nextParentId = folder.id === movedId ? parentId : folder.parentId;
    return folder.order === order && folder.parentId === nextParentId
      ? folder
      : { ...folder, parentId: nextParentId, order, updatedAt };
  });
}

/**
 * Move folders whose parent is missing, or whose parent chain forms a cycle, to the top level.
 * Imported data is not trusted.
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
      // The parent is missing, or following the chain leads back to itself
      const broken = !byId.has(parentId) || (current !== undefined && seen.has(current.id));
      if (broken) parentId = null;
    }
    fixed.set(folder.id, parentId === folder.parentId ? folder : { ...folder, parentId });
  }
  return [...fixed.values()];
}

/** Return todos that point to missing folders to 未分類. */
export function sanitizeTodoFolders(todos: readonly Todo[], folders: readonly Folder[]): Todo[] {
  const ids = new Set(folders.map((folder) => folder.id));
  return todos.map((todo) =>
    todo.folderId !== null && !ids.has(todo.folderId) ? { ...todo, folderId: null } : todo,
  );
}

/** Keep only todos in the selected folder (including descendants). */
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

/** Number of incomplete todos per folder (including descendants). Also includes 'unfiled' and 'all'. */
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
    // Count by walking up the parents (getFolderPath is not used because it builds a Map on every call)
    const seen = new Set<string>();
    for (
      let folder = byId.get(todo.folderId);
      folder && !seen.has(folder.id);
      folder = folder.parentId === null ? undefined : byId.get(folder.parentId)
    ) {
      seen.add(folder.id);
      counts.set(folder.id, (counts.get(folder.id) ?? 0) + 1);
    }
  }
  return counts;
}

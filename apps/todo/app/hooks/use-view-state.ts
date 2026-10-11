import { useCallback, useEffect, useRef, useState } from 'react';
import type { FolderSelection } from '~/lib/folder-tree';
import { DEFAULT_FILTERS, type SortKey } from '~/lib/todo-filters';

// View state (folder, collapsed folders, pane width, sort order) is a per-device preference, so it is stored apart from the todo data
export const VIEW_STATE_KEY = 'todo:view';

/** Width of the folder pane (px). Used only on wide screens */
export const SIDEBAR_WIDTH = { min: 180, max: 480, default: 240 } as const;

export function clampSidebarWidth(width: number): number {
  return Math.round(Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, width)));
}

/** Delay before saving the view state (ms) */
const SAVE_DELAY_MS = 200;

export interface ViewState {
  folder: FolderSelection;
  collapsed: string[];
  sidebarWidth: number;
  sort?: SortKey;
}

/** Read the saved view state. null when missing, corrupted, or unreadable (e.g. private mode). */
export function readViewState(): ViewState | null {
  try {
    const raw = localStorage.getItem(VIEW_STATE_KEY);
    if (raw === null) return null;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    const { folder, collapsed, sidebarWidth, sort } = data as Record<string, unknown>;
    return {
      folder: typeof folder === 'string' && folder !== '' ? folder : 'all',
      collapsed: Array.isArray(collapsed)
        ? collapsed.filter((id): id is string => typeof id === 'string')
        : [],
      sidebarWidth:
        typeof sidebarWidth === 'number' && Number.isFinite(sidebarWidth)
          ? clampSidebarWidth(sidebarWidth)
          : SIDEBAR_WIDTH.default,
      sort:
        sort === 'due' ||
        sort === 'priority' ||
        sort === 'status' ||
        sort === 'created' ||
        sort === 'custom'
          ? sort
          : DEFAULT_FILTERS.sort,
    };
  } catch {
    return null;
  }
}

export function writeViewState(state: ViewState): void {
  try {
    localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(state));
  } catch {
    // The UI keeps working even when saving fails
  }
}

/**
 * Remember the selected folder, collapsed folders, folder pane width, and sort order in localStorage.
 * If it points to a deleted folder, the UI treats it as 「すべて」.
 */
export function useViewState() {
  const [selectedFolder, setSelectedFolder] = useState<FolderSelection>('all');
  const [collapsedFolders, setCollapsedFolders] = useState<ReadonlySet<string>>(new Set());
  const [sidebarWidth, setSidebarWidthState] = useState<number>(SIDEBAR_WIDTH.default);
  const [sort, setSort] = useState<SortKey>(DEFAULT_FILTERS.sort);
  const [restored, setRestored] = useState(false);

  // Read after rendering so the result does not conflict with the HTML generated at build time
  useEffect(() => {
    const saved = readViewState();
    if (saved) {
      setSelectedFolder(saved.folder);
      setCollapsedFolders(new Set(saved.collapsed));
      setSidebarWidthState(saved.sidebarWidth);
      setSort(saved.sort ?? DEFAULT_FILTERS.sort);
    }
    setRestored(true);
  }, []);

  // The value changes many times while dragging the width, so save in one go after changes settle.
  // Do not overwrite with the initial value before reading
  const pending = useRef<ViewState | null>(null);
  const flushPending = useCallback(() => {
    if (!pending.current) return;
    writeViewState(pending.current);
    pending.current = null;
  }, []);
  useEffect(() => {
    if (!restored) return;
    pending.current = {
      folder: selectedFolder,
      collapsed: [...collapsedFolders],
      sidebarWidth,
      sort,
    };
    const timer = setTimeout(flushPending, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [restored, selectedFolder, collapsedFolders, sidebarWidth, sort, flushPending]);

  // Save without waiting when leaving or closing the page
  useEffect(() => {
    window.addEventListener('pagehide', flushPending);
    return () => {
      window.removeEventListener('pagehide', flushPending);
      flushPending();
    };
  }, [flushPending]);

  const setSidebarWidth = useCallback(
    (width: number) => setSidebarWidthState(clampSidebarWidth(width)),
    [],
  );

  return {
    selectedFolder,
    setSelectedFolder,
    collapsedFolders,
    setCollapsedFolders,
    sidebarWidth,
    setSidebarWidth,
    sort,
    setSort,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FolderSelection } from '~/lib/folder-tree';
import { DEFAULT_FILTERS, type SortKey } from '~/lib/todo-filters';

// 表示の状態 (フォルダ・畳んだフォルダ・欄の幅・並び順) はこの端末だけの好みなので、TODO のデータとは分けて置く
export const VIEW_STATE_KEY = 'todo:view';

/** フォルダ欄の幅 (px)。広い画面でだけ使う */
export const SIDEBAR_WIDTH = { min: 180, max: 480, default: 240 } as const;

export function clampSidebarWidth(width: number): number {
  return Math.round(Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, width)));
}

/** 表示の状態を保存するまで待つ時間 (ms) */
const SAVE_DELAY_MS = 200;

export interface ViewState {
  folder: FolderSelection;
  collapsed: string[];
  sidebarWidth: number;
  sort?: SortKey;
}

/** 保存した表示の状態を読む。無い・壊れている・読めない (プライベートモードなど) ときは null。 */
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
    // 保存できなくても画面はそのまま使える
  }
}

/**
 * 選んでいるフォルダ・畳んだフォルダ・フォルダ欄の幅・並び順を localStorage に覚えておく。
 * 消えたフォルダを指していても、画面の側で「すべて」として扱う。
 */
export function useViewState() {
  const [selectedFolder, setSelectedFolder] = useState<FolderSelection>('all');
  const [collapsedFolders, setCollapsedFolders] = useState<ReadonlySet<string>>(new Set());
  const [sidebarWidth, setSidebarWidthState] = useState<number>(SIDEBAR_WIDTH.default);
  const [sort, setSort] = useState<SortKey>(DEFAULT_FILTERS.sort);
  const [restored, setRestored] = useState(false);

  // ビルド時に作る HTML と食い違わないよう、読み出しは表示した後に行う
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

  // 幅のドラッグ中は値が何度も変わるので、変化が落ち着いてからまとめて保存する。
  // 読み出す前の初期値では上書きしない
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

  // 画面を離れる・閉じるときは待たずに保存する
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

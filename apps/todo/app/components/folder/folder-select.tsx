import { useMemo } from 'react';
import { flattenFolderTree, getSubtreeIds } from '~/lib/folder-tree';
import type { Folder } from '~/types/folder';

interface FolderSelectProps {
  folders: Folder[];
  value: string | null;
  onChange: (folderId: string | null) => void;
  /** null を選ぶ項目の表示 (例: 未分類 / 最上位) */
  noneLabel: string;
  /** このフォルダとその子孫は選べないようにする (フォルダを自分の下に動かさないため) */
  excludeSubtreeOf?: string;
  className?: string;
  'aria-label': string;
}

const NONE = '';

/** フォルダを木の順に並べ、深さに応じて字下げした選択欄。 */
export function FolderSelect({
  folders,
  value,
  onChange,
  noneLabel,
  excludeSubtreeOf,
  className,
  'aria-label': ariaLabel,
}: FolderSelectProps) {
  const entries = useMemo(() => {
    const excluded = excludeSubtreeOf ? getSubtreeIds(folders, excludeSubtreeOf) : new Set();
    return flattenFolderTree(folders).filter(({ folder }) => !excluded.has(folder.id));
  }, [folders, excludeSubtreeOf]);

  return (
    <select
      className={className}
      value={value ?? NONE}
      onChange={(event) => onChange(event.target.value || null)}
      aria-label={ariaLabel}
    >
      <option value={NONE}>{noneLabel}</option>
      {entries.map(({ folder, depth }) => (
        <option key={folder.id} value={folder.id}>
          {/* option の中は CSS で字下げできないので空白で深さを表す */}
          {'　'.repeat(depth)}
          {folder.name}
        </option>
      ))}
    </select>
  );
}

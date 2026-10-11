import { useMemo } from 'react';
import { flattenFolderTree, getSubtreeIds } from '~/lib/folder-tree';
import type { Folder } from '~/types/folder';

interface FolderSelectProps {
  folders: Folder[];
  value: string | null;
  onChange: (folderId: string | null) => void;
  /** Label of the option that selects null (e.g. 未分類 / 最上位) */
  noneLabel: string;
  /** Make this folder and its descendants unselectable (so a folder cannot be moved under itself) */
  excludeSubtreeOf?: string;
  className?: string;
  'aria-label': string;
}

const NONE = '';

/** A select that lists folders in tree order, indented by depth. */
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
          {/* Options cannot be indented with CSS, so depth is shown with spaces */}
          {'　'.repeat(depth)}
          {folder.name}
        </option>
      ))}
    </select>
  );
}

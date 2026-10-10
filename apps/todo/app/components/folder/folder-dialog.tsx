import { useState } from 'react';
import { FolderSelect } from '~/components/folder/folder-select';
import { Modal } from '~/components/layout/modal';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '~/lib/styles';
import { FOLDER_NAME_MAX_LENGTH, type Folder, type FolderInput } from '~/types/folder';

interface FolderDialogProps {
  folders: Folder[];
  /** 編集するフォルダ。無ければ新しく作る */
  folder?: Folder;
  /** 新しく作るときの親 */
  defaultParentId?: string | null;
  onSubmit: (input: FolderInput) => void;
  onCancel: () => void;
}

export function FolderDialog({
  folders,
  folder,
  defaultParentId = null,
  onSubmit,
  onCancel,
}: FolderDialogProps) {
  const [name, setName] = useState(folder?.name ?? '');
  const [parentId, setParentId] = useState(folder ? folder.parentId : defaultParentId);
  const canSubmit = name.trim() !== '';

  return (
    <Modal title={folder ? 'フォルダを編集' : '新しいフォルダ'} onClose={onCancel}>
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit({ name: name.trim(), parentId });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600 dark:text-slate-400">名前</span>
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={FOLDER_NAME_MAX_LENGTH}
            aria-label="フォルダ名"
          />
        </label>
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600 dark:text-slate-400" aria-hidden="true">
            親フォルダ
          </span>
          <FolderSelect
            className={inputClass}
            folders={folders}
            value={parentId}
            onChange={setParentId}
            noneLabel="なし (最上位)"
            excludeSubtreeOf={folder?.id}
            aria-label="親フォルダ"
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onCancel}>
            キャンセル
          </button>
          <button type="submit" className={primaryButtonClass} disabled={!canSubmit}>
            {folder ? '保存' : '作成'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

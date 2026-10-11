import { useState } from 'react';
import { FaFolder } from 'react-icons/fa';
import { FolderSelect } from '~/components/folder/folder-select';
import { Modal } from '~/components/layout/modal';
import { t } from '~/lib/i18n';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '~/lib/styles';
import {
  DEFAULT_FOLDER_COLOR,
  FOLDER_NAME_MAX_LENGTH,
  type Folder,
  type FolderInput,
} from '~/types/folder';

const COLOR_PRESETS = [
  { label: '黄色', value: DEFAULT_FOLDER_COLOR },
  { label: 'オレンジ', value: '#ea580c' },
  { label: '赤', value: '#dc2626' },
  { label: 'ピンク', value: '#db2777' },
  { label: '紫', value: '#9333ea' },
  { label: '青', value: '#2563eb' },
  { label: '緑', value: '#16a34a' },
  { label: 'グレー', value: '#64748b' },
];

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
  const [color, setColor] = useState(folder?.color ?? DEFAULT_FOLDER_COLOR);
  const [parentId, setParentId] = useState(folder ? folder.parentId : defaultParentId);
  const canSubmit = name.trim() !== '';

  return (
    <Modal title={t(folder ? 'フォルダを編集' : '新しいフォルダ')} onClose={onCancel}>
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit({ name: name.trim(), parentId, color });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600 dark:text-slate-400">{t('名前')}</span>
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={FOLDER_NAME_MAX_LENGTH}
            aria-label={t('フォルダ名')}
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm text-slate-600 dark:text-slate-400">{t('色')}</legend>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_PRESETS.map((preset) => (
              <label key={preset.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="folder-color"
                  value={preset.value}
                  checked={color === preset.value}
                  onChange={() => setColor(preset.value)}
                  className="peer sr-only"
                  aria-label={t(preset.label)}
                />
                <span className="flex flex-col items-center gap-1 rounded-md border border-slate-300 px-2 py-2 text-xs peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:ring-1 peer-checked:ring-blue-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-500 dark:border-slate-700 dark:peer-checked:border-blue-400 dark:peer-checked:bg-blue-950 dark:peer-checked:ring-blue-400">
                  <FaFolder
                    className="h-5 w-5"
                    style={{ color: preset.value }}
                    aria-hidden="true"
                  />
                  {t(preset.label)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600 dark:text-slate-400" aria-hidden="true">
            {t('親フォルダ')}
          </span>
          <FolderSelect
            className={inputClass}
            folders={folders}
            value={parentId}
            onChange={setParentId}
            noneLabel={t('なし (最上位)')}
            excludeSubtreeOf={folder?.id}
            aria-label={t('親フォルダ')}
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onCancel}>
            {t('キャンセル')}
          </button>
          <button type="submit" className={primaryButtonClass} disabled={!canSubmit}>
            {t(folder ? '保存' : '作成')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { Modal } from '~/components/layout/modal';
import type { ImportMode } from '~/hooks/use-todos';
import { t } from '~/lib/i18n';
import { dangerButtonClass, primaryButtonClass, secondaryButtonClass } from '~/lib/styles';

interface ImportDialogProps {
  fileName: string;
  todoCount: number;
  folderCount: number;
  skipped: number;
  currentTodoCount: number;
  currentFolderCount: number;
  onConfirm: (mode: ImportMode) => void;
  onCancel: () => void;
}

export function ImportDialog({
  fileName,
  todoCount,
  folderCount,
  skipped,
  currentTodoCount,
  currentFolderCount,
  onConfirm,
  onCancel,
}: ImportDialogProps) {
  const current = t('今の TODO {0} 件とフォルダ {1} 件', [currentTodoCount, currentFolderCount]);

  return (
    <Modal title={t('インポート')} onClose={onCancel}>
      <p className="mt-2 break-all text-sm text-slate-600 dark:text-slate-400">{fileName}</p>
      <p className="mt-3 text-sm">
        {t('TODO {0} 件とフォルダ {1} 件を読み込みます。', [todoCount, folderCount])}
        {skipped > 0 && t(' (形式が正しくない・重複している {0} 件は読み飛ばします)', [skipped])}
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
        <li>
          <strong>{t('マージ')}</strong>:{' '}
          {t('{0}に追加します。同じものは更新日時が新しい方を残します。', [current])}
        </li>
        <li>
          <strong>{t('置き換え')}</strong>: {t('{0}をすべて削除してから読み込みます。', [current])}
        </li>
      </ul>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>
          {t('キャンセル')}
        </button>
        <button type="button" className={dangerButtonClass} onClick={() => onConfirm('replace')}>
          {t('置き換え')}
        </button>
        {/* 開いたときはマージ (最後のボタン) にフォーカスする */}
        <button type="button" className={primaryButtonClass} onClick={() => onConfirm('merge')}>
          {t('マージ')}
        </button>
      </div>
    </Modal>
  );
}

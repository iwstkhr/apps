import { Modal } from '~/components/layout/modal';
import type { ImportMode } from '~/hooks/use-todos';
import { primaryButtonClass, secondaryButtonClass } from '~/lib/styles';

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
  const current = `今の TODO ${currentTodoCount} 件とフォルダ ${currentFolderCount} 件`;

  return (
    <Modal title="インポート" onClose={onCancel}>
      <p className="mt-2 break-all text-sm text-slate-600 dark:text-slate-400">{fileName}</p>
      <p className="mt-3 text-sm">
        TODO {todoCount} 件とフォルダ {folderCount} 件を読み込みます。
        {skipped > 0 && ` (形式が正しくない・重複している ${skipped} 件は読み飛ばします)`}
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
        <li>
          <strong>マージ</strong>: {current}
          に追加します。同じものは更新日時が新しい方を残します。
        </li>
        <li>
          <strong>置き換え</strong>: {current}をすべて削除してから読み込みます。
        </li>
      </ul>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>
          キャンセル
        </button>
        <button
          type="button"
          className={`${secondaryButtonClass} border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950`}
          onClick={() => onConfirm('replace')}
        >
          置き換え
        </button>
        {/* 開いたときはマージ (最後のボタン) にフォーカスする */}
        <button type="button" className={primaryButtonClass} onClick={() => onConfirm('merge')}>
          マージ
        </button>
      </div>
    </Modal>
  );
}

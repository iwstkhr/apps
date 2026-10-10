import { useEffect, useId, useRef } from 'react';
import type { ImportMode } from '~/hooks/use-todos';
import { primaryButtonClass, secondaryButtonClass } from '~/lib/styles';

interface ImportDialogProps {
  fileName: string;
  importCount: number;
  skipped: number;
  currentCount: number;
  onConfirm: (mode: ImportMode) => void;
  onCancel: () => void;
}

export function ImportDialog({
  fileName,
  importCount,
  skipped,
  currentCount,
  onConfirm,
  onCancel,
}: ImportDialogProps) {
  const titleId = useId();
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900"
      >
        <h2 id={titleId} className="text-lg font-bold">
          インポート
        </h2>
        <p className="mt-2 break-all text-sm text-slate-600 dark:text-slate-400">{fileName}</p>
        <p className="mt-3 text-sm">
          {importCount} 件の TODO を読み込みます。
          {skipped > 0 && ` (形式が正しくない・重複している ${skipped} 件は読み飛ばします)`}
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <strong>マージ</strong>: 今の {currentCount} 件に追加します。同じ TODO
            は更新日時が新しい方を残します。
          </li>
          <li>
            <strong>置き換え</strong>: 今の {currentCount} 件をすべて削除してから読み込みます。
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
          <button
            ref={firstButtonRef}
            type="button"
            className={primaryButtonClass}
            onClick={() => onConfirm('merge')}
          >
            マージ
          </button>
        </div>
      </div>
    </div>
  );
}

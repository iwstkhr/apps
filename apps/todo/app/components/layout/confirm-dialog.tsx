import { useEffect, useId, useRef } from 'react';
import { t } from '~/lib/i18n';
import { dangerPrimaryButtonClass, secondaryButtonClass } from '~/lib/styles';

export interface Confirmation {
  /** 問いかけ。ダイアログの見出しになる */
  title: string;
  /** 見出しの下に 1 行ずつ出す補足 */
  details?: string[];
  confirmLabel: string;
  onConfirm: () => void;
}

interface ConfirmDialogProps extends Confirmation {
  /** 確定・取り消しのどちらでも、閉じた後に呼ぶ */
  onClose: () => void;
}

/**
 * window.confirm の代わりに、取り消せない操作の前に出す確認ダイアログ。
 * showModal() で開くので、フォーカスは中に閉じ込められ、Escape で取り消せる。
 * 誤って確定しないよう、最初のフォーカスは先頭の「キャンセル」に置く。
 */
export function ConfirmDialog({
  title,
  details = [],
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const detailsId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={details.length > 0 ? detailsId : undefined}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-white text-slate-900 shadow-xl backdrop:bg-slate-900/50 dark:bg-slate-900 dark:text-slate-100 dark:ring-1 dark:ring-slate-700"
      // 押したボタンの value が returnValue に入る。Escape で閉じたときは空のまま
      onClose={(event) => {
        if (event.currentTarget.returnValue === 'confirm') onConfirm();
        onClose();
      }}
    >
      <form method="dialog" className="p-5">
        <h2 id={titleId} className="text-lg font-bold break-words">
          {title}
        </h2>
        {details.length > 0 && (
          <div id={detailsId} className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            {details.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="submit" value="cancel" className={secondaryButtonClass}>
            {t('キャンセル')}
          </button>
          <button type="submit" value="confirm" className={dangerPrimaryButtonClass}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

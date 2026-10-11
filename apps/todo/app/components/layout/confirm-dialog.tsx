import { useEffect, useId, useRef } from 'react';
import { t } from '~/lib/i18n';
import { dangerPrimaryButtonClass, secondaryButtonClass } from '~/lib/styles';

export interface Confirmation {
  /** The question. Becomes the dialog heading */
  title: string;
  /** Supplementary lines shown one per line below the heading */
  details?: string[];
  confirmLabel: string;
  onConfirm: () => void;
}

interface ConfirmDialogProps extends Confirmation {
  /** Called after closing, whether confirmed or canceled */
  onClose: () => void;
}

/**
 * A confirmation dialog shown before irreversible actions, in place of window.confirm.
 * It opens with showModal(), so focus is trapped inside and Escape cancels.
 * To prevent accidental confirmation, initial focus goes to the leading 「キャンセル」 button.
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
      // returnValue holds the value of the pressed button. It stays empty when closed with Escape
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

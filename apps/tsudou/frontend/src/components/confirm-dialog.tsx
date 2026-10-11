import { type ReactNode, useCallback, useRef, useState } from 'react';
import { type Confirm, ConfirmContext, type ConfirmOptions } from '../lib/confirm';
import { t, useLanguage } from '../lib/i18n';
import { ModalDialog } from './modal-dialog';
import { Button } from './ui';

/** Shows the confirmation dialog for useConfirm(). Wraps the whole app. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((options) => {
    // When another confirmation arrives while one is shown, the previous one is treated as canceled
    resolveRef.current?.(false);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setRequest(options);
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setRequest(null);
  }, []);

  return (
    <ConfirmContext value={confirm}>
      {children}
      {request && <ConfirmDialog {...request} onResult={settle} />}
    </ConfirmContext>
  );
}

function ConfirmDialog({
  message,
  confirmLabel,
  onResult,
}: ConfirmOptions & { onResult: (ok: boolean) => void }) {
  useLanguage();
  // Many actions are irreversible, so focus starts on cancel
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <ModalDialog title={message} onClose={() => onResult(false)} initialFocus={cancelRef}>
      <div className="mt-5 flex justify-end gap-2">
        <Button
          ref={cancelRef}
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onResult(false)}
        >
          {t('キャンセル')}
        </Button>
        <Button type="button" size="sm" variant="danger" onClick={() => onResult(true)}>
          {confirmLabel}
        </Button>
      </div>
    </ModalDialog>
  );
}

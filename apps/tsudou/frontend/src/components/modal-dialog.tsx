import { type ReactNode, type RefObject, useEffect, useId, useRef } from 'react';

/**
 * A small modal for confirmations and notices, mounted only while shown.
 * It uses <dialog>'s showModal() and leaves focus trapping and disabling the background to the browser.
 * Esc and backdrop clicks both go through onClose.
 */
export function ModalDialog({
  title,
  onClose,
  initialFocus,
  children,
}: {
  title: string;
  onClose: () => void;
  /** The element to focus when opened. When omitted, the browser decides (the first interactive element) */
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    // It unmounts as soon as it closes, so <dialog>'s native focus restoration cannot be used
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    initialFocus?.current?.focus();
    return () => {
      dialog?.close();
      opener?.focus();
    };
  }, [initialFocus]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard equivalent of a backdrop click is handled by onCancel (Esc)
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Padding is on the inner div, so the dialog itself is clicked only when the backdrop is clicked
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[min(24rem,calc(100%-2rem))] rounded-xl bg-white p-0 text-slate-900 shadow-xl ring-1 ring-slate-200 backdrop:bg-slate-900/60 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:backdrop:bg-black/70"
    >
      <div className="p-5">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}

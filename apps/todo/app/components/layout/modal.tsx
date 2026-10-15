import { type ReactNode, useEffect, useId, useRef } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  /** Also close when the backdrop is clicked */
  closeOnBackdropClick?: boolean;
  children: ReactNode;
}

/** A dialog overlaid on the page. When opened, it focuses the first input inside (or the last button if none). */
export function Modal({ title, onClose, closeOnBackdropClick = false, children }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Do not close when pressed inside and released on the backdrop (e.g. while selecting text)
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const panel = panelRef.current;
    const target =
      panel?.querySelector<HTMLElement>('input, textarea, select') ??
      [...(panel?.querySelectorAll<HTMLElement>('button') ?? [])].at(-1);
    target?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    // Escape also closes it, so a backdrop click is treated as a mouse shortcut
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes the modal
    // biome-ignore lint/a11y/noStaticElementInteractions: the backdrop is not a control
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (
          closeOnBackdropClick &&
          pressedBackdrop.current &&
          event.target === event.currentTarget
        ) {
          onClose();
        }
        pressedBackdrop.current = false;
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900"
      >
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

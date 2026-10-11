import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cx } from '../lib/cx';
import { t, useLanguage } from '../lib/i18n';
import { QrCode } from './qr-code';
import { Button } from './ui';

/** How long the QR code stays visible */
export const QR_VISIBLE_MS = 10_000;

/** Duration of the fade when showing and closing. Keep in sync with duration-200 in className */
export const QR_FADE_MS = 200;

/**
 * Show the URL's QR code in a modal, mounted only while shown.
 * It closes automatically after QR_VISIBLE_MS so people nearby cannot scan URLs such as the manage URL.
 * It uses <dialog>'s showModal() and leaves focus trapping and disabling the background to the browser.
 * It fades in with @starting-style (starting:) when shown, and calls onClose after the fade-out when closing.
 */
export function QrCodeDialog({
  label,
  url,
  onClose,
}: {
  label: string;
  url: string;
  onClose: () => void;
}) {
  useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const title = t('{0} の QR コード', [label]);
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => setClosing(true), []);

  useEffect(() => {
    if (!closing) return;
    // With reduced motion there is no fade, so do not wait
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(onClose, reduced ? 0 : QR_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [closing, onClose]);

  useEffect(() => {
    const dialog = ref.current;
    // After closing, return focus to the element focused before opening (the 「QR コード」 button).
    // It unmounts as soon as it closes, so <dialog>'s native focus restoration cannot be used
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(close, QR_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [close]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard equivalent of a backdrop click is handled by onCancel (Esc)
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Do not let the browser close it on Esc; closing always goes through the shown state (unmounting)
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      // Close on backdrop click. Keyboard users can close it with Esc.
      // Padding is on the inner div, so the dialog itself is clicked only when the backdrop is clicked
      onClick={(e) => e.target === e.currentTarget && close()}
      data-closing={closing || undefined}
      className={cx(
        'm-auto w-[min(20rem,calc(100%-2rem))] rounded-xl bg-white p-0 text-slate-900 shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600',
        'backdrop:bg-slate-900/60 dark:backdrop:bg-black/70',
        // Fade: transparent right after opening (starting:) and while closing (data-closing)
        'transition-opacity duration-200 backdrop:transition-opacity backdrop:duration-200 motion-reduce:transition-none motion-reduce:backdrop:transition-none',
        'starting:opacity-0 starting:backdrop:opacity-0 data-closing:opacity-0 data-closing:backdrop:opacity-0',
      )}
    >
      <div className="p-5">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <div className="mt-4 flex justify-center">
          <QrCode value={url} label={title} />
        </div>
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          {t('周りの人に読み取られないよう、{0} 秒後に自動で閉じます。', [QR_VISIBLE_MS / 1000])}
        </p>
        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" variant="secondary" onClick={close}>
            {t('閉じる')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

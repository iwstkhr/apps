import { useCallback, useRef, useState } from 'react';
import { cx } from '../lib/cx';
import { t, useLanguage } from '../lib/i18n';
import { useFlash } from '../lib/use-flash';
import { ModalDialog } from './modal-dialog';
import { QrCodeDialog } from './qr-code-dialog';
import { Button, buttonClassName } from './ui';

export function ShareLinkBox({
  label,
  url,
  description,
  tone = 'default',
  openable = false,
  qrCode = false,
}: {
  label: string;
  url: string;
  description?: string;
  tone?: 'default' | 'warning';
  /**
   * Show the 「開く」 button. It opens a new tab, so the original screen (such as the created screen) remains.
   * The token is in the URL fragment, so it works as is in the new tab.
   */
  openable?: boolean;
  /**
   * Show the 「QR コード」 button, used to open the URL on a smartphone from a PC screen.
   * The QR code appears in a modal that closes automatically after a while (QrCodeDialog).
   */
  qrCode?: boolean;
}) {
  useLanguage();
  const [copied, flashCopied] = useFlash(2000);
  const [qrOpen, setQrOpen] = useState(false);
  const [manualCopyOpen, setManualCopyOpen] = useState(false);
  // Pass the same function so QrCodeDialog's timer is not recreated on every render
  const closeQr = useCallback(() => setQrOpen(false), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      flashCopied();
    } catch {
      // Environments where the Clipboard API is unavailable (http, permission denied, etc.).
      // The URL is shown on screen, so the user copies it manually.
      setManualCopyOpen(true);
    }
  };

  return (
    <div
      className={cx(
        'rounded-lg p-4 ring-1 ring-inset',
        tone === 'warning'
          ? 'bg-amber-50 ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-900'
          : 'bg-slate-50 ring-slate-200 dark:bg-slate-800/50 dark:ring-slate-700',
      )}
    >
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
      {description && (
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{description}</p>
      )}

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 truncate rounded border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {url}
        </code>
        <div className="flex shrink-0 gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={copy}>
            {copied ? t('コピーしました') : t('コピー')}
          </Button>
          {openable && (
            // Do not pass the opener (noopener). Referer is never sent anyway because of no-referrer
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              {t('開く')}
            </a>
          )}
          {qrCode && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-haspopup="dialog"
              onClick={() => setQrOpen(true)}
            >
              {t('QR コード')}
            </Button>
          )}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void navigator.share({ url }).catch(() => undefined)}
            >
              {t('共有')}
            </Button>
          )}
        </div>
      </div>

      {qrCode && qrOpen && <QrCodeDialog label={label} url={url} onClose={closeQr} />}
      {manualCopyOpen && (
        <ManualCopyDialog label={label} url={url} onClose={() => setManualCopyOpen(false)} />
      )}
    </div>
  );
}

/** When the clipboard cannot be written, show the URL selected so the user can copy it manually */
function ManualCopyDialog({
  label,
  url,
  onClose,
}: {
  label: string;
  url: string;
  onClose: () => void;
}) {
  useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <ModalDialog
      title={t('この URL をコピーしてください')}
      onClose={onClose}
      initialFocus={inputRef}
    >
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={url}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-4 block w-full rounded-lg border-0 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-indigo-600 focus:ring-inset dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:focus:ring-indigo-400"
      />
      <div className="mt-4 flex justify-end">
        <Button type="button" size="sm" variant="secondary" onClick={onClose}>
          {t('閉じる')}
        </Button>
      </div>
    </ModalDialog>
  );
}

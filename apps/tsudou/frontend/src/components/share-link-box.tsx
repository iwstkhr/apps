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
   * 「開く」ボタンを出す。新しいタブで開くので、元の画面 (作成完了画面など) は残る。
   * トークンは URL のフラグメントに載っているため、新しいタブでもそのまま使える。
   */
  openable?: boolean;
  /**
   * 「QR コード」ボタンを出す。PC の画面からスマートフォンで開くときに使う。
   * QR コードはモーダルで出し、一定時間で自動で閉じる (QrCodeDialog)。
   */
  qrCode?: boolean;
}) {
  useLanguage();
  const [copied, flashCopied] = useFlash(2000);
  const [qrOpen, setQrOpen] = useState(false);
  const [manualCopyOpen, setManualCopyOpen] = useState(false);
  // QrCodeDialog のタイマーが再描画のたびに作り直されないよう、同じ関数を渡す
  const closeQr = useCallback(() => setQrOpen(false), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      flashCopied();
    } catch {
      // クリップボード API が使えない環境 (http, 権限拒否など)。
      // URL は画面に出ているので手動でコピーしてもらう。
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
            // opener を渡さない (noopener)。Referer は no-referrer で元から送らない
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

/** クリップボードに書き込めないときに、URL を選択した状態で出して手でコピーしてもらう */
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

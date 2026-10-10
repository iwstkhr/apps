import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cx } from '../lib/cx';
import { t, useLanguage } from '../lib/i18n';
import { QrCode } from './QrCode';
import { Button } from './ui';

/** QR コードを表示しておく時間 */
export const QR_VISIBLE_MS = 10_000;

/** 表示・閉じるときのフェードの時間。className の duration-200 と合わせる */
export const QR_FADE_MS = 200;

/**
 * URL の QR コードをモーダルで出す。表示中だけマウントする。
 * 管理用 URL などを周りの人に読み取られないよう、QR_VISIBLE_MS 経つと自動で閉じる。
 * <dialog> の showModal() を使い、フォーカスの閉じ込めと背景の操作の無効化はブラウザに任せる。
 * 表示時は @starting-style (starting:) でフェードインし、閉じるときはフェードアウトを待ってから onClose を呼ぶ。
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
    // 動きを減らす設定ではフェードしないので待たない
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(onClose, reduced ? 0 : QR_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [closing, onClose]);

  useEffect(() => {
    const dialog = ref.current;
    // 閉じたら開く前の要素 (「QR コード」ボタン) にフォーカスを戻す。
    // 閉じると同時にアンマウントするため、<dialog> の標準の戻し先は使えない
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
    // biome-ignore lint/a11y/useKeyWithClickEvents: 背景のクリックに当たるキーボード操作は onCancel (Esc) で受ける
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Esc はブラウザに閉じさせず、表示の状態 (アンマウント) に一本化する
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      // 背景のクリックで閉じる。キーボードでは Esc で閉じられる。
      // 余白は内側の div に持たせ、dialog 自身がクリックされるのを背景のときだけにする
      onClick={(e) => e.target === e.currentTarget && close()}
      data-closing={closing || undefined}
      className={cx(
        'm-auto w-[min(20rem,calc(100%-2rem))] rounded-xl bg-white p-0 text-slate-900 shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600',
        'backdrop:bg-slate-900/60 dark:backdrop:bg-black/70',
        // フェード: 開いた直後 (starting:) と閉じるとき (data-closing) に透明にする
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

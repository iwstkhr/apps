import { cx } from '../lib/cx';
import { useFlash } from '../lib/useFlash';
import { Button, buttonClassName } from './ui';

export function ShareLinkBox({
  label,
  url,
  description,
  tone = 'default',
  openable = false,
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
}) {
  const [copied, flashCopied] = useFlash(2000);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      flashCopied();
    } catch {
      // クリップボード API が使えない環境 (http, 権限拒否など)。
      // URL は画面に出ているので手動でコピーしてもらう。
      window.prompt('この URL をコピーしてください', url);
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
            {copied ? 'コピーしました' : 'コピー'}
          </Button>
          {openable && (
            // opener を渡さない (noopener)。Referer は no-referrer で元から送らない
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              開く
            </a>
          )}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void navigator.share({ url }).catch(() => undefined)}
            >
              共有
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

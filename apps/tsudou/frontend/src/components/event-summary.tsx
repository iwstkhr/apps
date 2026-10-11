import { formatExpiry, formatFee } from '../lib/format';
import { t, useLanguage } from '../lib/i18n';
import type { EventView } from '../lib/types';

export function EventSummary({ event }: { event: EventView }) {
  useLanguage();
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
      <dt className="font-medium text-slate-500 dark:text-slate-400">{t('参加費')}</dt>
      <dd className="text-slate-900 dark:text-slate-100">{formatFee(event.fee)}</dd>

      {event.memo && (
        <>
          <dt className="font-medium text-slate-500 dark:text-slate-400">{t('メモ')}</dt>
          {/* whitespace-pre-wrap shows line breaks as is. HTML is not interpreted */}
          <dd className="whitespace-pre-wrap text-slate-900 dark:text-slate-100">{event.memo}</dd>
        </>
      )}

      <dt className="font-medium text-slate-500 dark:text-slate-400">{t('自動削除')}</dt>
      <dd className="text-slate-900 dark:text-slate-100">
        {formatExpiry(event.expiresAt)}
        <span className="ml-1 text-slate-500 dark:text-slate-400">{t('以降に削除されます')}</span>
      </dd>
    </dl>
  );
}

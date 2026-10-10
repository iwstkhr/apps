import { t } from '../lib/i18n';
import { TextLink } from './text-link';
import { MessageCard } from './ui';

export function NotFoundCard({ title, message }: { title: string; message: string }) {
  return (
    <MessageCard title={title}>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
      <TextLink to="/" className="mt-4 inline-block">
        {t('トップへ戻る')}
      </TextLink>
    </MessageCard>
  );
}

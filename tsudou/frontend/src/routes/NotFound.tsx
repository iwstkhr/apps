import { TextLink } from '../components/TextLink';
import { MessageCard } from '../components/ui';
import { t, useLanguage } from '../lib/i18n';

export function NotFound() {
  useLanguage();
  return (
    <MessageCard title={t('ページが見つかりません')}>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {t('URL が正しいかご確認ください。')}
      </p>
      <TextLink to="/" className="mt-4 inline-block">
        {t('トップへ戻る')}
      </TextLink>
    </MessageCard>
  );
}

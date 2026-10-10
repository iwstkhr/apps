import { NotFoundCard } from '../components/not-found-card';
import { t, useLanguage } from '../lib/i18n';

export function NotFound() {
  useLanguage();
  return (
    <NotFoundCard
      title={t('ページが見つかりません')}
      message={t('URL が正しいかご確認ください。')}
    />
  );
}

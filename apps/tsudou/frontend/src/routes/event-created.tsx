import { RETENTION_MONTHS } from '@tsudou/shared/limits';
import { useEffect } from 'react';
import { useParams } from 'react-router';
import { ManageUrlBox, ShareUrlBox } from '../components/event-url-boxes';
import { Alert, Card } from '../components/ui';
import { t, useLanguage } from '../lib/i18n';
import { useManageToken } from '../lib/keyring';

export function EventCreated() {
  useLanguage();
  const { eventId } = useParams();
  const manageToken = useManageToken(eventId);

  // The manage token exists only in memory, and after a reload or closing the tab the manage URL can never be shown again.
  // The browser's native confirmation dialog prevents leaving without noting it down.
  // Navigation within the app keeps the token, so it is not covered (beforeunload does not fire).
  useEffect(() => {
    if (!manageToken) return;
    const confirmLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers show no dialog unless returnValue is set
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', confirmLeave);
    return () => window.removeEventListener('beforeunload', confirmLeave);
  }, [manageToken]);

  if (!eventId) {
    return <Alert variant="error">{t('イベントが指定されていません。')}</Alert>;
  }

  return (
    <Card className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">{t('イベントを作成しました')}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('このページを閉じる前に、ブックマークするか自分宛てに送っておいてください。')}
        </p>
      </div>

      <ShareUrlBox eventId={eventId} openable />

      {manageToken ? (
        <ManageUrlBox eventId={eventId} manageToken={manageToken} openable />
      ) : (
        <Alert variant="warning" title={t('管理用 URL を表示できません')}>
          {t(
            '管理トークンはブラウザに保存しないため、作成直後のこの画面でしか表示できません。 ページを再読み込みした場合や、別のブラウザで開いた場合は表示されません。',
          )}
        </Alert>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('このイベントと回答は、作成から')}
        {RETENTION_MONTHS}
        {t('ヶ月後に自動削除されます。')}
      </p>
    </Card>
  );
}

import { useLocation, useParams } from 'react-router';
import { AnswerGrid } from '../components/answer-grid';
import { EventEditForm } from '../components/event-edit-form';
import { ManageUrlBox, ShareUrlBox } from '../components/event-url-boxes';
import { NotFoundCard } from '../components/not-found-card';
import { TextLink } from '../components/text-link';
import { Alert, Button, Card, LoadingBlock, MessageCard } from '../components/ui';
import { formatExpiry } from '../lib/format';
import { t, useLanguage } from '../lib/i18n';
import { useManagedEvent } from '../lib/use-managed-event';

export function EventManage() {
  useLanguage();
  const { eventId } = useParams();
  const location = useLocation();
  const {
    event,
    loading,
    error,
    notFound,
    manageToken,
    saving,
    formError,
    saved,
    save,
    toggleClosed,
    removeAnswer,
    removeEvent,
  } = useManagedEvent(eventId, location.hash);

  if (loading && !event) {
    return <LoadingBlock />;
  }

  if (notFound) {
    return (
      <NotFoundCard
        title={t('イベントが見つかりません')}
        message={t('URL が正しいか確認してください。すでに削除された可能性もあります。')}
      />
    );
  }

  if (error || !event || !eventId) {
    return (
      <Alert variant="error" title={t('読み込みに失敗しました')}>
        {error ?? t('不明なエラーが発生しました')}
      </Alert>
    );
  }

  if (!manageToken) {
    return (
      <MessageCard title={t('管理用 URL が必要です')} align="start" className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('このイベントを編集するには、作成時に発行された管理用 URL （')}
          <code>#k=...</code>{' '}
          {t(
            'が付いたもの）を開いてください。管理トークンはブラウザに保存しないため、 ページを再読み込みした場合も管理用 URL を開き直す必要があります。',
          )}
        </p>
        <TextLink to={`/e/${eventId}`} className="inline-block">
          {t('イベントページを見る')}
        </TextLink>
      </MessageCard>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold">{t('イベントの管理')}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{event.title}</p>
          </div>
          <TextLink to={`/e/${eventId}`}>{t('参加者から見た画面')}</TextLink>
        </div>

        <ShareUrlBox eventId={eventId} />
        <ManageUrlBox eventId={eventId} manageToken={manageToken} />
      </Card>

      <Card>
        <h2 className="text-base font-bold">{t('内容を編集')}</h2>
        <div className="mt-4">
          {/* key を変えることで、別イベントを開いたときにフォームを作り直す */}
          <EventEditForm
            key={event.id}
            event={event}
            saving={saving}
            saved={saved}
            error={formError}
            onSave={(values) => void save(values)}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-bold">{t('回答状況')}</h2>
        <div className="mt-3">
          <AnswerGrid candidates={event.candidates} answers={event.answers} />
        </div>

        {event.answers.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {event.answers.map((answer) => (
              <li key={answer.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{answer.name}</p>
                  {answer.message && (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {answer.message}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => void removeAnswer(answer.id, answer.name)}
                >
                  {t('削除')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-bold">{t('締切と削除')}</h2>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {event.closed
              ? t('締切中です。参加者は回答できません。')
              : t('受付中です。締め切ると新しい回答・編集ができなくなります。')}
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => void toggleClosed()}
          >
            {event.closed ? t('受付を再開する') : t('回答を締め切る')}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('イベントとすべての回答を削除します。元に戻せません。')}
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              {t('何もしなくても {0} 以降に自動削除されます。', [formatExpiry(event.expiresAt)])}
            </span>
          </p>
          <Button variant="danger" size="sm" disabled={saving} onClick={() => void removeEvent()}>
            {t('イベントを削除')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

import { useLocation, useParams } from 'react-router';
import { AnswerForm } from '../components/AnswerForm';
import { AnswerGrid } from '../components/AnswerGrid';
import { EventSummary } from '../components/EventSummary';
import { NotFoundCard } from '../components/NotFoundCard';
import { ShareLinkBox } from '../components/ShareLinkBox';
import { TextLink } from '../components/TextLink';
import { Alert, Button, Card, LoadingBlock } from '../components/ui';
import { t, useLanguage } from '../lib/i18n';
import { answerEditUrl, managePath, shareUrl } from '../lib/urls';
import { usePublicEvent } from '../lib/usePublicEvent';

export function EventPublic() {
  useLanguage();
  const { eventId } = useParams();
  const location = useLocation();
  const {
    event,
    loading,
    error,
    notFound,
    mine,
    manageToken,
    myAnswer,
    keyIsStale,
    initialDraft,
    submitting,
    formError,
    justSaved,
    save,
    removeMyAnswer,
  } = usePublicEvent(eventId, location.hash);

  if (loading && !event) {
    return <LoadingBlock />;
  }

  if (notFound) {
    return (
      <NotFoundCard
        title={t('イベントが見つかりません')}
        message={t('URL が正しいか確認してください。イベントが削除された可能性もあります。')}
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

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{event.title}</h1>
          {event.closed && (
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {t('締切済み')}
            </span>
          )}
        </div>
        <EventSummary event={event} />
        {manageToken && (
          <TextLink to={managePath(event.id, manageToken)} className="inline-block">
            {t('このイベントを編集する（管理ページ）')}
          </TextLink>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-bold">{t('回答状況')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {event.answers.length} {t('名が回答済み')}
          </p>
        </div>
        <div className="mt-3">
          <AnswerGrid
            candidates={event.candidates}
            answers={event.answers}
            highlightAnswerId={myAnswer?.id ?? null}
          />
        </div>

        {event.answers.some((a) => a.message) && (
          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            {event.answers
              .filter((a) => a.message)
              .map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{a.name}</span>
                  <span className="mx-1.5 text-slate-300">|</span>
                  <span className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                    {a.message}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-base font-bold">
          {myAnswer ? t('自分の回答を編集') : t('出欠を回答する')}
        </h2>

        {event.closed ? (
          <div className="mt-3">
            <Alert variant="warning">
              {t('このイベントは締め切られているため、回答できません。')}
            </Alert>
          </div>
        ) : (
          <>
            {justSaved && (
              <div className="mt-3">
                <Alert variant="success">{t('回答を保存しました。')}</Alert>
              </div>
            )}
            {formError && (
              <div className="mt-3">
                <Alert variant="error">{formError}</Alert>
              </div>
            )}
            {keyIsStale && (
              <div className="mt-3">
                <Alert variant="warning">
                  {t(
                    '回答編集 URL に対応する回答が見つかりません。すでに削除された可能性があります。',
                  )}
                </Alert>
              </div>
            )}
            {myAnswer && mine && (
              <div className="mt-3">
                <ShareLinkBox
                  label={t('回答編集 URL')}
                  description={t(
                    'あとで回答を変更・削除するにはこの URL が必要です。ページを閉じる前にブックマークするか自分宛てに送ってください。他の人には共有しないでください。',
                  )}
                  url={answerEditUrl(eventId, mine)}
                  tone="warning"
                />
              </div>
            )}

            <div className="mt-4">
              {/* key を変えることで、対象が変わったときに下書きを作り直す */}
              <AnswerForm
                key={`${event.id}:${myAnswer?.id ?? 'new'}:${event.candidates.map((c) => c.id).join(',')}`}
                candidates={event.candidates}
                initialDraft={initialDraft}
                onSubmit={(draft) => void save(draft)}
                submitting={submitting}
                mode={myAnswer ? 'edit' : 'create'}
              />
            </div>

            {myAnswer && (
              <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={submitting}
                  onClick={() => void removeMyAnswer()}
                >
                  {t('自分の回答を削除')}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <ShareLinkBox label={t('このイベントの共有 URL')} url={shareUrl(event.id)} qrCode />
    </div>
  );
}

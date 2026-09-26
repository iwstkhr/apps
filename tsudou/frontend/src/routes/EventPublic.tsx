import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router';
import { AnswerForm } from '../components/AnswerForm';
import { AnswerGrid } from '../components/AnswerGrid';
import { EventSummary } from '../components/EventSummary';
import { ShareLinkBox } from '../components/ShareLinkBox';
import { TextLink } from '../components/TextLink';
import { Alert, Button, Card, LoadingBlock, MessageCard } from '../components/ui';
import { type AnswerDraft, draftFromAnswer, draftToChoices, emptyDraft } from '../lib/answerDraft';
import { deleteAnswer, submitAnswer, updateAnswer } from '../lib/api';
import { setAnswerKey, useAnswerKey, useManageToken } from '../lib/keyring';
import { answerEditUrl, managePath, readAnswerKeyFromHash, shareUrl, stripHash } from '../lib/urls';
import { useAsyncAction } from '../lib/useAsyncAction';
import { useEvent } from '../lib/useEvent';
import { useFlash } from '../lib/useFlash';

export function EventPublic() {
  const { eventId } = useParams();
  const location = useLocation();
  const { event, loading, error, notFound, reload } = useEvent(eventId);

  // 回答編集キーは共有 PC で他人に使われないよう、ブラウザには保存せずメモリにだけ持つ。
  // 回答した直後か、回答編集 URL (#a=...&k=...) から開いたときにだけ入る。
  const mine = useAnswerKey(eventId);
  const manageToken = useManageToken(eventId);

  // 編集キーをメモリに取り込んだらすぐにフラグメントを消し、
  // アドレスバーからの共有や、戻る/進むでの再表示で漏れないようにする。
  useEffect(() => {
    const key = readAnswerKeyFromHash(location.hash);
    if (!eventId || !key) return;
    setAnswerKey(eventId, key);
    stripHash();
  }, [eventId, location.hash]);

  const { pending: submitting, error: formError, run } = useAsyncAction();
  const [justSaved, flashSaved] = useFlash();

  if (loading && !event) {
    return <LoadingBlock />;
  }

  if (notFound) {
    return (
      <MessageCard title="イベントが見つかりません">
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          URL が正しいか確認してください。イベントが削除された可能性もあります。
        </p>
        <TextLink to="/" className="mt-4 inline-block">
          トップへ戻る
        </TextLink>
      </MessageCard>
    );
  }

  if (error || !event || !eventId) {
    return (
      <Alert variant="error" title="読み込みに失敗しました">
        {error ?? '不明なエラーが発生しました'}
      </Alert>
    );
  }

  // 編集キーを持っていて、かつサーバ側にもその回答が残っている場合だけ「自分の回答」
  const myAnswer = mine ? event.answers.find((a) => a.id === mine.answerId) : undefined;
  const keyIsStale = mine !== null && myAnswer === undefined;

  const initialDraft = myAnswer
    ? draftFromAnswer(event.candidates, myAnswer)
    : emptyDraft(event.candidates);

  const save = (draft: AnswerDraft) =>
    run(async () => {
      const choices = draftToChoices(event.candidates, draft);
      const message = draft.message.trim() === '' ? null : draft.message.trim();

      if (myAnswer && mine) {
        await updateAnswer({
          answerId: myAnswer.id,
          editToken: mine.editToken,
          name: draft.name.trim(),
          message,
          choices,
        });
      } else {
        const { answer, editToken } = await submitAnswer({
          eventId,
          name: draft.name.trim(),
          message,
          choices,
        });
        // 編集キーはここでしか受け取れない。画面に回答編集 URL を出して持ち帰ってもらう
        setAnswerKey(eventId, { answerId: answer.id, editToken });
      }

      flashSaved();
      await reload();
    });

  const removeMyAnswer = () => {
    if (!myAnswer || !mine) return;
    if (!window.confirm('自分の回答を削除します。よろしいですか?')) return;

    void run(async () => {
      await deleteAnswer({ answerId: myAnswer.id, editToken: mine.editToken });
      setAnswerKey(eventId, null);
      await reload();
    });
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{event.title}</h1>
          {event.closed && (
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              締切済み
            </span>
          )}
        </div>
        <EventSummary event={event} />
        {manageToken && (
          <TextLink to={managePath(event.id, manageToken)} className="inline-block">
            このイベントを編集する（管理ページ）
          </TextLink>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-bold">回答状況</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {event.answers.length} 名が回答済み
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
        <h2 className="text-base font-bold">{myAnswer ? '自分の回答を編集' : '出欠を回答する'}</h2>

        {event.closed ? (
          <div className="mt-3">
            <Alert variant="warning">このイベントは締め切られているため、回答できません。</Alert>
          </div>
        ) : (
          <>
            {justSaved && (
              <div className="mt-3">
                <Alert variant="success">回答を保存しました。</Alert>
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
                  回答編集 URL に対応する回答が見つかりません。すでに削除された可能性があります。
                </Alert>
              </div>
            )}
            {myAnswer && mine && (
              <div className="mt-3">
                <ShareLinkBox
                  label="回答編集 URL"
                  description="あとで回答を変更・削除するにはこの URL が必要です。ページを閉じる前にブックマークするか自分宛てに送ってください。他の人には共有しないでください。"
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
                <Button variant="danger" size="sm" disabled={submitting} onClick={removeMyAnswer}>
                  自分の回答を削除
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <ShareLinkBox label="このイベントの共有 URL" url={shareUrl(event.id)} />
    </div>
  );
}

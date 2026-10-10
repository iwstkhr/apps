import { type AnswerDraft, draftFromAnswer, draftToChoices, emptyDraft } from './answerDraft';
import { deleteAnswer, submitAnswer, updateAnswer } from './api';
import { t } from './i18n';
import { setAnswerKey, useManageToken } from './keyring';
import { useAsyncAction } from './useAsyncAction';
import { useEvent } from './useEvent';
import { useAnswerKeyFromHash } from './useEventKeys';
import { useFlash } from './useFlash';

/** 公開イベントの取得、本人の回答、保存・削除後の再取得をまとめる。 */
export function usePublicEvent(eventId: string | undefined, hash: string) {
  const state = useEvent(eventId);
  const { event, reload } = state;
  const mine = useAnswerKeyFromHash(eventId, hash);
  const manageToken = useManageToken(eventId);
  const { pending: submitting, error: formError, run } = useAsyncAction();
  const [justSaved, flashSaved] = useFlash();

  // 編集キーを持っていて、かつサーバ側にもその回答が残っている場合だけ「自分の回答」
  const myAnswer = mine ? event?.answers.find((a) => a.id === mine.answerId) : undefined;
  const keyIsStale = event !== null && mine !== null && myAnswer === undefined;

  const initialDraft = myAnswer
    ? draftFromAnswer(event?.candidates ?? [], myAnswer)
    : emptyDraft(event?.candidates ?? []);

  const save = (draft: AnswerDraft) => {
    if (!event || !eventId) return;
    return run(async () => {
      const body = {
        name: draft.name.trim(),
        message: draft.message.trim() || null,
        choices: draftToChoices(event.candidates, draft),
      };

      if (myAnswer && mine) {
        await updateAnswer({ answerId: myAnswer.id, editToken: mine.editToken, ...body });
      } else {
        const { answer, editToken } = await submitAnswer({ eventId, ...body });
        // 編集キーはここでしか受け取れない。画面に回答編集 URL を出して持ち帰ってもらう
        setAnswerKey(eventId, { answerId: answer.id, editToken });
      }

      flashSaved();
      await reload();
    });
  };

  const removeMyAnswer = () => {
    if (!eventId || !myAnswer || !mine) return;
    if (!window.confirm(t('自分の回答を削除します。よろしいですか?'))) return;

    return run(async () => {
      await deleteAnswer({ answerId: myAnswer.id, editToken: mine.editToken });
      setAnswerKey(eventId, null);
      await reload();
    });
  };

  return {
    ...state,
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
  };
}

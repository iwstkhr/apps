import { type AnswerDraft, draftFromAnswer, draftToChoices, emptyDraft } from './answer-draft';
import { deleteAnswer, submitAnswer, updateAnswer } from './api';
import { useConfirm } from './confirm';
import { t } from './i18n';
import { setAnswerKey, useManageToken } from './keyring';
import { useAsyncAction } from './use-async-action';
import { useEvent } from './use-event';
import { useAnswerKeyFromHash } from './use-event-keys';
import { useFlash } from './use-flash';

/** Bundles fetching the public event, the user's own response, and refetching after saving or deleting. */
export function usePublicEvent(eventId: string | undefined, hash: string) {
  const state = useEvent(eventId);
  const { event, reload } = state;
  const mine = useAnswerKeyFromHash(eventId, hash);
  const manageToken = useManageToken(eventId);
  const { pending: submitting, error: formError, run } = useAsyncAction();
  const confirm = useConfirm();
  const [justSaved, flashSaved] = useFlash();

  // It is "your response" only when you hold the edit key and the server still has that response
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
        // The edit key can only be received here. Show the response edit URL so the user can keep it
        setAnswerKey(eventId, { answerId: answer.id, editToken });
      }

      flashSaved();
      await reload();
    });
  };

  const removeMyAnswer = async () => {
    if (!eventId || !myAnswer || !mine) return;
    const ok = await confirm({
      message: t('自分の回答を削除します。よろしいですか?'),
      confirmLabel: t('削除'),
    });
    if (!ok) return;

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

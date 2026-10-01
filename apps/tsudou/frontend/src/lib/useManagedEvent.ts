import { useNavigate } from 'react-router';
import { deleteAnswer, deleteEvent, updateEvent } from './api';
import type { EventFormInput } from './eventForm';
import { t } from './i18n';
import { forgetEventKeys } from './keyring';
import { useAsyncAction } from './useAsyncAction';
import { useEvent } from './useEvent';
import { useManageTokenFromHash } from './useEventKeys';
import { useFlash } from './useFlash';

/** 管理画面の保存・締切・削除と、キャッシュ・鍵・遷移の後処理をまとめる。 */
export function useManagedEvent(eventId: string | undefined, hash: string) {
  const navigate = useNavigate();
  const state = useEvent(eventId);
  const { event, replace, reload, forget } = state;
  const manageToken = useManageTokenFromHash(eventId, hash);
  const { pending: saving, error: formError, run } = useAsyncAction();
  const [saved, flashSaved] = useFlash();

  const save = (values: EventFormInput) => {
    if (!eventId || !event || !manageToken) return;
    return run(async () => {
      replace(await updateEvent({ eventId, manageToken, ...values }));
      flashSaved();
    });
  };

  const toggleClosed = () => {
    if (!eventId || !event || !manageToken) return;
    return run(async () => {
      replace(await updateEvent({ eventId, manageToken, closed: !event.closed }));
    });
  };

  const removeAnswer = (answerId: string, name: string) => {
    if (!eventId || !event || !manageToken) return;
    if (!window.confirm(t('「{0}」の回答を削除します。よろしいですか?', [name]))) return;
    return run(async () => {
      await deleteAnswer({ answerId, manageToken });
      await reload();
    });
  };

  const removeEvent = () => {
    if (!eventId || !event || !manageToken) return;
    if (!window.confirm(t('イベントと、すべての回答を削除します。元に戻せません。よろしいですか?')))
      return;
    return run(async () => {
      await deleteEvent(eventId, manageToken);
      forgetEventKeys(eventId);
      forget();
      void navigate('/');
    });
  };

  return {
    ...state,
    manageToken,
    saving,
    formError,
    saved,
    save,
    toggleClosed,
    removeAnswer,
    removeEvent,
  };
}

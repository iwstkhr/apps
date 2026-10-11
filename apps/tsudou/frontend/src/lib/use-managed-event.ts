import { useNavigate } from 'react-router';
import { deleteAnswer, deleteEvent, updateEvent } from './api';
import { useConfirm } from './confirm';
import type { EventFormInput } from './event-form';
import { t } from './i18n';
import { forgetEventKeys } from './keyring';
import { useAsyncAction } from './use-async-action';
import { useEvent } from './use-event';
import { useManageTokenFromHash } from './use-event-keys';
import { useFlash } from './use-flash';

/** Bundles saving, closing, and deleting on the manage page with the follow-up for cache, keys, and navigation. */
export function useManagedEvent(eventId: string | undefined, hash: string) {
  const navigate = useNavigate();
  const state = useEvent(eventId);
  const { event, replace, reload, forget } = state;
  const manageToken = useManageTokenFromHash(eventId, hash);
  const { pending: saving, error: formError, run } = useAsyncAction();
  const confirm = useConfirm();
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

  const removeAnswer = async (answerId: string, name: string) => {
    if (!eventId || !event || !manageToken) return;
    const ok = await confirm({
      message: t('「{0}」の回答を削除します。よろしいですか?', [name]),
      confirmLabel: t('削除'),
    });
    if (!ok) return;
    return run(async () => {
      await deleteAnswer({ answerId, manageToken });
      await reload();
    });
  };

  const removeEvent = async () => {
    if (!eventId || !event || !manageToken) return;
    const ok = await confirm({
      message: t('イベントと、すべての回答を削除します。元に戻せません。よろしいですか?'),
      confirmLabel: t('イベントを削除'),
    });
    if (!ok) return;
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

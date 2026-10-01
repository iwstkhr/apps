import { useForm } from '@tanstack/react-form';
import { candidatesToDrafts } from '../lib/candidateDraft';
import { type EventFormInput, type EventFormValues, eventFormToInput } from '../lib/eventForm';
import { t, useLanguage } from '../lib/i18n';
import type { EventView } from '../lib/types';
import { EventFormFields } from './EventFormFields';
import { Alert, Button } from './ui';

export type EventEditValues = EventFormInput;

/**
 * 編集フォームの状態は TanStack Form が持つ。呼び出し側は key={event.id} で
 * 作り直すことで defaultValues を入れ替えるため、エフェクトでの同期が要らない。
 */
export function EventEditForm({
  event,
  saving,
  saved,
  error,
  onSave,
}: {
  event: EventView;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSave: (values: EventEditValues) => void;
}) {
  useLanguage();
  const form = useForm({
    defaultValues: {
      title: event.title,
      fee: event.fee == null ? '' : String(event.fee),
      memo: event.memo ?? '',
      candidates: candidatesToDrafts(event.candidates),
    } satisfies EventFormValues,
    onSubmit: ({ value }) => {
      onSave(eventFormToInput(value));
    },
  });

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <EventFormFields form={form} disabled={saving} />

      {saved && <Alert variant="success">{t('保存しました。')}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* 検証エラーが残っている間は送信させない */}
      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button type="submit" loading={saving} disabled={!canSubmit}>
            {t('変更を保存')}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

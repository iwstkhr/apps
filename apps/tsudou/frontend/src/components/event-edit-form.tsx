import { useForm } from '@tanstack/react-form';
import { candidatesToDrafts } from '../lib/candidate-draft';
import { type EventFormInput, type EventFormValues, eventFormToInput } from '../lib/event-form';
import { t, useLanguage } from '../lib/i18n';
import type { EventView } from '../lib/types';
import { EventFormFields } from './event-form-fields';
import { Alert, Button } from './ui';

/**
 * TanStack Form holds the edit form state. The caller recreates it with key={event.id}
 * to swap defaultValues, so no syncing in an effect is needed.
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
  onSave: (values: EventFormInput) => void;
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

      {/* Block submission while validation errors remain */}
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

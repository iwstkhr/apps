import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { RETENTION_MONTHS } from '@tsudou/shared/limits';
import { Link, useNavigate } from 'react-router';
import { EventFormFields } from '../components/event-form-fields';
import { Alert, Button, Card } from '../components/ui';
import { createEvent } from '../lib/api';
import { defaultCandidate } from '../lib/candidate-draft';
import { errorMessage } from '../lib/errors';
import { type EventFormValues, eventFormToInput } from '../lib/event-form';
import { t, useLanguage } from '../lib/i18n';
import { setManageToken } from '../lib/keyring';

export function Home() {
  useLanguage();
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: createEvent,
    onSuccess: ({ eventId, manageToken }) => {
      // The manage token can only be received here. Keep it in memory and show the manage URL on the created screen
      setManageToken(eventId, manageToken);
      void navigate(`/e/${eventId}/created`);
    },
  });
  const error = create.error ? errorMessage(create.error) : null;

  const form = useForm({
    defaultValues: {
      title: '',
      fee: '',
      memo: '',
      candidates: [defaultCandidate()],
    } satisfies EventFormValues,
    // The form's isSubmitting shows the submitting state, so just wait for completion here.
    // Failures go into create.error, so the exception stops here
    onSubmit: ({ value }) => create.mutateAsync(eventFormToInput(value)).catch(() => {}),
  });

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-lg font-bold">{t('イベントを作成')}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('作成すると共有用の URL が発行されます。参加予定者はログインなしで回答できます。')}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('作成したイベントと回答は、作成から')}
          {RETENTION_MONTHS}
          {t('ヶ月後に自動削除されます。')}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('はじめての方は')}
          <Link to="/guide" className="text-indigo-600 hover:underline dark:text-indigo-400">
            {t('使い方')}
          </Link>
          {t('をご覧ください。')}
        </p>

        <form
          className="mt-5 space-y-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Subscribe
            selector={(state) => ({ isSubmitting: state.isSubmitting, canSubmit: state.canSubmit })}
          >
            {({ isSubmitting, canSubmit }) => (
              <>
                <EventFormFields form={form} disabled={isSubmitting} rejectPastCandidates />

                {error && <Alert variant="error">{error}</Alert>}

                {/* Block submission while validation errors remain (it can be pressed while untouched, and pressing runs validation) */}
                <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
                  {t('イベントを作成して URL を発行')}
                </Button>
              </>
            )}
          </form.Subscribe>
        </form>
      </Card>
    </div>
  );
}

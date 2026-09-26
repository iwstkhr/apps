import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { RETENTION_MONTHS } from '@tsudou/shared/limits';
import { Link, useNavigate } from 'react-router';
import { EventFormFields, type EventFormValues } from '../components/EventFormFields';
import { Alert, Button, Card } from '../components/ui';
import { createEvent } from '../lib/api';
import { candidatesToInput, defaultCandidate } from '../lib/candidateDraft';
import { errorMessage } from '../lib/errors';
import { parseFeeValue } from '../lib/formValidators';
import { t, useLanguage } from '../lib/i18n';
import { setManageToken } from '../lib/keyring';

export function Home() {
  useLanguage();
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: createEvent,
    onSuccess: ({ eventId, manageToken }) => {
      // 管理トークンはここでしか受け取れない。メモリに持ったまま作成完了画面で管理用 URL を見せる
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
    // 送信中の表示はフォームの isSubmitting で出すので、ここでは完了まで待つ。
    // 失敗は create.error に入るので、例外はここで止める
    onSubmit: ({ value }) =>
      create
        .mutateAsync({
          title: value.title.trim(),
          fee: parseFeeValue(value.fee),
          memo: value.memo.trim() === '' ? null : value.memo.trim(),
          candidates: candidatesToInput(value.candidates),
        })
        .catch(() => {}),
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

                {/* 検証エラーが残っている間は送信させない (未操作のうちは押せ、押すと検証が走る) */}
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

import { useForm } from '@tanstack/react-form';
import { LIMITS } from '@tsudou/shared/limits';
import type { AnswerDraft } from '../lib/answer-draft';
import { cx } from '../lib/cx';
import { validateMessageValue, validateNameValue } from '../lib/form-validators';
import { formatDateTime } from '../lib/format';
import { t, useLanguage } from '../lib/i18n';
import { type AnswerStatus, type Candidate, STATUS_LABEL, STATUS_MARK } from '../lib/types';
import { fieldError } from './field-error';
import { Button, Field, Input, Textarea } from './ui';

const STATUSES: readonly AnswerStatus[] = ['YES', 'MAYBE', 'NO'];

const SELECTED_CLASS: Record<AnswerStatus, string> = {
  YES: 'bg-emerald-600 text-white ring-emerald-600',
  MAYBE: 'bg-amber-500 text-white ring-amber-500',
  NO: 'bg-slate-500 text-white ring-slate-500',
};

/**
 * 下書きの状態は TanStack Form が持つ。
 * 対象が変わったとき (別のイベント / 自分の回答の有無) は呼び出し側が key を変えて
 * 作り直すことで初期値を入れ替える。親のエフェクトで setState する必要がない。
 */
export function AnswerForm({
  candidates,
  initialDraft,
  onSubmit,
  submitting,
  mode,
}: {
  candidates: readonly Candidate[];
  initialDraft: AnswerDraft;
  onSubmit: (draft: AnswerDraft) => void;
  submitting: boolean;
  mode: 'create' | 'edit';
}) {
  useLanguage();
  const form = useForm({
    defaultValues: initialDraft,
    onSubmit: ({ value }) => onSubmit(value),
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
      <form.Field name="name" validators={{ onChange: ({ value }) => validateNameValue(value) }}>
        {(field) => (
          <Field
            label={t('お名前')}
            required
            htmlFor={field.name}
            error={fieldError(field.state.meta)}
            hint={t('一覧に表示されます。')}
          >
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              maxLength={LIMITS.nameMax}
              autoComplete="name"
              placeholder={t('山田 太郎')}
              disabled={submitting}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      </form.Field>

      {/* 候補ごとの出欠はキー付きのオブジェクト1つとして扱う */}
      <form.Field name="choices">
        {(field) => {
          const setStatus = (candidateId: string, status: AnswerStatus) =>
            field.handleChange({ ...field.state.value, [candidateId]: status });

          /** 全候補をまとめて同じ回答にする (「全部だめ」などが1タップで済む)。 */
          const setAll = (status: AnswerStatus) =>
            field.handleChange(Object.fromEntries(candidates.map((c) => [c.id, status])));

          return (
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('参加できる日時')}
                  <span className="ml-1 text-red-600 dark:text-red-400">*</span>
                </p>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{t('一括:')}</span>
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={submitting}
                      onClick={() => setAll(status)}
                      className="rounded px-1.5 py-0.5 text-slate-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-slate-300"
                    >
                      {STATUS_MARK[status]}
                      {t(STATUS_LABEL[status])}
                    </button>
                  ))}
                </div>
              </div>

              <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200 ring-inset dark:divide-slate-800 dark:ring-slate-800">
                {candidates.map((candidate) => {
                  const current = field.state.value[candidate.id] ?? 'MAYBE';
                  return (
                    <li
                      key={candidate.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <span className="text-sm text-slate-800 dark:text-slate-100">
                        {formatDateTime(candidate.startAt)}
                      </span>
                      <div
                        role="radiogroup"
                        aria-label={t('{0} の出欠', [formatDateTime(candidate.startAt)])}
                        className="flex gap-1"
                      >
                        {STATUSES.map((status) => {
                          const selected = current === status;
                          return (
                            // biome-ignore lint/a11y/useSemanticElements: ボタン外観のまま radiogroup を組むため、input[type=radio] ではなく role で表現する
                            <button
                              key={status}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              disabled={submitting}
                              onClick={() => setStatus(candidate.id, status)}
                              className={cx(
                                'min-w-14 rounded-md px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                                'disabled:cursor-not-allowed disabled:opacity-60',
                                selected
                                  ? SELECTED_CLASS[status]
                                  : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800',
                              )}
                            >
                              {STATUS_MARK[status]} {t(STATUS_LABEL[status])}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        }}
      </form.Field>

      <form.Field
        name="message"
        validators={{ onChange: ({ value }) => validateMessageValue(value) }}
      >
        {(field) => (
          <Field
            label={t('メッセージ (任意)')}
            htmlFor={field.name}
            error={fieldError(field.state.meta)}
            hint={t('遅れて参加する、などの補足があれば。')}
          >
            <Textarea
              id={field.name}
              name={field.name}
              rows={3}
              maxLength={LIMITS.messageMax}
              value={field.state.value}
              disabled={submitting}
              placeholder={t('20時から合流します')}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      </form.Field>

      {/* 検証エラーが残っている間は送信させない (未操作のうちは押せ、押すと検証が走る) */}
      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button type="submit" loading={submitting} disabled={!canSubmit}>
            {mode === 'create' ? t('回答する') : t('回答を更新する')}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

import type { ReactFormExtendedApi } from '@tanstack/react-form';
import { LIMITS } from '@tsudou/shared/limits';
import type { EventFormValues } from '../lib/event-form';

import {
  validateCandidatesValue,
  validateFeeValue,
  validateMemoValue,
  validateTitleValue,
} from '../lib/form-validators';
import { t, useLanguage } from '../lib/i18n';
import { CandidateEditor } from './candidate-editor';
import { fieldError } from './field-error';
import { Field, Input, Textarea } from './ui';

/**
 * The form type returned by `useForm<EventFormValues>`.
 * TanStack Form has many type parameters, so validator types are accepted as roughly any
 * (this component only uses the shape of values).
 */
// biome-ignore-start lint/suspicious/noExplicitAny: accept TanStack Form type parameters as roughly any
export type EventForm = ReactFormExtendedApi<
  EventFormValues,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;
// biome-ignore-end lint/suspicious/noExplicitAny: only for the type alias

/**
 * Inputs for the event name, candidate dates, fee, and memo.
 * Shared so that creating (Home) and editing (EventEditForm) use the same validation rules.
 */
export function EventFormFields({
  form,
  disabled,
  rejectPastCandidates = false,
}: {
  form: EventForm;
  disabled: boolean;
  /** Reject past date-times only when creating. Editing allows saving with past candidates kept. */
  rejectPastCandidates?: boolean;
}) {
  useLanguage();
  return (
    <>
      <form.Field name="title" validators={{ onChange: ({ value }) => validateTitleValue(value) }}>
        {(field) => (
          <Field
            label={t('イベント名')}
            required
            htmlFor={field.name}
            error={fieldError(field.state.meta)}
          >
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              maxLength={LIMITS.titleMax}
              placeholder={t('新年会')}
              disabled={disabled}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      </form.Field>

      <form.Field
        name="candidates"
        validators={{
          onChange: ({ value }) =>
            validateCandidatesValue(value, { rejectPast: rejectPastCandidates }),
        }}
      >
        {(field) => (
          <Field
            label={t('日時の候補')}
            required
            error={fieldError(field.state.meta)}
            hint={t('参加予定者はこの候補ごとに ○ / △ / × で回答します。')}
          >
            <CandidateEditor
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              showRowErrors={field.state.meta.isTouched}
              max={LIMITS.candidatesMax}
              rejectPast={rejectPastCandidates}
              disabled={disabled}
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="fee" validators={{ onChange: ({ value }) => validateFeeValue(value) }}>
        {(field) => (
          <Field
            label={t('参加費 (任意)')}
            htmlFor={field.name}
            error={fieldError(field.state.meta)}
            hint={t('円。空欄なら「未設定」、0 なら「無料」と表示されます。')}
          >
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              inputMode="numeric"
              placeholder="3000"
              disabled={disabled}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="memo" validators={{ onChange: ({ value }) => validateMemoValue(value) }}>
        {(field) => (
          <Field
            label={t('メモ (任意)')}
            htmlFor={field.name}
            error={fieldError(field.state.meta)}
            hint={t('集合場所、持ち物、支払い方法など。')}
          >
            <Textarea
              id={field.name}
              name={field.name}
              rows={4}
              maxLength={LIMITS.memoMax}
              value={field.state.value}
              placeholder={t('集合: 渋谷駅ハチ公前\n会費は当日現金でお願いします')}
              disabled={disabled}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      </form.Field>
    </>
  );
}

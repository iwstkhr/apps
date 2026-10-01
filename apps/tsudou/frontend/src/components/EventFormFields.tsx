import type { ReactFormExtendedApi } from '@tanstack/react-form';
import { LIMITS } from '@tsudou/shared/limits';
import type { EventFormValues } from '../lib/eventForm';

import {
  validateCandidatesValue,
  validateFeeValue,
  validateMemoValue,
  validateTitleValue,
} from '../lib/formValidators';
import { t, useLanguage } from '../lib/i18n';
import { CandidateEditor } from './CandidateEditor';
import { fieldError } from './FieldError';
import { Field, Input, Textarea } from './ui';

/**
 * `useForm<EventFormValues>` が返すフォームの型。
 * TanStack Form は型引数が多いため、バリデータの型は any 相当で受ける
 * (このコンポーネントは values の形しか使わない)。
 */
// biome-ignore-start lint/suspicious/noExplicitAny: TanStack Form の型引数は any 相当で受ける
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
// biome-ignore-end lint/suspicious/noExplicitAny: 型エイリアスの範囲のみ

/**
 * イベント名・日時候補・参加費・メモの入力欄。
 * 作成 (Home) と編集 (EventEditForm) で同じ検証ルールを使うため共通化している。
 */
export function EventFormFields({
  form,
  disabled,
  rejectPastCandidates = false,
}: {
  form: EventForm;
  disabled: boolean;
  /** 作成時だけ過去の日時を拒否する。編集では開催済みの候補を残したまま保存できるようにする。 */
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

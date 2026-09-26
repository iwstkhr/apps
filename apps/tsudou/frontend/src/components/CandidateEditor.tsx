import { useId } from 'react';
import { type CandidateDraft, defaultCandidate, nextCandidateAfter } from '../lib/candidateDraft';
import { cx } from '../lib/cx';
import { toDateTimeLocal } from '../lib/format';
import { validateCandidateRow } from '../lib/formValidators';
import { t, useLanguage } from '../lib/i18n';
import { Button, Input } from './ui';

/**
 * 候補日時の一覧エディタ。TanStack Form の配列フィールド1つ
 * （`candidates`）の値と変更ハンドラを受け取る。
 *
 * 配列全体のエラー（件数・重複）は呼び出し側の Field が表示し、
 * ここでは行ごとの未入力・形式エラーだけを出す。
 */
export function CandidateEditor({
  value,
  onChange,
  onBlur,
  showRowErrors = false,
  max = 30,
  rejectPast = false,
  disabled = false,
}: {
  value: CandidateDraft[];
  onChange: (next: CandidateDraft[]) => void;
  onBlur?: () => void;
  /** 行ごとのエラーを表示するか (フィールドが touched になってから true にする)。 */
  showRowErrors?: boolean;
  max?: number;
  /** 過去の日時を拒否する (イベント作成時)。ピッカーでも選べないよう min を付ける。 */
  rejectPast?: boolean;
  disabled?: boolean;
}) {
  useLanguage();
  const baseId = useId();
  const min = rejectPast ? toDateTimeLocal(new Date().toISOString()) : undefined;

  const update = (index: number, next: Partial<CandidateDraft>) => {
    onChange(value.map((draft, i) => (i === index ? { ...draft, ...next } : draft)));
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange(
      value.length === 0 ? [defaultCandidate()] : [...value, nextCandidateAfter(value.at(-1))],
    );
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {value.map((draft, index) => {
          const rowError = showRowErrors ? validateCandidateRow(draft, { rejectPast }) : undefined;
          const rowId = `${baseId}-${index}`;

          return (
            <li key={draft.id ?? `new-${index}`}>
              <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]">
                <span className="w-6 shrink-0 text-right text-sm text-slate-400 tabular-nums">
                  {index + 1}.
                </span>
                <Input
                  id={rowId}
                  className="min-w-0"
                  type="datetime-local"
                  value={draft.value}
                  min={min}
                  disabled={disabled}
                  aria-label={t('候補 {0} の日時', [index + 1])}
                  aria-invalid={rowError ? true : undefined}
                  aria-describedby={rowError ? `${rowId}-error` : undefined}
                  onChange={(e) => update(index, { value: e.target.value })}
                  onBlur={onBlur}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || value.length <= 1}
                  aria-label={t('候補 {0} を削除', [index + 1])}
                  onClick={() => remove(index)}
                  className={cx(
                    'col-start-2 justify-self-end sm:col-start-3 sm:row-start-1',
                    value.length <= 1 && 'invisible',
                  )}
                >
                  {t('削除')}
                </Button>
              </div>
              {rowError && (
                <p
                  id={`${rowId}-error`}
                  className="mt-1 ml-8 text-xs text-red-600 dark:text-red-400"
                >
                  {t(rowError)}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || value.length >= max}
        onClick={add}
      >
        {t('＋ 候補を追加')}
      </Button>
      {value.length >= max && (
        <p className="text-xs text-slate-500">
          {t('候補は')}
          {max}
          {t('件までです。')}
        </p>
      )}
    </div>
  );
}

import { useId, useState } from 'react';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '~/lib/styles';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  type Priority,
  parseTagText,
  type TodoInput,
} from '~/types/todo';

const EMPTY_INPUT: TodoInput = { title: '', memo: '', priority: 'medium', dueDate: null, tags: [] };

interface TodoFormProps {
  initial?: TodoInput;
  submitLabel: string;
  onSubmit: (input: TodoInput) => void | Promise<void>;
  onCancel?: () => void;
  /** 追加フォームでは詳細項目を畳んでおく */
  collapsible?: boolean;
  /** 既存のタグ (入力候補) */
  tagSuggestions?: string[];
}

export function TodoForm({
  initial = EMPTY_INPUT,
  submitLabel,
  onSubmit,
  onCancel,
  collapsible = false,
  tagSuggestions = [],
}: TodoFormProps) {
  const id = useId();
  const [title, setTitle] = useState(initial.title);
  const [memo, setMemo] = useState(initial.memo);
  const [priority, setPriority] = useState<Priority>(initial.priority);
  const [dueDate, setDueDate] = useState(initial.dueDate ?? '');
  const [tagText, setTagText] = useState(initial.tags.join(', '));
  const [expanded, setExpanded] = useState(!collapsible);

  const canSubmit = title.trim() !== '';

  const reset = () => {
    setTitle(EMPTY_INPUT.title);
    setMemo(EMPTY_INPUT.memo);
    setPriority(EMPTY_INPUT.priority);
    setDueDate('');
    setTagText('');
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!canSubmit) return;
        const input: TodoInput = {
          title: title.trim(),
          memo,
          priority,
          dueDate: dueDate || null,
          tags: parseTagText(tagText),
        };
        // 保存を待たずに空にして、続けて入力した文字が消えたり前の入力に混ざったりしないようにする
        if (!initial.title) reset();
        await onSubmit(input);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && onCancel) onCancel();
      }}
    >
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="やること"
          aria-label="タイトル"
          maxLength={200}
          // biome-ignore lint/a11y/noAutofocus: 編集を始めたらすぐ入力できるようにする
          autoFocus={Boolean(onCancel)}
        />
        {collapsible && (
          <button
            type="button"
            className={`${secondaryButtonClass} shrink-0 whitespace-nowrap`}
            aria-expanded={expanded}
            aria-controls={`${id}-details`}
            onClick={() => setExpanded((value) => !value)}
          >
            詳細
          </button>
        )}
        {/* 編集フォームでは保存をキャンセルと並べて下に置く */}
        {!onCancel && (
          <button type="submit" className={`${primaryButtonClass} shrink-0`} disabled={!canSubmit}>
            {submitLabel}
          </button>
        )}
      </div>

      {expanded && (
        <div id={`${id}-details`} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <textarea
            className={`${inputClass} sm:col-span-3`}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="メモ"
            aria-label="メモ"
            rows={3}
          />
          <input
            className={inputClass}
            value={tagText}
            onChange={(event) => setTagText(event.target.value)}
            placeholder="タグ (カンマ区切り)"
            aria-label="タグ"
            list={`${id}-tags`}
          />
          <datalist id={`${id}-tags`}>
            {tagSuggestions.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
          <label className="flex items-center gap-1.5 text-sm">
            <span className="shrink-0 text-slate-600 dark:text-slate-400">期限</span>
            <input
              type="date"
              className={inputClass}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-label="期限"
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <span className="shrink-0 text-slate-600 dark:text-slate-400">優先度</span>
            <select
              className={inputClass}
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
              aria-label="優先度"
            >
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {onCancel && (
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onCancel}>
            キャンセル
          </button>
          <button type="submit" className={`${primaryButtonClass} shrink-0`} disabled={!canSubmit}>
            {submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}

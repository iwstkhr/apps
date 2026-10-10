import { useEffect, useId, useState } from 'react';
import { FolderSelect } from '~/components/folder/folder-select';
import { t } from '~/lib/i18n';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '~/lib/styles';
import type { Folder } from '~/types/folder';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  type Priority,
  parseTagText,
  type TodoInput,
} from '~/types/todo';

const EMPTY_INPUT: TodoInput = {
  title: '',
  memo: '',
  priority: 'medium',
  dueDate: null,
  tags: [],
  folderId: null,
};

interface TodoFormProps {
  initial?: TodoInput;
  submitLabel: string;
  onSubmit: (input: TodoInput) => void | Promise<void>;
  onCancel?: () => void;
  /** 追加フォームでは詳細項目を畳んでおく */
  collapsible?: boolean;
  /** 既存のタグ (入力候補) */
  tagSuggestions?: string[];
  folders?: Folder[];
  /** 追加フォームで入れる先のフォルダ。一覧で選んでいるフォルダに合わせて変わる */
  defaultFolderId?: string | null;
}

export function TodoForm({
  initial = EMPTY_INPUT,
  submitLabel,
  onSubmit,
  onCancel,
  collapsible = false,
  tagSuggestions = [],
  folders = [],
  defaultFolderId = null,
}: TodoFormProps) {
  const id = useId();
  const [title, setTitle] = useState(initial.title);
  const [memo, setMemo] = useState(initial.memo);
  const [priority, setPriority] = useState<Priority>(initial.priority);
  const [dueDate, setDueDate] = useState(initial.dueDate ?? '');
  const [tagText, setTagText] = useState(initial.tags.join(', '));
  const [folderId, setFolderId] = useState(initial.title ? initial.folderId : defaultFolderId);
  const [expanded, setExpanded] = useState(!collapsible);
  const isEditing = Boolean(initial.title);

  // 追加フォームは一覧で別のフォルダを選んだらそのフォルダに入れる
  useEffect(() => {
    if (!isEditing) setFolderId(defaultFolderId);
  }, [isEditing, defaultFolderId]);

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
          folderId,
        };
        // 保存を待たずに空にして、続けて入力した文字が消えたり前の入力に混ざったりしないようにする
        if (!isEditing) reset();
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
          placeholder={t('やること')}
          aria-label={t('タイトル')}
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
            {t('詳細')}
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
            placeholder={t('メモ')}
            aria-label={t('メモ')}
            rows={3}
          />
          <input
            className={inputClass}
            value={tagText}
            onChange={(event) => setTagText(event.target.value)}
            placeholder={t('タグ (カンマ区切り)')}
            aria-label={t('タグ')}
            list={`${id}-tags`}
          />
          <datalist id={`${id}-tags`}>
            {tagSuggestions.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
          <label className="flex items-center gap-1.5 text-sm">
            <span className="shrink-0 text-slate-600 dark:text-slate-400">{t('期限')}</span>
            <input
              type="date"
              className={inputClass}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-label={t('期限')}
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <span className="shrink-0 text-slate-600 dark:text-slate-400">{t('優先度')}</span>
            <select
              className={inputClass}
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
              aria-label={t('優先度')}
            >
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {t(PRIORITY_LABELS[value])}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1.5 text-sm sm:col-span-3">
            <span className="shrink-0 text-slate-600 dark:text-slate-400" aria-hidden="true">
              {t('フォルダ|項目')}
            </span>
            <FolderSelect
              className={inputClass}
              folders={folders}
              value={folderId}
              onChange={setFolderId}
              noneLabel={t('未分類')}
              aria-label={t('フォルダ|項目')}
            />
          </div>
        </div>
      )}

      {onCancel && (
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onCancel}>
            {t('キャンセル')}
          </button>
          <button type="submit" className={`${primaryButtonClass} shrink-0`} disabled={!canSubmit}>
            {submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}

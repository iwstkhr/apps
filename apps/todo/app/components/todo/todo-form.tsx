import { useEffect, useId, useRef, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { FolderSelect } from '~/components/folder/folder-select';
import { TagInput } from '~/components/todo/tag-input';
import { t } from '~/lib/i18n';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '~/lib/styles';
import type { Folder } from '~/types/folder';
import {
  normalizeTags,
  PRIORITIES,
  PRIORITY_LABELS,
  type Priority,
  parseTagText,
  REPEAT_FREQUENCIES,
  REPEAT_LABELS,
  type RepeatFrequency,
  type TodoInput,
} from '~/types/todo';

const EMPTY_INPUT: TodoInput = {
  title: '',
  memo: '',
  priority: 'medium',
  dueDate: null,
  tags: [],
  folderId: null,
  repeat: null,
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
  const [repeat, setRepeat] = useState<RepeatFrequency | null>(initial.repeat ?? null);
  const [tags, setTags] = useState(initial.tags);
  const [tagDraft, setTagDraft] = useState('');
  const [folderId, setFolderId] = useState(initial.title ? initial.folderId : defaultFolderId);
  const [expanded, setExpanded] = useState(!collapsible);
  const isEditing = Boolean(initial.title);
  // 追加フォーム (キャンセルがない) は検索欄と見分けられるよう、＋の印と「追加」と分かる文言を付ける
  const isAdding = !onCancel;
  const titleRef = useRef<HTMLInputElement>(null);

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
    setRepeat(null);
    setTags([]);
    setTagDraft('');
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!canSubmit) {
          // 追加ボタンは空でも押せる見た目にしているので、押されたらタイトル欄へ案内する
          titleRef.current?.focus();
          return;
        }
        const input: TodoInput = {
          title: title.trim(),
          memo,
          priority,
          dueDate: dueDate || null,
          tags: normalizeTags([...tags, ...parseTagText(tagDraft)]),
          folderId,
          repeat,
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
        <div className="relative min-w-0 flex-1">
          {isAdding && (
            <FaPlus
              className="pointer-events-none absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
          )}
          <input
            ref={titleRef}
            className={`${inputClass} ${isAdding ? 'pl-7' : ''}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t(isAdding ? '新しいタスクを入力…' : 'やること')}
            aria-label={t('タイトル')}
            maxLength={200}
            // biome-ignore lint/a11y/noAutofocus: 編集を始めたらすぐ入力できるようにする
            autoFocus={Boolean(onCancel)}
          />
        </div>
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
        {isAdding && (
          <button type="submit" className={`${primaryButtonClass} shrink-0`}>
            <FaPlus className="h-3 w-3" aria-hidden="true" />
            {submitLabel}
          </button>
        )}
      </div>

      {expanded && (
        <div id={`${id}-details`} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <textarea
            className={`${inputClass} sm:col-span-4`}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder={t('メモ')}
            aria-label={t('メモ')}
            rows={3}
          />
          <TagInput
            tags={tags}
            onTagsChange={setTags}
            draft={tagDraft}
            onDraftChange={setTagDraft}
            suggestions={tagSuggestions}
          />
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
            <span className="shrink-0 text-slate-600 dark:text-slate-400">{t('繰り返し')}</span>
            <select
              className={inputClass}
              value={repeat ?? ''}
              onChange={(event) =>
                setRepeat((event.target.value || null) as RepeatFrequency | null)
              }
              aria-label={t('繰り返し')}
            >
              <option value="">{t('なし')}</option>
              {REPEAT_FREQUENCIES.map((value) => (
                <option key={value} value={value}>
                  {t(REPEAT_LABELS[value])}
                </option>
              ))}
            </select>
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
          {/* 繰り返しは期限から次の回を数えるので、期限が無ければ今日から始めることを伝える */}
          {repeat !== null && dueDate === '' && (
            <p className="text-xs text-slate-500 sm:col-span-4 dark:text-slate-400">
              {t('期限が無いときは今日から始めます。')}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-sm sm:col-span-4">
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

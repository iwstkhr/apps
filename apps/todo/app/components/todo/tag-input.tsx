import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { t } from '~/lib/i18n';
import { normalizeTags, parseTagText } from '~/types/todo';

const SEPARATOR = /[,、，]/;

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  /** まだチップにしていない入力中の文字。確定せずに保存してもタグに含めるよう、フォームが持つ */
  draft: string;
  onDraftChange: (draft: string) => void;
  /** 既存のタグ (入力候補) */
  suggestions: readonly string[];
}

/**
 * 選んだタグをチップで並べる入力欄。WAI-ARIA の combobox パターンに沿って、
 * 打った文字で既存のタグを絞り込んだ候補を出す。候補に無い文字も Enter かカンマで新しいタグになる。
 * 1 つ選んでも候補は閉じず、続けて残りのタグを選べる。
 */
export function TagInput({ tags, onTagsChange, draft, onDraftChange, suggestions }: TagInputProps) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const query = draft.trim().toLowerCase();
  const options = suggestions.filter(
    (tag) => !tags.includes(tag) && tag.toLowerCase().includes(query),
  );
  const expanded = open && options.length > 0;
  const activeOption = expanded ? options[activeIndex] : undefined;
  const optionId = (index: number) => `${id}-option-${index}`;

  const addTags = (values: string[]) => onTagsChange(normalizeTags([...tags, ...values]));

  const select = (tag: string) => {
    addTags([tag]);
    onDraftChange('');
    setActiveIndex(-1);
  };

  const commitDraft = () => {
    addTags(parseTagText(draft));
    onDraftChange('');
  };

  const changeDraft = (value: string, composing: boolean) => {
    let next = value;
    // カンマを打ったり貼り付けたりしたら、最後のカンマまでをチップにする。IME の変換中は確定を待つ
    if (!composing && SEPARATOR.test(value)) {
      const parts = value.split(SEPARATOR);
      next = parts.pop() ?? '';
      addTags(parts);
    }
    // 「仕事, 家」のようにカンマの後に打った空白は、次のタグに含めない
    onDraftChange(next.trimStart());
    setOpen(true);
    setActiveIndex(-1);
  };

  const moveActive = (step: 1 | -1) => {
    setOpen(true);
    if (options.length === 0) return;
    setActiveIndex((index) => {
      if (!expanded || index < 0) return step === 1 ? 0 : options.length - 1;
      return (index + step + options.length) % options.length;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        moveActive(event.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Enter':
        // 選ぶものも打った文字も無いときは、フォームの送信に任せる
        if (activeOption) {
          event.preventDefault();
          select(activeOption);
        } else if (draft.trim()) {
          event.preventDefault();
          commitDraft();
        }
        break;
      case 'Escape':
        // 候補を閉じるだけにして、編集フォームのキャンセルまでは届けない
        if (expanded) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          setActiveIndex(-1);
        }
        break;
      case 'Backspace':
        if (draft === '' && tags.length > 0) onTagsChange(tags.slice(0, -1));
        break;
    }
  };

  return (
    <div className="relative">
      {/* 枠の空いたところを押しても入力欄にフォーカスが移るようにする。label で包むと、
          中で最初のボタン (先頭のチップの ×) が押されたことになるので使わない */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: マウスで押したときの補助で、キーボードでは入力欄に直接移れる */}
      <div
        className="flex w-full cursor-text flex-wrap items-center gap-1 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-800"
        onMouseDown={(event) => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-blue-50 pl-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          >
            #{tag}
            <button
              type="button"
              className="cursor-pointer rounded-full px-1.5 py-1 hover:bg-blue-100 dark:hover:bg-blue-900"
              aria-label={t('タグ「{0}」を削除', [tag])}
              title={t('タグ「{0}」を削除', [tag])}
              onClick={() => {
                onTagsChange(tags.filter((value) => value !== tag));
                inputRef.current?.focus();
              }}
            >
              <FaTimes className="h-2.5 w-2.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          role="combobox"
          className="min-w-24 flex-1 bg-transparent px-1 py-0.5 placeholder:text-slate-400 focus:outline-none"
          value={draft}
          onChange={(event) =>
            changeDraft(event.target.value, (event.nativeEvent as InputEvent).isComposing ?? false)
          }
          onCompositionEnd={(event) => changeDraft(event.currentTarget.value, false)}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          // 離れたときに打ちかけの文字をチップにすると、欄の高さが変わって押そうとした保存ボタンがずれる。
          // 文字のまま残し、保存するときにフォームがタグに含める
          onBlur={() => {
            setOpen(false);
            setActiveIndex(-1);
          }}
          placeholder={tags.length === 0 ? t('タグを追加') : ''}
          aria-label={t('タグ')}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-activedescendant={activeOption ? optionId(activeIndex) : undefined}
          autoComplete="off"
        />
      </div>
      {expanded && (
        <div
          id={listId}
          role="listbox"
          aria-label={t('タグの候補')}
          className="absolute top-full right-0 left-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {options.map((tag, index) => (
            // キーボードでは入力欄の矢印キーで選ぶので、候補自体にはフォーカスを移さない
            // biome-ignore lint/a11y/useKeyWithClickEvents: 上のとおり、キー操作は combobox が受け持つ
            <div
              key={tag}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              tabIndex={-1}
              className="cursor-pointer px-2.5 py-1 text-slate-700 hover:bg-slate-100 aria-selected:bg-blue-50 aria-selected:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:aria-selected:bg-blue-950 dark:aria-selected:text-blue-300"
              // 押しても入力欄からフォーカスを外さず、続けて選べるようにする
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(tag)}
            >
              #{tag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

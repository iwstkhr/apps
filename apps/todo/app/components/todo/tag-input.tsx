import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { t } from '~/lib/i18n';
import { normalizeTags, parseTagText } from '~/types/todo';

const SEPARATOR = /[,、，]/;

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  /** Text being typed that is not yet a chip. The form holds it so that it is included in the tags even when saved unconfirmed */
  draft: string;
  onDraftChange: (draft: string) => void;
  /** Existing tags (suggestions) */
  suggestions: readonly string[];
}

/**
 * An input that shows the selected tags as chips. Following the WAI-ARIA combobox pattern,
 * it suggests existing tags filtered by the typed text. Text that matches no suggestion also becomes a new tag with Enter or a comma.
 * Choosing one does not close the suggestions, so the remaining tags can be chosen in a row.
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
    // When a comma is typed or pasted, turn everything up to the last comma into chips. Wait for confirmation during IME composition
    if (!composing && SEPARATOR.test(value)) {
      const parts = value.split(SEPARATOR);
      next = parts.pop() ?? '';
      addTags(parts);
    }
    // Spaces typed after a comma, as in 「仕事, 家」, are not part of the next tag
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
        // When there is neither a suggestion to choose nor typed text, leave it to the form submission
        if (activeOption) {
          event.preventDefault();
          select(activeOption);
        } else if (draft.trim()) {
          event.preventDefault();
          commitDraft();
        }
        break;
      case 'Escape':
        // Only close the suggestions; do not let it reach the edit form's cancel
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
      {/* Clicking an empty part of the box also moves focus to the input. Wrapping it in a label is avoided
          because that counts as pressing the first button inside (the × of the first chip) */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a mouse convenience; keyboard users can move to the input directly */}
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
          // Turning the typed text into a chip on blur would change the box height and shift the save button being clicked.
          // Leave it as text; the form includes it in the tags when saving
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
            // Keyboard users choose with the input's arrow keys, so focus never moves to the suggestions themselves
            // biome-ignore lint/a11y/useKeyWithClickEvents: as above, the combobox handles key input
            <div
              key={tag}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              tabIndex={-1}
              className="cursor-pointer px-2.5 py-1 text-slate-700 hover:bg-slate-100 aria-selected:bg-blue-50 aria-selected:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:aria-selected:bg-blue-950 dark:aria-selected:text-blue-300"
              // Keep focus in the input when pressed so more can be chosen in a row
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

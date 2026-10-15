import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import {
  FaCheck,
  FaEllipsisH,
  FaFileExport,
  FaFileImport,
  FaGlobe,
  FaPalette,
  FaTrashAlt,
} from 'react-icons/fa';
import { ThemeDialog } from '~/components/layout/theme-dialog';
import { cn } from '~/lib/cn';
import { LANGUAGES, setLanguage, t, useLanguage } from '~/lib/i18n';

interface HeaderMenuProps {
  onExport: () => void;
  exportDisabled: boolean;
  onImport: () => void;
  onClearAll: () => void;
  clearAllDisabled: boolean;
}

const itemClass =
  'flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800';

/**
 * The 「メニュー」 at the right end of the header, grouping language, theme, export, import, and deleting all data.
 * Following the WAI-ARIA menu pattern, opening it focuses the first item, ↑↓ / Home / End move,
 * and Escape closes it and returns focus to the button. Tab and outside clicks also close it.
 */
export function HeaderMenu({
  onExport,
  exportDisabled,
  onImport,
  onClearAll,
  clearAllDisabled,
}: HeaderMenuProps) {
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const themeDialogRef = useRef<HTMLDialogElement>(null);

  const items = () => [
    ...(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []),
  ];

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  /** After an item is chosen, close the menu first and then act (so focus can move to a dialog, etc.). */
  const choose = (action: () => void) => {
    close();
    action();
  };

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const move = (next: number) => {
      event.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    };
    switch (event.key) {
      case 'ArrowDown':
        return move(index + 1);
      case 'ArrowUp':
        return move(index - 1);
      case 'Home':
        return move(0);
      case 'End':
        return move(list.length - 1);
      case 'Escape':
        event.preventDefault();
        return close();
      case 'Tab':
        // Tab closes the menu and moves on to the next element on the page
        setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="header-menu-button inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          // ↓ and ↑ also open it
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <FaEllipsisH aria-hidden="true" />
        {/* The name is 「メニュー」 at every width. On narrow screens it sits next to ☰ on the left, so the text is hidden and only read aloud */}
        <span className="sr-only lg:not-sr-only lg:ml-1.5">{t('メニュー')}</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t('メニュー')}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          // Set the colors here so the header colors (white text in dark themes) are not inherited
          className="absolute top-full right-0 z-30 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {/* biome-ignore lint/a11y/useSemanticElements: group is used to group menuitemradio inside role="menu" (fieldset cannot be a child of menu) */}
          <div role="group" aria-labelledby={`${menuId}-language`}>
            <p
              id={`${menuId}-language`}
              className="flex items-center gap-2 px-2.5 pt-1 pb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              <FaGlobe aria-hidden="true" />
              {t('言語')}
            </p>
            {LANGUAGES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={language === id}
                lang={id}
                className={itemClass}
                onClick={() => choose(() => setLanguage(id))}
              >
                <FaCheck
                  className={cn('w-3.5 shrink-0', language !== id && 'invisible')}
                  aria-hidden="true"
                />
                {label}
              </button>
            ))}
          </div>
          <hr className="my-1.5 border-slate-200 dark:border-slate-700" />
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => choose(() => themeDialogRef.current?.showModal())}
          >
            <FaPalette className="shrink-0" aria-hidden="true" />
            {t('テーマ…')}
          </button>
          <hr className="my-1.5 border-slate-200 dark:border-slate-700" />
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            // Use aria-disabled instead of disabled so that focus can still move to it
            aria-disabled={exportDisabled || undefined}
            title={t('すべての TODO を JSON ファイルに保存します')}
            onClick={() => {
              if (!exportDisabled) choose(onExport);
            }}
          >
            <FaFileExport className="shrink-0" aria-hidden="true" />
            {t('エクスポート')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            title={t('エクスポートした JSON ファイルを読み込みます')}
            onClick={() => choose(onImport)}
          >
            <FaFileImport className="shrink-0" aria-hidden="true" />
            {t('インポート')}
          </button>
          <hr className="my-1.5 border-slate-200 dark:border-slate-700" />
          <button
            type="button"
            role="menuitem"
            // Red, because it deletes everything (after a confirmation)
            className={cn(itemClass, 'text-red-700 dark:text-red-400')}
            aria-disabled={clearAllDisabled || undefined}
            title={t('すべての TODO とフォルダを削除します')}
            onClick={() => {
              if (!clearAllDisabled) choose(onClearAll);
            }}
          >
            <FaTrashAlt className="shrink-0" aria-hidden="true" />
            {t('すべてのデータを削除…')}
          </button>
        </div>
      )}

      <ThemeDialog ref={themeDialogRef} />
    </div>
  );
}

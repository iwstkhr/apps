import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { t, useLanguage } from '../lib/i18n';
import { LanguageSelect } from './language-select';
import { ThemeToggle } from './theme-toggle';

export function HeaderMenu() {
  useLanguage();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current?.querySelector('dialog[open]')) return;
      if (event.target instanceof Node && !ref.current?.contains(event.target)) setOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || ref.current?.querySelector('dialog[open]')) return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('メニュー')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800 dark:focus-visible:outline-indigo-400"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="size-4"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="hidden sm:inline">{t('メニュー')}</span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      >
        <Link
          to="/guide"
          onClick={() => setOpen(false)}
          className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t('使い方')}
        </Link>
        <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
        <LanguageSelect />
        <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
        <ThemeToggle />
      </div>
    </div>
  );
}

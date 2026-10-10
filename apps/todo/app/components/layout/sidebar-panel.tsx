import { type ReactNode, useEffect, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { cn } from '~/lib/cn';
import { t } from '~/lib/i18n';

interface SidebarPanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** 広い画面では常設、狭い画面では左から開くメニュー。 */
export function SidebarPanel({ open, onClose, children }: SidebarPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [desktop, setDesktop] = useState(true);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    setDesktop(media.matches);
    const update = () => {
      setDesktop(media.matches);
      if (media.matches) onClose();
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [onClose]);

  useEffect(() => {
    if (!open || desktop) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const background = [
      ...document.querySelectorAll<HTMLElement>('#app-header, #todo-main-column, #menu-toggle'),
    ];
    const previousInert = background.map((element) => element.inert);
    for (const element of background) element.inert = true;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Tab') {
        const controls = [
          ...panel.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
          ),
        ];
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      background.forEach((element, index) => {
        element.inert = previousInert[index];
      });
      previousFocus?.focus();
    };
  }, [open, desktop, onClose]);

  return (
    <>
      {open && !desktop && (
        <button
          type="button"
          aria-label={t('メニューの背景を閉じる')}
          tabIndex={-1}
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <div
        id="folder-panel"
        ref={panelRef}
        {...(open && !desktop
          ? { role: 'dialog', 'aria-modal': true, 'aria-label': t('メニュー') }
          : {})}
        aria-hidden={!open && !desktop ? true : undefined}
        inert={!open && !desktop ? true : undefined}
        className={cn(
          'theme-sidebar fixed inset-y-0 left-0 z-40 flex w-[min(20rem,85vw)] flex-col border-r border-slate-200 bg-white p-3 shadow-xl transition-[translate,visibility] duration-200 motion-reduce:transition-none lg:visible lg:static lg:z-auto lg:w-auto lg:min-h-0 lg:flex-1 lg:translate-x-0 lg:rounded-lg lg:border lg:p-2 lg:shadow-none dark:border-slate-800 dark:bg-slate-900',
          open ? 'visible translate-x-0' : 'invisible -translate-x-full',
        )}
      >
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 lg:hidden dark:border-slate-800">
          <span className="font-semibold">{t('メニュー')}</span>
          <button
            ref={closeRef}
            type="button"
            aria-label={t('メニューを閉じる')}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </>
  );
}

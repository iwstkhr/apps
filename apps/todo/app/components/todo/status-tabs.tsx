import { useEffect, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { StatusIcon } from '~/components/todo/status-icon';
import { cn } from '~/lib/cn';
import { t } from '~/lib/i18n';
import { STATUS_FILTER_OPTIONS, type StatusFilter } from '~/lib/todo-filters';

interface StatusTabsProps {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (value: StatusFilter) => void;
}

/**
 * Status filters laid out horizontally above the list, showing counts within the selected folder.
 * Text-only tabs are easy to miss, so they take a segmented form where the selected one is raised inside a bordered track.
 * On narrow screens they scroll horizontally instead of wrapping. The side with hidden tabs fades out
 * and shows an arrow, so it is clear that more tabs are there.
 */
export function StatusTabs({ value, counts, onChange }: StatusTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Whether tabs are hidden past the left / right edge
  const [hidden, setHidden] = useState({ start: false, end: false });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      // Allow 1px for rounding at fractional zoom levels
      const next = { start: scroller.scrollLeft > 1, end: scroller.scrollLeft < max - 1 };
      setHidden((current) =>
        current.start === next.start && current.end === next.end ? current : next,
      );
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    // Also watch the tabs, whose widths change with the counts and the language
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(scroller);
    for (const tab of scroller.children) observer?.observe(tab);
    return () => {
      scroller.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, []);

  // Laid over the edges instead of masking the scroller. Changing the scroller's style or contents mid-scroll
  // stops touch scrolling, so the hints stay mounted and only their opacity changes
  const hintClass =
    'pointer-events-none absolute inset-y-0 flex w-10 items-center from-slate-100 from-50% to-transparent text-slate-500 transition-opacity dark:from-slate-950 dark:text-slate-400';

  return (
    // A fieldset does not shrink below its content by default, so min-w-0 allows horizontal scrolling
    <fieldset className="relative flex w-fit min-w-0 max-w-full rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
      <legend className="sr-only">{t('ステータス')}</legend>
      {/* Keep the padding inside the scroller so the selected tab's ring is not clipped */}
      <div
        ref={scrollerRef}
        className="flex min-w-0 gap-1 overflow-x-auto p-1 [scrollbar-width:thin]"
      >
        {STATUS_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            className={cn(
              'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors',
              value === option.value
                ? 'bg-white font-semibold text-blue-800 shadow-sm ring-1 ring-blue-500 dark:bg-slate-800 dark:text-blue-200 dark:ring-blue-400'
                : 'text-slate-700 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800/60',
            )}
            onClick={() => onChange(option.value)}
          >
            <span className="flex items-center gap-2">
              <StatusIcon status={option.value} />
              {t(option.label)}
            </span>
            <span className="rounded-full bg-slate-200 px-1.5 text-xs font-normal tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {counts[option.value]}
            </span>
          </button>
        ))}
      </div>
      <span
        className={cn(
          hintClass,
          'left-0 justify-start rounded-l-lg bg-linear-to-r pl-1.5',
          !hidden.start && 'opacity-0',
        )}
        data-scroll-hint="start"
        aria-hidden="true"
      >
        <FaChevronLeft className="h-3 w-3" />
      </span>
      <span
        className={cn(
          hintClass,
          'right-0 justify-end rounded-r-lg bg-linear-to-l pr-1.5',
          !hidden.end && 'opacity-0',
        )}
        data-scroll-hint="end"
        aria-hidden="true"
      >
        <FaChevronRight className="h-3 w-3" />
      </span>
    </fieldset>
  );
}

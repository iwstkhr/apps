import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import { type ThemePreference, useTheme } from '../lib/theme';

const ICON_PROPS = {
  className: 'size-4',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  {
    value: 'system',
    label: 'システム設定に合わせる',
    icon: (
      <svg {...ICON_PROPS} aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
  {
    value: 'light',
    label: 'ライトテーマ',
    icon: (
      <svg {...ICON_PROPS} aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'ダークテーマ',
    icon: (
      <svg {...ICON_PROPS} aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="flex items-center gap-0.5 rounded-lg p-0.5 ring-1 ring-slate-200 ring-inset dark:ring-slate-700">
      <legend className="sr-only">テーマ</legend>
      {OPTIONS.map(({ value, label, icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={selected}
            title={label}
            onClick={() => setPreference(value)}
            className={cx(
              'rounded-md p-1.5 transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
              selected
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-50'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
            )}
          >
            {icon}
          </button>
        );
      })}
    </fieldset>
  );
}

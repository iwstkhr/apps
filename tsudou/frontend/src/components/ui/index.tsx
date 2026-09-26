import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';
import { cx } from '../../lib/cx';
import { t, useLanguage } from '../../lib/i18n';

// ------------------------------------------------------------------ Button

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
};

const BUTTON_VARIANTS = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600 disabled:bg-indigo-300 dark:disabled:bg-indigo-900',
  secondary:
    'bg-white text-slate-700 ring-1 ring-slate-300 ring-inset hover:bg-slate-50 focus-visible:outline-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-500 dark:text-slate-300 dark:hover:bg-slate-800',
  danger:
    'bg-white text-red-600 ring-1 ring-red-300 ring-inset hover:bg-red-50 focus-visible:outline-red-600 dark:bg-slate-800 dark:text-red-400 dark:ring-red-800 dark:hover:bg-red-950',
} as const;

/** ボタンの見た目。<a> をボタンとして見せたいとき (外部・新しいタブで開くリンク) にも使う。 */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
} = {}) {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-60',
    size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm',
    BUTTON_VARIANTS[variant],
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={buttonClassName({ variant, size, className })}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx('size-4 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ------------------------------------------------------------------- Field

const CONTROL_CLASS =
  'block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-slate-900 ring-1 ring-slate-300 ring-inset ' +
  'placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset ' +
  'dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:placeholder:text-slate-500';

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  useLanguage();
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
        {required && <span className="ml-1 text-red-600 dark:text-red-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {t(error)}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(CONTROL_CLASS, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(CONTROL_CLASS, 'resize-y', className)} />;
}

// ------------------------------------------------------------------- Alert

const ALERT_VARIANTS = {
  error:
    'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900',
  info: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-900',
  success:
    'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900',
  warning:
    'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900',
} as const;

export function Alert({
  variant = 'info',
  title,
  children,
}: {
  variant?: keyof typeof ALERT_VARIANTS;
  title?: string;
  children?: ReactNode;
}) {
  useLanguage();
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cx('rounded-lg px-4 py-3 text-sm ring-1 ring-inset', ALERT_VARIANTS[variant])}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && (
        <div className={cx(title && 'mt-1')}>
          {typeof children === 'string' ? t(children) : children}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------- Card

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cx(
        'rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ring-inset',
        'dark:bg-slate-900 dark:ring-slate-800',
        className,
      )}
    >
      {children}
    </section>
  );
}

// ------------------------------------------------------- 画面全体の状態表示

/** データ取得中のプレースホルダ。 */
export function LoadingBlock({ children = t('読み込み中...') }: { children?: ReactNode }) {
  useLanguage();
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
      <Spinner /> {children}
    </div>
  );
}

/**
 * 「見つかりません」「管理用 URL が必要です」のような、ページの代わりに出す案内。
 * 補足やリンクは children に渡す。
 */
export function MessageCard({
  title,
  align = 'center',
  className,
  children,
}: {
  title: string;
  align?: 'center' | 'start';
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card className={cx(align === 'center' && 'text-center', className)}>
      <h1 className="text-lg font-bold">{title}</h1>
      {children}
    </Card>
  );
}

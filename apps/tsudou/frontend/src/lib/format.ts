import { getLanguage, t } from './i18n';

const WEEKDAYS = {
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
} as const;

/** Strings that cannot be parsed give null. Each function decides its own fallback text. */
function parseDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

const pad = (n: number) => String(n).padStart(2, '0');

const hhmm = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const mdw = (date: Date) =>
  `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAYS[getLanguage()][date.getDay()]})`;

/** The `2026/10/3(金) 19:00` format. The year is omitted for upcoming candidates within the same year. */
export function formatDateTime(iso: string, options: { withYear?: boolean } = {}): string {
  const date = parseDate(iso);
  if (!date) return t('(不正な日時)');

  const withYear = options.withYear ?? date.getFullYear() !== new Date().getFullYear();
  return `${withYear ? `${date.getFullYear()}/` : ''}${mdw(date)} ${hhmm(date)}`;
}

/** Only the date with the weekday. Used where it is split over two lines, such as the grid header. */
export function formatDate(iso: string): string {
  const date = parseDate(iso);
  return date ? mdw(date) : '--';
}

export function formatTime(iso: string): string {
  const date = parseDate(iso);
  return date ? hhmm(date) : '--:--';
}

/** Format a TTL deadline (epoch seconds) as `2026/12/20`. */
export function formatExpiry(expiresAt: number | null | undefined): string {
  if (expiresAt == null) return '--';
  const date = new Date(expiresAt * 1000);
  if (Number.isNaN(date.getTime())) return '--';
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatFee(fee: number | null | undefined): string {
  if (fee == null) return t('未設定');
  if (fee === 0) return t('無料');
  return `¥${fee.toLocaleString('ja-JP')}`;
}

/** ISO string → local time string accepted by `<input type="datetime-local">`. */
export function toDateTimeLocal(iso: string): string {
  const date = parseDate(iso);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${hhmm(date)}`;
}

/** Value of `<input type="datetime-local">` → ISO string. null if empty or invalid. */
export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
}

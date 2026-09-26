const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** パースできない文字列は null。各関数が自分のフォールバック表記を決める。 */
function parseDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

const pad = (n: number) => String(n).padStart(2, '0');

const hhmm = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const mdw = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAYS[date.getDay()]})`;

/** `2026/10/3(金) 19:00` 形式。年をまたがない直近の候補では年を省く。 */
export function formatDateTime(iso: string, options: { withYear?: boolean } = {}): string {
  const date = parseDate(iso);
  if (!date) return '(不正な日時)';

  const withYear = options.withYear ?? date.getFullYear() !== new Date().getFullYear();
  return `${withYear ? `${date.getFullYear()}/` : ''}${mdw(date)} ${hhmm(date)}`;
}

/** 曜日込みの日付だけ。グリッドのヘッダなど 2 行に分けたいときに使う。 */
export function formatDate(iso: string): string {
  const date = parseDate(iso);
  return date ? mdw(date) : '--';
}

export function formatTime(iso: string): string {
  const date = parseDate(iso);
  return date ? hhmm(date) : '--:--';
}

/** TTL の期限 (エポック秒) を `2026/12/20` 形式にする。 */
export function formatExpiry(expiresAt: number | null | undefined): string {
  if (expiresAt == null) return '--';
  const date = new Date(expiresAt * 1000);
  if (Number.isNaN(date.getTime())) return '--';
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatFee(fee: number | null | undefined): string {
  if (fee == null) return '未設定';
  if (fee === 0) return '無料';
  return `¥${fee.toLocaleString('ja-JP')}`;
}

/** ISO 文字列 → `<input type="datetime-local">` が受け付けるローカル時刻文字列。 */
export function toDateTimeLocal(iso: string): string {
  const date = parseDate(iso);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${hhmm(date)}`;
}

/** `<input type="datetime-local">` の値 → ISO 文字列。空や不正なら null。 */
export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
}

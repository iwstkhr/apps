import { cn } from '~/lib/cn';
import { fieldClass, inputClass } from '~/lib/styles';
import type { SortKey, StatusFilter, TodoFilters } from '~/lib/todo-filters';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'active', label: '未完了' },
  { value: 'done', label: '完了' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'due', label: '期限順' },
  { value: 'priority', label: '優先度順' },
  { value: 'created', label: '新しい順' },
];

interface TodoToolbarProps {
  filters: TodoFilters;
  onChange: (filters: TodoFilters) => void;
  tags: string[];
  counts: Record<StatusFilter, number>;
}

export function TodoToolbar({ filters, onChange, tags, counts }: TodoToolbarProps) {
  const update = (patch: Partial<TodoFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <fieldset className="flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-600">
          <legend className="sr-only">状態</legend>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className={cn(
                'cursor-pointer px-2.5 py-1.5 text-sm has-focus-visible:ring-2 has-focus-visible:ring-blue-500',
                filters.status === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700',
              )}
            >
              <input
                type="radio"
                name="status"
                value={value}
                checked={filters.status === value}
                onChange={() => update({ status: value })}
                className="sr-only"
              />
              {label} <span className="tabular-nums">{counts[value]}</span>
            </label>
          ))}
        </fieldset>

        <select
          className={fieldClass}
          value={filters.sort}
          onChange={(event) => update({ sort: event.target.value as SortKey })}
          aria-label="並び順"
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          className={fieldClass}
          value={filters.tag ?? ''}
          onChange={(event) => update({ tag: event.target.value || null })}
          aria-label="タグで絞り込み"
          disabled={tags.length === 0 && filters.tag === null}
        >
          <option value="">すべてのタグ</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              #{tag}
            </option>
          ))}
        </select>
      </div>

      <input
        type="search"
        className={inputClass}
        value={filters.keyword}
        onChange={(event) => update({ keyword: event.target.value })}
        placeholder="キーワードで検索 (タイトル・メモ・タグ)"
        aria-label="キーワードで検索"
      />
    </div>
  );
}

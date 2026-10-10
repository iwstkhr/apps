import { fieldClass, inputClass } from '~/lib/styles';
import {
  type SortKey,
  STATUS_FILTER_OPTIONS,
  type StatusFilter,
  type TodoFilters,
} from '~/lib/todo-filters';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'due', label: '期限順' },
  { value: 'priority', label: '優先度順' },
  { value: 'status', label: 'ステータス順' },
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
        <select
          className={fieldClass}
          value={filters.status}
          onChange={(event) => update({ status: event.target.value as StatusFilter })}
          aria-label="ステータスで絞り込み"
        >
          {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label} ({counts[value]})
            </option>
          ))}
        </select>

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

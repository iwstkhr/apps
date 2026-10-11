import { useId } from 'react';
import { FaSearch, FaSortAmountDown, FaTag, FaTimes } from 'react-icons/fa';
import { cn } from '~/lib/cn';
import { t } from '~/lib/i18n';
import { fieldClass, inputClass } from '~/lib/styles';
import type { SortKey, TodoFilters } from '~/lib/todo-filters';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'due', label: '期限順' },
  { value: 'priority', label: '優先度順' },
  { value: 'status', label: 'ステータス順' },
  { value: 'created', label: '新しい順' },
  { value: 'custom', label: 'カスタム' },
];

const captionClass =
  'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400';

interface TodoToolbarProps {
  filters: TodoFilters;
  onChange: (filters: TodoFilters) => void;
  tags: string[];
}

export function TodoToolbar({ filters, onChange, tags }: TodoToolbarProps) {
  const update = (patch: Partial<TodoFilters>) => onChange({ ...filters, ...patch });
  const tagActive = filters.tag !== null;
  const sortId = useId();
  const tagId = useId();

  return (
    <div className="flex flex-col gap-2">
      {filters.sort === 'custom' && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('ヘッダーをドラッグするか、上下ボタンで順序を変更できます。')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* 虫眼鏡を付けて、上の追加フォーム (＋) と見分けられるようにする */}
        <div className="relative min-w-48 flex-1">
          <FaSearch
            className="pointer-events-none absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            className={`${inputClass} pl-7`}
            value={filters.keyword}
            onChange={(event) => update({ keyword: event.target.value })}
            placeholder={t('キーワードで検索 (タイトル・メモ・タグ)')}
            aria-label={t('キーワードで検索')}
          />
        </div>

        {/* 値だけでは何の欄か分からないので見出しを付ける。select を label で包むと
            選択肢の文字まで見出しに入るので、htmlFor で結ぶ */}
        <div className="flex items-center gap-1.5">
          <label htmlFor={sortId} className={captionClass}>
            <FaSortAmountDown aria-hidden="true" />
            {t('並び順')}
          </label>
          <select
            id={sortId}
            className={fieldClass}
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value as SortKey })}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
        </div>

        {/* タグが無ければ選ぶものが無いので出さない */}
        {(tags.length > 0 || tagActive) && (
          <div className="flex items-center gap-1.5">
            <label htmlFor={tagId} className={captionClass}>
              <FaTag aria-hidden="true" />
              {t('タグ')}
            </label>
            {/* 追加フォームの「タグ」欄と名前が重ならないよう、名前は「タグで絞り込み」にする */}
            <select
              id={tagId}
              className={cn(
                fieldClass,
                // リストのタグをクリックして絞り込んだときにも気づけるよう、選択中は色を付ける
                tagActive &&
                  'border-blue-500 bg-blue-50 font-medium text-blue-800 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200',
              )}
              value={filters.tag ?? ''}
              onChange={(event) => update({ tag: event.target.value || null })}
              aria-label={t('タグで絞り込み')}
            >
              <option value="">{t('すべて')}</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
            {tagActive && (
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={() => update({ tag: null })}
                aria-label={t('タグの絞り込みを解除')}
                title={t('タグの絞り込みを解除')}
              >
                <FaTimes aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

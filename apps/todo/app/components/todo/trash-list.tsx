import { FaFolder, FaInbox, FaTrashRestore } from 'react-icons/fa';
import { formatFolderPath } from '~/lib/folder-tree';
import { t } from '~/lib/i18n';
import { dangerButtonClass, secondaryButtonClass } from '~/lib/styles';
import type { Folder } from '~/types/folder';
import { daysUntilPurge, type Todo, TRASH_RETENTION_DAYS } from '~/types/todo';

interface TrashListProps {
  todos: Todo[];
  folders: Folder[];
  now: Date;
  onRestore: (todo: Todo) => void;
  onDeleteForever: (todo: Todo) => void;
  onEmpty: () => void;
}

/**
 * ゴミ箱の中身。ゴミ箱のタスクは編集できないので、一覧のカードではなく
 * 名前・元の場所・自動で削除されるまでの日数と、元に戻す / 完全に削除のボタンだけを出す。
 */
export function TrashList({
  todos,
  folders,
  now,
  onRestore,
  onDeleteForever,
  onEmpty,
}: TrashListProps) {
  // 新しく入れたものを上に出す
  const sorted = [...todos].sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('ゴミ箱のタスクは {0} 日たつと自動で完全に削除されます。', [TRASH_RETENTION_DAYS])}
        </p>
        {todos.length > 0 && (
          <button type="button" className={dangerButtonClass} onClick={onEmpty}>
            {t('ゴミ箱を空にする')}
          </button>
        )}
      </div>

      {todos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {t('ゴミ箱は空です。')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label={t('ゴミ箱の TODO')}>
          {sorted.map((todo) => {
            const folder = folders.find((item) => item.id === todo.folderId);
            const days = daysUntilPurge(todo, now);
            return (
              <li
                key={todo.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                {/* 狭い画面では名前を細くせず、ボタンを次の行に回す */}
                <div className="min-w-0 flex-[1_1_15rem]">
                  <p className="break-words font-medium text-slate-700 dark:text-slate-300">
                    {todo.title}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      {folder ? (
                        <FaFolder style={{ color: folder.color }} aria-hidden="true" />
                      ) : (
                        <FaInbox aria-hidden="true" />
                      )}
                      <span className="sr-only">{t('元の場所: ')}</span>
                      {folder ? formatFolderPath(folders, folder.id) : t('未分類')}
                    </span>
                    <span>
                      {days <= 1 ? t('明日までに自動で削除') : t('あと {0} 日で自動で削除', [days])}
                    </span>
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 gap-2">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => onRestore(todo)}
                    aria-label={t('「{0}」を元に戻す', [todo.title])}
                  >
                    <FaTrashRestore aria-hidden="true" />
                    {t('元に戻す')}
                  </button>
                  <button
                    type="button"
                    className={dangerButtonClass}
                    onClick={() => onDeleteForever(todo)}
                    aria-label={t('「{0}」を完全に削除', [todo.title])}
                  >
                    {t('完全に削除')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

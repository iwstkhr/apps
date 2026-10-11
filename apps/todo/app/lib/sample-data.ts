import type { Language } from '~/lib/i18n';
import type { StoredData } from '~/lib/todo-db';
import type { Folder } from '~/types/folder';
import { type RepeatFrequency, type Todo, toLocalDateString } from '~/types/todo';

// Sample data added on first open. To show at a glance what the app can do, it covers nested folders, tags,
// overdue / today / future due dates, every status, and a Markdown memo.
// The contents are treated as user data, so they are not translated after creation even if the language changes.

type Text = Record<Language, string>;

interface SampleFolder {
  key: string;
  name: Text;
  parent: string | null;
  color: string;
}

interface SampleTodo {
  title: Text;
  memo?: Text;
  folder: string | null;
  status: Todo['status'];
  priority: Todo['priority'];
  /** Days from today until the due date. null means no due date */
  dueInDays: number | null;
  repeat?: RepeatFrequency;
  tags: Text[];
}

const FOLDERS: SampleFolder[] = [
  { key: 'work', name: { ja: '仕事', en: 'Work' }, parent: null, color: '#2563eb' },
  {
    key: 'deck',
    name: { ja: '資料作成', en: 'Slide deck' },
    parent: 'work',
    color: '#9333ea',
  },
  { key: 'home', name: { ja: '暮らし', en: 'Home' }, parent: null, color: '#16a34a' },
];

const WELCOME_MEMO: Text = {
  ja: `ここにあるタスクはサンプルです。自由に編集・削除してください。

- **データはこのブラウザにだけ保存されます。** サーバーには送りません
- 別の端末に移すときやバックアップには、右上の「メニュー」から**エクスポート**してください
- タスクの名前をつかんで左のフォルダへドラッグすると、そのフォルダに移せます (広い画面)
- メモには **Markdown** が使えます`,
  en: `These tasks are samples. Feel free to edit or delete them.

- **Your data is stored only in this browser.** Nothing is sent to a server
- To move to another device or keep a backup, **export** from the Menu at the top right
- On wide screens, drag a task by its title onto a folder on the left to move it there
- Memos support **Markdown**`,
};

const TODOS: SampleTodo[] = [
  {
    title: { ja: 'TODO へようこそ', en: 'Welcome to TODO' },
    memo: WELCOME_MEMO,
    folder: null,
    status: 'todo',
    priority: 'medium',
    dueInDays: null,
    tags: [{ ja: '使い方', en: 'guide' }],
  },
  {
    title: { ja: '週次レポートを提出する', en: 'Submit the weekly report' },
    folder: 'work',
    status: 'todo',
    priority: 'high',
    dueInDays: -1,
    repeat: 'weekly',
    tags: [{ ja: '定例', en: 'routine' }],
  },
  {
    title: { ja: '提案資料の構成を考える', en: 'Outline the proposal deck' },
    memo: {
      ja: '1. 課題\n2. 解決策\n3. スケジュール',
      en: '1. Problem\n2. Solution\n3. Schedule',
    },
    folder: 'deck',
    status: 'in_progress',
    priority: 'high',
    dueInDays: 0,
    tags: [{ ja: '企画', en: 'planning' }],
  },
  {
    title: { ja: 'グラフの元データを集める', en: 'Collect data for the charts' },
    memo: { ja: '先方からの返事待ち', en: 'Waiting for a reply from the client' },
    folder: 'deck',
    status: 'on_hold',
    priority: 'medium',
    dueInDays: 3,
    tags: [{ ja: '企画', en: 'planning' }],
  },
  {
    title: { ja: '買い物', en: 'Groceries' },
    memo: {
      ja: '- [ ] 牛乳\n- [ ] パン\n- [x] 卵',
      en: '- [ ] Milk\n- [ ] Bread\n- [x] Eggs',
    },
    folder: 'home',
    status: 'todo',
    priority: 'low',
    dueInDays: 1,
    tags: [{ ja: '買い物', en: 'shopping' }],
  },
  {
    title: { ja: '部屋の掃除', en: 'Clean the room' },
    folder: 'home',
    status: 'done',
    priority: 'low',
    dueInDays: null,
    tags: [],
  },
];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Create the sample folders and todos. Due dates are relative to now, so they look the same whenever opened. */
export function createSampleData(language: Language, now: Date = new Date()): StoredData {
  const timestamp = now.toISOString();
  const folderIds = new Map(FOLDERS.map(({ key }) => [key, crypto.randomUUID()]));
  const folderId = (key: string | null) => (key === null ? null : (folderIds.get(key) ?? null));

  const folders: Folder[] = FOLDERS.map((folder) => ({
    id: folderId(folder.key) as string,
    name: folder.name[language],
    parentId: folderId(folder.parent),
    color: folder.color,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  // Offset creation times by one second each so the order above holds even in 「新しい順」
  const todos: Todo[] = TODOS.map((todo, index) => {
    const createdAt = new Date(now.getTime() - index * 1000).toISOString();
    const dueDate =
      todo.dueInDays === null ? null : toLocalDateString(addDays(now, todo.dueInDays));
    return {
      id: crypto.randomUUID(),
      title: todo.title[language],
      memo: todo.memo?.[language] ?? '',
      status: todo.status,
      priority: todo.priority,
      dueDate,
      tags: todo.tags.map((tag) => tag[language]),
      folderId: folderId(todo.folder),
      customOrder: null,
      createdAt,
      updatedAt: createdAt,
      completedAt: todo.status === 'done' ? createdAt : null,
      deletedAt: null,
      repeat:
        todo.repeat && dueDate
          ? { frequency: todo.repeat, anchorDay: Number(dueDate.slice(8, 10)) }
          : null,
    };
  });

  return { folders, todos };
}

import { describe, expect, it } from 'vitest';
import { createSampleData } from '~/lib/sample-data';
import { toFolder } from '~/types/folder';
import { getDueStatus, STATUSES, toTodo } from '~/types/todo';

const NOW = new Date(2026, 9, 11, 9, 0);
const TODAY = '2026-10-11';

describe('createSampleData', () => {
  it('creates valid todos and folders that point to each other', () => {
    const { todos, folders } = createSampleData('ja', NOW);
    // 読み込みの検査をそのまま通る形で作る
    expect(todos.map(toTodo)).toEqual(todos);
    expect(folders.map(toFolder)).toEqual(folders);

    const folderIds = new Set(folders.map((folder) => folder.id));
    for (const folder of folders) {
      if (folder.parentId !== null) expect(folderIds).toContain(folder.parentId);
    }
    for (const todo of todos) {
      if (todo.folderId !== null) expect(folderIds).toContain(todo.folderId);
    }
    // 入れ子のフォルダと未分類のタスクを含む
    expect(folders.some((folder) => folder.parentId !== null)).toBe(true);
    expect(todos.some((todo) => todo.folderId === null)).toBe(true);
  });

  it('shows every status and overdue, today and upcoming due dates', () => {
    const { todos } = createSampleData('ja', NOW);
    expect(new Set(todos.map((todo) => todo.status))).toEqual(new Set(STATUSES));
    const dueStatuses = todos.map((todo) => getDueStatus(todo, TODAY));
    expect(dueStatuses).toEqual(expect.arrayContaining(['overdue', 'today', 'upcoming']));
  });

  it('lists the welcome todo first when sorted by newest', () => {
    const { todos } = createSampleData('ja', NOW);
    const newest = [...todos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    expect(newest[0]?.title).toBe('TODO へようこそ');
  });

  it('writes the content in the given language', () => {
    const japanese = createSampleData('ja', NOW);
    const english = createSampleData('en', NOW);
    expect(japanese.folders.map((folder) => folder.name)).toContain('仕事');
    expect(english.folders.map((folder) => folder.name)).toContain('Work');
    expect(english.todos[0]?.title).toBe('Welcome to TODO');
    expect(
      english.todos.flatMap((todo) => [todo.title, todo.memo, ...todo.tags]).join(''),
    ).not.toMatch(/[぀-ヿ一-鿿]/);
  });

  it('creates new ids each time', () => {
    const a = createSampleData('ja', NOW);
    const b = createSampleData('ja', NOW);
    expect(a.todos[0]?.id).not.toBe(b.todos[0]?.id);
    expect(a.folders[0]?.id).not.toBe(b.folders[0]?.id);
  });
});

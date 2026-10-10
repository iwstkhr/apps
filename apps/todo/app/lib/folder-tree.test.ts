import { describe, expect, it } from 'vitest';
import {
  countOpenByFolder,
  filterByFolder,
  flattenFolderTree,
  formatFolderPath,
  getSubtreeIds,
  sanitizeFolders,
  sanitizeTodoFolders,
  wouldCreateCycle,
} from '~/lib/folder-tree';
import { createFolderFixture, createTodoFixture } from '~/test/fixtures';

// あ仕事
// ├ か案件
// │ └ さ資料
// └ た会議
// な家
const work = createFolderFixture({ id: 'work', name: 'あ仕事' });
const projectA = createFolderFixture({ id: 'a', name: 'か案件', parentId: 'work' });
const docs = createFolderFixture({ id: 'docs', name: 'さ資料', parentId: 'a' });
const meeting = createFolderFixture({ id: 'meeting', name: 'た会議', parentId: 'work' });
const home = createFolderFixture({ id: 'home', name: 'な家' });
const folders = [docs, home, meeting, work, projectA];

const names = (entries: { folder: { name: string }; depth: number }[]) =>
  entries.map(({ folder, depth }) => `${'-'.repeat(depth)}${folder.name}`);

describe('flattenFolderTree', () => {
  it('lists parents before children and siblings by name', () => {
    expect(names(flattenFolderTree(folders))).toEqual([
      'あ仕事',
      '-か案件',
      '--さ資料',
      '-た会議',
      'な家',
    ]);
  });

  it('marks folders that have children and hides collapsed subtrees', () => {
    const entries = flattenFolderTree(folders, new Set(['work']));
    expect(names(entries)).toEqual(['あ仕事', 'な家']);
    expect(entries.map((entry) => entry.hasChildren)).toEqual([true, false]);
  });
});

describe('paths and subtrees', () => {
  it('collects a folder and all of its descendants', () => {
    expect([...getSubtreeIds(folders, 'work')].sort()).toEqual(['a', 'docs', 'meeting', 'work']);
    expect([...getSubtreeIds(folders, 'home')]).toEqual(['home']);
  });

  it('formats the path from the top', () => {
    expect(formatFolderPath(folders, 'docs')).toBe('あ仕事 / か案件 / さ資料');
    expect(formatFolderPath(folders, 'missing')).toBe('');
    expect(formatFolderPath(folders, null)).toBe('');
  });

  it('detects moves that would put a folder under itself', () => {
    expect(wouldCreateCycle(folders, 'work', 'docs')).toBe(true);
    expect(wouldCreateCycle(folders, 'work', 'work')).toBe(true);
    expect(wouldCreateCycle(folders, 'docs', 'home')).toBe(false);
    expect(wouldCreateCycle(folders, 'docs', null)).toBe(false);
  });
});

describe('sanitize', () => {
  it('moves folders with a missing parent to the top level', () => {
    const orphan = createFolderFixture({ parentId: 'missing' });
    expect(sanitizeFolders([work, orphan])).toEqual([work, { ...orphan, parentId: null }]);
  });

  it('breaks cycles', () => {
    const x = createFolderFixture({ id: 'x', parentId: 'y' });
    const y = createFolderFixture({ id: 'y', parentId: 'x' });
    const fixed = sanitizeFolders([x, y]);
    expect(flattenFolderTree(fixed).length).toBe(2);
    expect(fixed.some((folder) => folder.parentId === null)).toBe(true);
  });

  it('keeps a valid tree untouched', () => {
    expect(sanitizeFolders(folders)).toEqual(folders);
  });

  it('moves todos in missing folders to unfiled', () => {
    const lost = createTodoFixture({ folderId: 'missing' });
    const kept = createTodoFixture({ folderId: 'home' });
    expect(sanitizeTodoFolders([lost, kept], folders)).toEqual([{ ...lost, folderId: null }, kept]);
  });
});

describe('filterByFolder / countOpenByFolder', () => {
  const inDocs = createTodoFixture({ title: 'docs', folderId: 'docs' });
  const inWork = createTodoFixture({ title: 'work', folderId: 'work', status: 'done' });
  const inHome = createTodoFixture({ title: 'home', folderId: 'home' });
  const unfiled = createTodoFixture({ title: 'unfiled' });
  const todos = [inDocs, inWork, inHome, unfiled];
  const titles = (list: { title: string }[]) => list.map((todo) => todo.title);

  it('includes todos in subfolders', () => {
    expect(titles(filterByFolder(todos, folders, 'all'))).toEqual(titles(todos));
    expect(titles(filterByFolder(todos, folders, 'work'))).toEqual(['docs', 'work']);
    expect(titles(filterByFolder(todos, folders, 'a'))).toEqual(['docs']);
    expect(titles(filterByFolder(todos, folders, 'unfiled'))).toEqual(['unfiled']);
    // ゴミ箱の中身は画面側で出すので、ここでは何も返さない
    expect(filterByFolder(todos, folders, 'trash')).toEqual([]);
  });

  it('counts open todos per folder including subfolders', () => {
    const counts = countOpenByFolder(todos, folders);
    expect(counts.get('all')).toBe(3);
    expect(counts.get('unfiled')).toBe(1);
    expect(counts.get('work')).toBe(1);
    expect(counts.get('a')).toBe(1);
    expect(counts.get('docs')).toBe(1);
    expect(counts.get('meeting')).toBe(0);
    expect(counts.get('home')).toBe(1);
  });
});

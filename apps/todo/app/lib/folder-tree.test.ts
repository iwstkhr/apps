import { describe, expect, it } from 'vitest';
import {
  compareFolders,
  countOpenByFolder,
  filterByFolder,
  flattenFolderTree,
  formatFolderPath,
  getSubtreeIds,
  moveFolder,
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

describe('compareFolders', () => {
  it('puts ordered folders first, then the rest by name', () => {
    const sorted = [
      createFolderFixture({ name: 'あ', order: null }),
      createFolderFixture({ name: 'い', order: 1 }),
      createFolderFixture({ name: 'う', order: 0 }),
      createFolderFixture({ name: 'え', order: null }),
    ].sort(compareFolders);
    expect(sorted.map((folder) => folder.name)).toEqual(['う', 'い', 'あ', 'え']);
  });
});

describe('moveFolder', () => {
  const NOW = new Date('2026-10-10T03:00:00.000Z');
  const tree = (result: readonly Parameters<typeof flattenFolderTree>[0][number][]) =>
    names(flattenFolderTree(result));

  it('places a folder before or after a sibling and numbers the siblings', () => {
    const before = moveFolder(folders, 'meeting', 'a', 'before', NOW);
    expect(tree(before)).toEqual(['あ仕事', '-た会議', '-か案件', '--さ資料', 'な家']);
    expect(before.find((folder) => folder.id === 'meeting')).toMatchObject({
      order: 0,
      updatedAt: NOW.toISOString(),
    });
    expect(before.find((folder) => folder.id === 'a')?.order).toBe(1);

    const after = moveFolder(folders, 'work', 'home', 'after', NOW);
    expect(tree(after)).toEqual(['な家', 'あ仕事', '-か案件', '--さ資料', '-た会議']);
  });

  it('moves a folder next to a folder under another parent', () => {
    const result = moveFolder(folders, 'home', 'docs', 'after', NOW);
    expect(tree(result)).toEqual(['あ仕事', '-か案件', '--さ資料', '--な家', '-た会議']);
    expect(result.find((folder) => folder.id === 'home')?.parentId).toBe('a');
  });

  it('puts a folder at the end inside the target', () => {
    const result = moveFolder(folders, 'home', 'work', 'inside', NOW);
    expect(tree(result)).toEqual(['あ仕事', '-か案件', '--さ資料', '-た会議', '-な家']);
  });

  it('moves a folder to the end of the top level when there is no target', () => {
    const result = moveFolder(folders, 'docs', null, 'inside', NOW);
    expect(tree(result)).toEqual(['あ仕事', '-か案件', '-た会議', 'な家', 'さ資料']);
    expect(result.find((folder) => folder.id === 'docs')?.parentId).toBeNull();
  });

  it('rewrites only the folders whose parent or order changed', () => {
    const ordered = moveFolder(folders, 'meeting', 'a', 'before', NOW);
    const result = moveFolder(ordered, 'a', 'meeting', 'before', new Date('2026-10-11T00:00:00Z'));
    // The siblings were swapped back, and the folders elsewhere are the same objects
    expect(result.find((folder) => folder.id === 'docs')).toBe(
      ordered.find((folder) => folder.id === 'docs'),
    );
    expect(result.find((folder) => folder.id === 'home')).toBe(
      ordered.find((folder) => folder.id === 'home'),
    );
  });

  it.each([
    ['onto itself', 'work', 'work', 'inside'],
    ['into a descendant', 'work', 'docs', 'inside'],
    ['next to a descendant', 'work', 'a', 'after'],
    ['to a missing folder', 'home', 'missing', 'inside'],
    ['a missing folder', 'missing', 'home', 'inside'],
  ] as const)('ignores moving %s', (_label, movedId, targetId, position) => {
    expect(moveFolder(folders, movedId, targetId, position, NOW)).toEqual(folders);
  });

  it('changes nothing when the folder is already there', () => {
    const ordered = moveFolder(folders, 'meeting', 'a', 'before', NOW);
    const again = moveFolder(ordered, 'meeting', 'a', 'before', NOW);
    expect(again.every((folder, index) => folder === ordered[index])).toBe(true);
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
    // The trash contents are shown by the UI, so nothing is returned here
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

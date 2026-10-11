import { describe, expect, it } from 'vitest';
import { createFolderFixture } from '~/test/fixtures';
import { createFolder, DEFAULT_FOLDER_COLOR, toFolder, updateFolder } from '~/types/folder';

const NOW = new Date('2026-10-10T03:00:00.000Z');

describe('createFolder / updateFolder', () => {
  it('creates a folder with a trimmed name and timestamps', () => {
    const folder = createFolder({ name: ' 仕事 ', parentId: 'p' }, NOW);
    expect(folder).toMatchObject({
      name: '仕事',
      parentId: 'p',
      color: DEFAULT_FOLDER_COLOR,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
    expect(folder.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('renames and moves a folder but keeps id and createdAt', () => {
    const folder = createFolderFixture();
    expect(updateFolder(folder, { name: '新しい名前', parentId: 'p' }, NOW)).toEqual({
      ...folder,
      name: '新しい名前',
      parentId: 'p',
      updatedAt: NOW.toISOString(),
    });
  });

  it('sets and changes the color, preserving it when omitted from an edit', () => {
    const folder = createFolder({ name: '仕事', parentId: null, color: '#AABBCC' }, NOW);
    expect(folder.color).toBe('#aabbcc');
    expect(updateFolder(folder, { name: '仕事', parentId: null }).color).toBe('#aabbcc');
    expect(updateFolder(folder, { name: '仕事', parentId: null, color: '#123456' }).color).toBe(
      '#123456',
    );
  });
});

describe('toFolder', () => {
  it('accepts a valid folder and drops unknown fields', () => {
    const folder = createFolderFixture({ parentId: 'p' });
    expect(toFolder({ ...folder, extra: 1 })).toEqual(folder);
  });

  it('treats an empty or invalid parent as top level', () => {
    expect(toFolder({ ...createFolderFixture(), parentId: '' })?.parentId).toBeNull();
    expect(toFolder({ ...createFolderFixture(), parentId: 1 })?.parentId).toBeNull();
  });

  it.each([undefined, null, '', '#abc', 'red', '#zzzzzz', 123])(
    'uses the default for legacy or invalid color %s',
    (color) => {
      expect(toFolder({ ...createFolderFixture(), color })?.color).toBe(DEFAULT_FOLDER_COLOR);
    },
  );

  it.each([
    ['null', null],
    ['missing id', { ...createFolderFixture(), id: '' }],
    ['blank name', { ...createFolderFixture(), name: ' ' }],
    ['bad updatedAt', { ...createFolderFixture(), updatedAt: 'nope' }],
  ])('rejects %s', (_label, value) => {
    expect(toFolder(value)).toBeNull();
  });
});

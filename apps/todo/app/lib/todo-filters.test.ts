import { describe, expect, it } from 'vitest';
import { applyFilters, collectTags, DEFAULT_FILTERS } from '~/lib/todo-filters';
import { createTodoFixture } from '~/test/fixtures';

const a = createTodoFixture({
  title: '請求書を送る',
  priority: 'low',
  dueDate: '2026-10-12',
  tags: ['仕事'],
  createdAt: '2026-10-01T00:00:00.000Z',
});
const b = createTodoFixture({
  title: '牛乳',
  memo: 'スーパーで',
  priority: 'high',
  tags: ['家'],
  createdAt: '2026-10-03T00:00:00.000Z',
});
const c = createTodoFixture({
  title: '会議資料',
  priority: 'medium',
  dueDate: '2026-10-11',
  tags: ['仕事'],
  createdAt: '2026-10-02T00:00:00.000Z',
});
const done = createTodoFixture({ title: '完了したもの', done: true, dueDate: '2026-10-01' });
const all = [a, b, c, done];

const titles = (todos: { title: string }[]) => todos.map((todo) => todo.title);

describe('applyFilters', () => {
  it('sorts by due date with no-due last and done items at the end', () => {
    expect(titles(applyFilters(all, DEFAULT_FILTERS))).toEqual([
      '会議資料',
      '請求書を送る',
      '牛乳',
      '完了したもの',
    ]);
  });

  it('sorts by priority', () => {
    expect(titles(applyFilters([a, b, c], { ...DEFAULT_FILTERS, sort: 'priority' }))).toEqual([
      '牛乳',
      '会議資料',
      '請求書を送る',
    ]);
  });

  it('sorts by creation date (newest first)', () => {
    expect(titles(applyFilters([a, b, c], { ...DEFAULT_FILTERS, sort: 'created' }))).toEqual([
      '牛乳',
      '会議資料',
      '請求書を送る',
    ]);
  });

  it('filters by status, tag and keyword (title, memo, tags)', () => {
    expect(applyFilters(all, { ...DEFAULT_FILTERS, status: 'active' })).toHaveLength(3);
    expect(titles(applyFilters(all, { ...DEFAULT_FILTERS, status: 'done' }))).toEqual([
      '完了したもの',
    ]);
    expect(applyFilters(all, { ...DEFAULT_FILTERS, tag: '仕事' })).toHaveLength(2);
    expect(titles(applyFilters(all, { ...DEFAULT_FILTERS, keyword: 'スーパー' }))).toEqual([
      '牛乳',
    ]);
    expect(applyFilters(all, { ...DEFAULT_FILTERS, keyword: ' 仕事 ' })).toHaveLength(2);
  });
});

describe('collectTags', () => {
  it('returns unique tags', () => {
    expect(collectTags(all).sort()).toEqual(['仕事', '家'].sort());
  });
});

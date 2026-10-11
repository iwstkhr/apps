// @vitest-environment happy-dom

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTodos } from '~/hooks/use-todos';
import { getAll, putTodos } from '~/lib/todo-db';
import { createTodoFixture } from '~/test/fixtures';
import { resetDb } from '~/test/indexed-db';

// 期限切れのゴミ箱の削除だけを失敗させる
vi.mock('~/lib/todo-db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/todo-db')>()),
  deleteTodos: vi.fn(() => Promise.reject(new Error('quota exceeded'))),
}));

afterEach(resetDb);

describe('useTodos purging expired trash', () => {
  it('still shows the loaded data when deleting expired trash fails', async () => {
    const expired = createTodoFixture({
      title: 'expired',
      deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const active = createTodoFixture({ title: 'active' });
    await putTodos([expired, active]);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.todos.map((t) => t.title)).toEqual(['active']);
    expect(result.current.trash).toEqual([]);
    // 消せなかったものは残り、次に開いたときにまた削除を試す
    expect((await getAll()).todos).toHaveLength(2);
  });
});

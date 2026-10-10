// @vitest-environment happy-dom

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExport } from '~/lib/export-import';
import { closeDbForTesting, getAllTodos, putTodos } from '~/lib/todo-db';
import Home from '~/routes/home';
import { createTodoFixture } from '~/test/fixtures';

beforeEach(() => {
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  await closeDbForTesting();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('todo');
    request.onsuccess = () => resolve();
  });
});

async function renderHome() {
  const user = userEvent.setup();
  render(<Home />);
  await waitFor(() => expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument());
  return user;
}

const items = () =>
  within(screen.getByRole('list', { name: 'TODO 一覧' })).getAllByRole('listitem');

describe('Home', () => {
  it('shows the copyright notice with the current year in the footer', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2031-06-01T00:00:00'));
    await renderHome();

    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      '© 2031 wasabee.dev. All Rights Reserved.',
    );
  });

  it('shows the empty state', async () => {
    await renderHome();
    expect(screen.getByText(/TODO はまだありません/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'エクスポート' })).toBeDisabled();
  });

  it('adds a todo with details', async () => {
    const user = await renderHome();
    await user.type(screen.getByRole('textbox', { name: 'タイトル' }), '牛乳を買う');
    await user.click(screen.getByRole('button', { name: '詳細' }));
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), '低脂肪');
    await user.type(screen.getByRole('combobox', { name: 'タグ' }), '家, 買い物');
    await user.selectOptions(screen.getByRole('combobox', { name: '優先度' }), '高');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(items()).toHaveLength(1);
    expect(screen.getByText('低脂肪')).toBeInTheDocument();
    expect(screen.getByText('優先度: 高')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#買い物' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'タイトル' })).toHaveValue('');
    await waitFor(async () => expect(await getAllTodos()).toHaveLength(1));
  });

  it('changes the status, edits and deletes a todo', async () => {
    await putTodos([createTodoFixture({ title: '洗濯' })]);
    const user = await renderHome();

    const status = screen.getByRole('combobox', { name: '「洗濯」のステータス' });
    expect(status).toHaveValue('todo');
    await user.selectOptions(status, '進行中');
    expect(status).toHaveValue('in_progress');

    await user.click(screen.getByRole('checkbox', { name: '「洗濯」を完了にする' }));
    expect(status).toHaveValue('done');
    expect(screen.getByRole('button', { name: '完了済みを削除 (1)' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '「洗濯」を未着手に戻す' }));
    expect(status).toHaveValue('todo');
    await user.click(screen.getByRole('checkbox', { name: '「洗濯」を完了にする' }));

    await user.click(screen.getByRole('button', { name: '「洗濯」を編集' }));
    const title = within(items()[0]).getByRole('textbox', { name: 'タイトル' });
    await user.clear(title);
    await user.type(title, '洗濯物をたたむ');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('洗濯物をたたむ')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '「洗濯物をたたむ」を削除' }));
    expect(screen.queryByRole('list', { name: 'TODO 一覧' })).not.toBeInTheDocument();
  });

  it('filters by status, tag and keyword', async () => {
    await putTodos([
      createTodoFixture({ title: '会議', tags: ['仕事'] }),
      createTodoFixture({ title: '掃除', tags: ['家'], status: 'done' }),
      createTodoFixture({ title: '返事待ち', status: 'on_hold' }),
    ]);
    const user = await renderHome();
    expect(items()).toHaveLength(3);

    const statusFilter = screen.getByRole('combobox', { name: 'ステータスで絞り込み' });
    expect(within(statusFilter).getByRole('option', { name: '保留 (1)' })).toBeInTheDocument();
    await user.selectOptions(statusFilter, 'active');
    expect(items()).toHaveLength(2);
    await user.selectOptions(statusFilter, 'on_hold');
    expect(items().map((li) => li.textContent)).toEqual([expect.stringContaining('返事待ち')]);
    await user.selectOptions(statusFilter, 'all');

    await user.click(screen.getByRole('button', { name: '#家' }));
    expect(screen.getByRole('combobox', { name: 'タグで絞り込み' })).toHaveValue('家');
    expect(items().map((li) => li.textContent)).toEqual([expect.stringContaining('掃除')]);

    await user.selectOptions(screen.getByRole('combobox', { name: 'タグで絞り込み' }), '');
    await user.type(screen.getByRole('searchbox', { name: 'キーワードで検索' }), 'なし');
    expect(screen.getByText('条件に合う TODO はありません。')).toBeInTheDocument();
  });

  it('imports a file after choosing merge', async () => {
    await putTodos([createTodoFixture({ title: '既存' })]);
    const user = await renderHome();
    const file = new File(
      [JSON.stringify(createExport([createTodoFixture({ title: '読み込んだ' })]))],
      'backup.json',
      { type: 'application/json' },
    );

    await user.upload(screen.getByLabelText('インポートするファイル'), file);
    const dialog = await screen.findByRole('dialog', { name: 'インポート' });
    expect(within(dialog).getByText(/1 件の TODO を読み込みます/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'マージ' }));

    expect(await screen.findByText('1 件の TODO をインポートしました。')).toBeInTheDocument();
    expect(items()).toHaveLength(2);
  });

  it('shows an error for an invalid file', async () => {
    const user = await renderHome();
    await user.upload(
      screen.getByLabelText('インポートするファイル'),
      new File(['not json'], 'x.json', { type: 'application/json' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('JSON として読み込めませんでした。');
  });
});

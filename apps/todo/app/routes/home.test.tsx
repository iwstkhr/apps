// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExport } from '~/lib/export-import';
import { closeDbForTesting, getAll, putAll, putTodos } from '~/lib/todo-db';
import Home from '~/routes/home';
import { createDataTransfer } from '~/test/drag';
import { createFolderFixture, createTodoFixture } from '~/test/fixtures';

beforeEach(() => {
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
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
    await waitFor(async () => expect((await getAll()).todos).toHaveLength(1));
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
    expect(within(statusFilter).queryByRole('option', { name: /未完了/ })).not.toBeInTheDocument();
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

  it('filters from the status sidebar within a folder and syncs with the toolbar', async () => {
    const folder = createFolderFixture({ name: '仕事' });
    const child = createFolderFixture({ name: '案件', parentId: folder.id });
    await putAll({
      folders: [folder, child],
      todos: [
        createTodoFixture({ title: '会議', folderId: folder.id, tags: ['仕事'] }),
        createTodoFixture({
          title: '返事待ち',
          folderId: child.id,
          status: 'on_hold',
          tags: ['仕事'],
        }),
        createTodoFixture({ title: '完了した会議', folderId: folder.id, status: 'done' }),
        createTodoFixture({ title: '掃除', status: 'done' }),
      ],
    });
    const user = await renderHome();
    const sidebar = within(screen.getByRole('navigation', { name: 'ステータス' }));
    const toolbar = screen.getByRole('combobox', { name: 'ステータスで絞り込み' });
    expect(sidebar.getByRole('button', { name: '完了 2' })).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('navigation', { name: 'フォルダ' })).getByRole('button', {
        name: /^仕事/,
      }),
    );
    expect(sidebar.getByRole('button', { name: '完了 1' })).toBeInTheDocument();
    await user.click(sidebar.getByRole('button', { name: '保留 1' }));
    expect(toolbar).toHaveValue('on_hold');
    expect(items()).toHaveLength(1);
    expect(items()[0]).toHaveTextContent('返事待ち');
    expect(sidebar.queryByRole('button', { name: /未完了/ })).not.toBeInTheDocument();
    await user.selectOptions(toolbar, 'all');
    expect(sidebar.getByRole('button', { name: 'すべて 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(items()).toHaveLength(3);
    await user.selectOptions(screen.getByRole('combobox', { name: 'タグで絞り込み' }), '仕事');
    await user.type(screen.getByRole('searchbox', { name: 'キーワードで検索' }), '会議');
    await user.click(sidebar.getByRole('button', { name: '未着手 1' }));
    expect(items()).toHaveLength(1);
    expect(items()[0]).toHaveTextContent('会議');
    await user.click(sidebar.getByRole('button', { name: '進行中 0' }));
    expect(screen.getByText('条件に合う TODO はありません。')).toBeInTheDocument();
  });

  it('imports a file after choosing merge', async () => {
    await putTodos([createTodoFixture({ title: '既存' })]);
    const user = await renderHome();
    const file = new File(
      [
        JSON.stringify(
          createExport({ todos: [createTodoFixture({ title: '読み込んだ' })], folders: [] }),
        ),
      ],
      'backup.json',
      { type: 'application/json' },
    );

    await user.upload(screen.getByLabelText('インポートするファイル'), file);
    const dialog = await screen.findByRole('dialog', { name: 'インポート' });
    expect(within(dialog).getByText(/TODO 1 件とフォルダ 0 件を読み込みます/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'マージ' }));

    expect(
      await screen.findByText('TODO 1 件とフォルダ 0 件をインポートしました。'),
    ).toBeInTheDocument();
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

  describe('folders', () => {
    const folderNav = () => screen.getByRole('navigation', { name: 'フォルダ' });

    async function createFolder(
      user: ReturnType<typeof userEvent.setup>,
      name: string,
      parent?: string,
    ) {
      await user.click(
        within(folderNav()).getByRole('button', {
          name: parent ? `フォルダ「${parent}」の中にフォルダを追加` : '新しいフォルダ',
        }),
      );
      const dialog = screen.getByRole('dialog', { name: '新しいフォルダ' });
      await user.type(within(dialog).getByRole('textbox', { name: 'フォルダ名' }), name);
      await user.click(within(dialog).getByRole('button', { name: '作成' }));
    }

    it('creates nested folders and adds todos to the selected folder', async () => {
      const user = await renderHome();
      await createFolder(user, '仕事');
      await createFolder(user, '案件', '仕事');

      // 作ったフォルダが選ばれ、見出しに道のりが出る
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('仕事 / 案件');
      expect(
        within(folderNav()).getByRole('button', { name: /^案件/, current: true }),
      ).toBeInTheDocument();

      await user.type(screen.getByRole('textbox', { name: 'タイトル' }), '見積もり');
      await user.click(screen.getByRole('button', { name: '追加' }));
      expect(items()).toHaveLength(1);

      const { todos, folders } = await getAll();
      const project = folders.find((f) => f.name === '案件');
      expect(project?.parentId).toBe(folders.find((f) => f.name === '仕事')?.id);
      expect(todos[0].folderId).toBe(project?.id);

      // 親フォルダには子フォルダの TODO も出て、フォルダ名が付く
      await user.click(within(folderNav()).getByRole('button', { name: /^仕事/ }));
      expect(items()[0]).toHaveTextContent('フォルダ: 仕事 / 案件');

      await user.click(within(folderNav()).getByRole('button', { name: /^未分類/ }));
      expect(screen.getByText('ここに TODO はありません。')).toBeInTheDocument();
    });

    it('collapses a folder and shows open todo counts', async () => {
      const parent = createFolderFixture({ name: '仕事' });
      const child = createFolderFixture({ name: '案件', parentId: parent.id });
      await putAll({
        folders: [parent, child],
        todos: [
          createTodoFixture({ folderId: child.id }),
          createTodoFixture({ folderId: child.id, status: 'done' }),
        ],
      });
      const user = await renderHome();

      expect(within(folderNav()).getByRole('button', { name: '仕事 1' })).toBeInTheDocument();
      await user.click(
        within(folderNav()).getByRole('button', { name: 'フォルダ「仕事」を閉じる' }),
      );
      expect(within(folderNav()).queryByRole('button', { name: /^案件/ })).not.toBeInTheDocument();
      await user.click(within(folderNav()).getByRole('button', { name: 'フォルダ「仕事」を開く' }));
      expect(within(folderNav()).getByRole('button', { name: /^案件/ })).toBeInTheDocument();
    });

    it('renames and moves a folder but not under itself', async () => {
      const parent = createFolderFixture({ name: '仕事' });
      const child = createFolderFixture({ name: '案件', parentId: parent.id });
      const other = createFolderFixture({ name: '家' });
      await putAll({ folders: [parent, child, other] });
      const user = await renderHome();

      await user.click(within(folderNav()).getByRole('button', { name: 'フォルダ「仕事」を編集' }));
      const dialog = screen.getByRole('dialog', { name: 'フォルダを編集' });
      const parentSelect = within(dialog).getByRole('combobox', { name: '親フォルダ' });
      const options = within(parentSelect)
        .getAllByRole('option')
        .map((option) => option.textContent?.trim());
      expect(options).toEqual(['なし (最上位)', '家']);

      const name = within(dialog).getByRole('textbox', { name: 'フォルダ名' });
      await user.clear(name);
      await user.type(name, 'しごと');
      await user.selectOptions(parentSelect, '家');
      await user.click(within(dialog).getByRole('button', { name: '保存' }));

      const saved = (await getAll()).folders.find((f) => f.id === parent.id);
      expect(saved).toMatchObject({ name: 'しごと', parentId: other.id });
    });

    it('deletes a folder with its subfolders and moves their todos to unfiled', async () => {
      const parent = createFolderFixture({ name: '仕事' });
      const child = createFolderFixture({ name: '案件', parentId: parent.id });
      await putAll({
        folders: [parent, child],
        todos: [createTodoFixture({ title: '見積もり', folderId: child.id })],
      });
      const user = await renderHome();
      await user.click(within(folderNav()).getByRole('button', { name: /^仕事/ }));

      await user.click(within(folderNav()).getByRole('button', { name: 'フォルダ「仕事」を削除' }));
      expect(window.confirm).toHaveBeenCalledWith(
        'フォルダ「仕事」を削除しますか？\n中のフォルダ 1 件も削除されます。\n中の TODO 1 件は未分類に移ります。',
      );

      // 選んでいたフォルダが消えたらすべてに戻る
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('すべて');
      expect(within(folderNav()).getByText('フォルダはまだありません。')).toBeInTheDocument();
      await user.click(within(folderNav()).getByRole('button', { name: /^未分類/ }));
      expect(items()[0]).toHaveTextContent('見積もり');
      await waitFor(async () => expect((await getAll()).folders).toEqual([]));
    });

    it('restores the selected and collapsed folders after reloading', async () => {
      const parent = createFolderFixture({ name: '仕事' });
      const child = createFolderFixture({ name: '案件', parentId: parent.id });
      await putAll({ folders: [parent, child] });
      const user = await renderHome();
      await user.click(within(folderNav()).getByRole('button', { name: /^仕事/ }));
      await user.click(
        within(folderNav()).getByRole('button', { name: 'フォルダ「仕事」を閉じる' }),
      );

      // リロードの代わりに画面を作り直す
      cleanup();
      await renderHome();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('仕事');
      expect(
        within(folderNav()).getByRole('button', { name: 'フォルダ「仕事」を開く' }),
      ).toBeInTheDocument();
      expect(within(folderNav()).queryByRole('button', { name: /^案件/ })).not.toBeInTheDocument();
    });

    it('shows all todos when the restored folder no longer exists', async () => {
      localStorage.setItem('todo:view', JSON.stringify({ folder: 'deleted', collapsed: [] }));
      await renderHome();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('すべて');
    });

    describe('drag and drop', () => {
      /** タスクの行をフォルダ欄の行へドラッグする。dragover が受け付けられたかを返す。 */
      function dragTodoTo(title: string, rowName: RegExp) {
        const dataTransfer = createDataTransfer();
        const item = items().find((li) => li.textContent?.includes(title));
        if (!item) throw new Error(`todo not found: ${title}`);
        const row = within(folderNav()).getByRole('button', { name: rowName }).closest('li');
        if (!row) throw new Error('folder row not found');

        fireEvent.dragStart(item, { dataTransfer });
        fireEvent.dragEnter(row, { dataTransfer });
        // preventDefault されたら (= ドロップできる) false が返る
        const accepted = !fireEvent.dragOver(row, { dataTransfer });
        return {
          accepted,
          row,
          drop: () => {
            fireEvent.drop(row, { dataTransfer });
            fireEvent.dragEnd(item, { dataTransfer });
          },
        };
      }

      it('moves a todo into a folder and to unfiled', async () => {
        const folder = createFolderFixture({ name: '仕事' });
        await putAll({ folders: [folder], todos: [createTodoFixture({ title: '見積もり' })] });
        await renderHome();

        const toFolder = dragTodoTo('見積もり', /^仕事/);
        expect(toFolder.accepted).toBe(true);
        expect(toFolder.row).toHaveClass('bg-blue-600');
        toFolder.drop();
        expect(toFolder.row).not.toHaveClass('bg-blue-600');

        expect(
          await screen.findByText('「見積もり」を「仕事」に移動しました。'),
        ).toBeInTheDocument();
        expect(items()[0]).toHaveTextContent('フォルダ: 仕事');
        await waitFor(async () => expect((await getAll()).todos[0].folderId).toBe(folder.id));

        dragTodoTo('見積もり', /^未分類/).drop();
        expect(
          await screen.findByText('「見積もり」を「未分類」に移動しました。'),
        ).toBeInTheDocument();
        await waitFor(async () => expect((await getAll()).todos[0].folderId).toBeNull());
      });

      it('shows the drop target style instead of the selected style on the selected folder', async () => {
        await putAll({ todos: [createTodoFixture({ title: '見積もり' })] });
        const user = await renderHome();
        await user.click(within(folderNav()).getByRole('button', { name: /^未分類/ }));

        const { row } = dragTodoTo('見積もり', /^未分類/);
        expect(row).toHaveClass('bg-blue-600');
        expect(row).not.toHaveClass('bg-blue-50');
      });

      it('does not accept drops on すべて or drags of something other than a todo', async () => {
        await putAll({
          folders: [createFolderFixture({ name: '仕事' })],
          todos: [createTodoFixture()],
        });
        await renderHome();

        expect(dragTodoTo('TODO', /^すべて/).accepted).toBe(false);

        const row = within(folderNav()).getByRole('button', { name: /^仕事/ }).closest('li');
        const files = createDataTransfer();
        files.setData('Files', '');
        expect(fireEvent.dragOver(row as HTMLElement, { dataTransfer: files })).toBe(true);
      });

      it('opens a collapsed folder while a todo hovers over it', async () => {
        const parent = createFolderFixture({ name: '仕事' });
        const child = createFolderFixture({ name: '案件', parentId: parent.id });
        await putAll({
          folders: [parent, child],
          todos: [createTodoFixture({ title: '見積もり' })],
        });
        const user = await renderHome();
        await user.click(
          within(folderNav()).getByRole('button', { name: 'フォルダ「仕事」を閉じる' }),
        );

        vi.useFakeTimers();
        dragTodoTo('見積もり', /^仕事/);
        act(() => {
          vi.advanceTimersByTime(800);
        });
        vi.useRealTimers();
        expect(within(folderNav()).getByRole('button', { name: /^案件/ })).toBeInTheDocument();
      });
    });

    it('moves a todo to another folder from the edit form', async () => {
      const folder = createFolderFixture({ name: '家' });
      await putAll({ folders: [folder], todos: [createTodoFixture({ title: '洗濯' })] });
      const user = await renderHome();

      await user.click(screen.getByRole('button', { name: '「洗濯」を編集' }));
      await user.selectOptions(
        within(items()[0]).getByRole('combobox', { name: 'フォルダ' }),
        '家',
      );
      await user.click(screen.getByRole('button', { name: '保存' }));

      expect(items()[0]).toHaveTextContent('フォルダ: 家');
      await waitFor(async () => expect((await getAll()).todos[0].folderId).toBe(folder.id));
    });

    it('imports folders with todos', async () => {
      const folder = createFolderFixture({ name: '旅行' });
      const user = await renderHome();
      const file = new File(
        [
          JSON.stringify(
            createExport({
              folders: [folder],
              todos: [createTodoFixture({ title: '切符', folderId: folder.id })],
            }),
          ),
        ],
        'backup.json',
        { type: 'application/json' },
      );

      await user.upload(screen.getByLabelText('インポートするファイル'), file);
      const dialog = await screen.findByRole('dialog', { name: 'インポート' });
      await user.click(within(dialog).getByRole('button', { name: '置き換え' }));

      await user.click(within(folderNav()).getByRole('button', { name: /^旅行/ }));
      expect(items()[0]).toHaveTextContent('切符');
    });
  });
});

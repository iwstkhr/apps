// @vitest-environment happy-dom

import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reloadPage, setResetting } from '~/lib/app-reset';
import { createExport } from '~/lib/export-import';
import { forgetSavedLanguageForTesting, LANGUAGE_KEY } from '~/lib/i18n';
import { closeDbForTesting, getAll, putAll, putTodos } from '~/lib/todo-db';
import Home from '~/routes/home';
import { createDataTransfer } from '~/test/drag';
import { createFolderFixture, createTodoFixture } from '~/test/fixtures';
import { toLocalDateString } from '~/types/todo';

vi.mock('~/lib/app-reset', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/app-reset')>()),
  reloadPage: vi.fn(),
}));

beforeEach(() => {
  // Confirmations use in-app dialogs. Replaced to check that the browser's native confirm is not shown
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  );
});

/** Check the in-app confirmation dialog and press a button. */
async function answerConfirmation(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  button: string,
  description?: string,
): Promise<void> {
  const dialog = screen.getByRole('dialog', { name: title });
  if (description !== undefined) expect(dialog).toHaveAccessibleDescription(description);
  await user.click(within(dialog).getByRole('button', { name: button }));
  expect(screen.queryByRole('dialog', { name: title })).not.toBeInTheDocument();
}

afterEach(async () => {
  // Unmounting saves the view state, so unmount before clearing localStorage
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
  it('removes a tag from only its task and updates the filtered list', async () => {
    const first = createTodoFixture({ title: '資料を作る', tags: ['仕事', '家'] });
    const second = createTodoFixture({ title: '会議に出る', tags: ['仕事'] });
    await putAll({ folders: [], todos: [first, second] });
    const user = await renderHome();
    await user.click(
      within(
        items().find((item) => item.textContent?.includes('資料を作る')) as HTMLElement,
      ).getByRole('button', { name: '#仕事' }),
    );
    await user.click(screen.getByRole('button', { name: '「資料を作る」からタグ「仕事」を削除' }));
    await waitFor(() => expect(items()).toHaveLength(1));
    expect(items()[0]).toHaveTextContent('会議に出る');
    await waitFor(async () => {
      const saved = (await getAll()).todos;
      expect(saved.find((todo) => todo.id === first.id)?.tags).toEqual(['家']);
      expect(saved.find((todo) => todo.id === second.id)?.tags).toEqual(['仕事']);
    });
    await user.selectOptions(screen.getByRole('combobox', { name: 'タグで絞り込み' }), '');
    expect(items()).toHaveLength(2);
    expect(screen.getByRole('button', { name: '#家' })).toBeInTheDocument();
  });

  it('shows the folder, title, status row, tags, and memo in that order', async () => {
    const folder = createFolderFixture({ name: '仕事' });
    await putAll({
      folders: [folder],
      todos: [
        createTodoFixture({
          title: '資料を作る',
          memo: 'メモ',
          tags: ['仕事'],
          folderId: folder.id,
        }),
      ],
    });
    await renderHome();
    const item = items()[0];
    const order = [
      within(item).getByText('フォルダ:').parentElement as HTMLElement,
      within(item).getByRole('checkbox', { name: '「資料を作る」を完了にする' }),
      within(item).getByText('資料を作る'),
      within(item).getByRole('combobox', { name: '「資料を作る」のステータス' }),
      within(item).getByRole('combobox', { name: '「資料を作る」の優先度' }),
      within(item).getByLabelText('「資料を作る」の期限'),
      within(item).getByRole('button', { name: '#仕事' }),
      within(item).getByText('メモ'),
    ];
    expect(order[0]).toHaveTextContent('フォルダ: 仕事');
    for (const [index, element] of order.slice(1).entries()) {
      expect(
        order[index].compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    // The priority shows only its level next to a flag; the select's name says it is the priority
    expect(
      within(item).getByRole('combobox', { name: '「資料を作る」の優先度' }),
    ).toHaveDisplayValue('中');
  });

  it('changes and removes the due date from the list', async () => {
    const todo = createTodoFixture({ title: '資料を作る', dueDate: null });
    await putTodos([todo]);
    await renderHome();
    const dueInput = () => screen.getByLabelText('「資料を作る」の期限');
    // Without a due date it says so, offering to set one
    expect(dueInput().closest('span')).toHaveAttribute('title', '期限を設定');
    expect(dueInput().closest('span')).toHaveTextContent('期限なし');
    expect(dueInput()).toHaveValue('');

    fireEvent.change(dueInput(), { target: { value: '2000-01-01' } });
    await waitFor(() => expect(items()[0]).toHaveTextContent('期限: 2000/01/01 (期限切れ)'));
    // Overdue is shown by color and icon; the words are only for screen readers and the tooltip
    expect(dueInput().closest('span')).toHaveAttribute('title', '期限切れ');
    expect(within(items()[0]).getByText('(期限切れ)')).toHaveClass('sr-only');
    await waitFor(async () => expect((await getAll()).todos[0].dueDate).toBe('2000-01-01'));

    // Clearing the date in the picker removes the due date
    fireEvent.change(dueInput(), { target: { value: '' } });
    await waitFor(() => expect(items()[0]).not.toHaveTextContent('期限:'));
    expect(items()[0]).toHaveTextContent('期限なし');
    await waitFor(async () => expect((await getAll()).todos[0].dueDate).toBeNull());
  });

  it('labels the sort and tag filters and clears an active tag filter', async () => {
    await putAll({
      folders: [],
      todos: [
        createTodoFixture({ title: '資料を作る', tags: ['仕事'] }),
        createTodoFixture({ title: '掃除', tags: [] }),
      ],
    });
    const user = await renderHome();
    const sortSelect = screen.getByRole('combobox', { name: '並び順' });
    expect(sortSelect).toHaveValue('created');
    // The default sort order is the first option
    expect(
      within(sortSelect)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['新しい順', '期限順', '優先度順', 'ステータス順', 'カスタム']);
    const tagFilter = screen.getByRole('combobox', { name: 'タグで絞り込み' });
    expect(screen.getByText('タグ', { selector: 'label' })).toHaveAttribute('for', tagFilter.id);
    expect(screen.queryByRole('button', { name: 'タグの絞り込みを解除' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '#仕事' }));
    expect(tagFilter).toHaveValue('仕事');
    expect(items()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'タグの絞り込みを解除' }));
    expect(tagFilter).toHaveValue('');
    expect(items()).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'タグの絞り込みを解除' })).not.toBeInTheDocument();
  });

  it('hides the tag filter when no todo has tags', async () => {
    await putAll({ folders: [], todos: [createTodoFixture({ title: '掃除', tags: [] })] });
    await renderHome();
    expect(screen.getByRole('combobox', { name: '並び順' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'タグで絞り込み' })).not.toBeInTheDocument();
  });

  it('describes local-only storage next to the title without changing the heading', async () => {
    await renderHome();
    const tagline = screen.getByText('ブラウザで完結');
    expect(tagline.closest('header')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^TODO$/);
  });

  it('shows the copyright notice with the current year in the footer', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2031-06-01T00:00:00'));
    await renderHome();

    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      '© 2031 wasabee.dev. All Rights Reserved.',
    );
  });

  describe('language', () => {
    it('switches the screen to English, keeps user data as is, and remembers the choice', async () => {
      await putTodos([createTodoFixture({ title: '牛乳を買う', status: 'in_progress' })]);
      const user = await renderHome();

      await user.click(screen.getByRole('button', { name: 'メニュー' }));
      await user.click(screen.getByRole('menuitemradio', { name: 'English' }));
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Folders' })).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: 'Mark "牛乳を買う" as done' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Status of "牛乳を買う"' })).toHaveDisplayValue(
        'In progress',
      );
      expect(document.documentElement.lang).toBe('en');
      expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en');

      // Stays in English after re-rendering
      cleanup();
      await renderHome();
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();

      const again = userEvent.setup();
      await again.click(screen.getByRole('button', { name: 'Menu' }));
      await again.click(screen.getByRole('menuitemradio', { name: '日本語' }));
      expect(screen.getByRole('button', { name: '追加' })).toBeInTheDocument();
      expect(document.documentElement.lang).toBe('ja');
    });

    it('follows the browser language until a language is chosen', async () => {
      localStorage.removeItem(LANGUAGE_KEY);
      forgetSavedLanguageForTesting();
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US', 'ja-JP']);
      const user = await renderHome();
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Menu' }));
      expect(screen.getByRole('menuitemradio', { name: 'English' })).toBeChecked();
    });
  });

  it('shows the empty state', async () => {
    const user = await renderHome();
    expect(screen.getByText(/TODO はまだありません/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'メニュー' }));
    expect(screen.getByRole('menuitem', { name: 'エクスポート' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
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
    expect(screen.getByRole('combobox', { name: '「牛乳を買う」の優先度' })).toHaveValue('high');
    expect(screen.getByRole('button', { name: '#買い物' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'タイトル' })).toHaveValue('');
    await waitFor(async () => expect((await getAll()).todos).toHaveLength(1));
  });

  it('adds a todo with Ctrl+Enter or ⌘Enter in the memo field', async () => {
    const user = await renderHome();
    await user.click(screen.getByRole('button', { name: '詳細' }));
    const title = screen.getByRole('textbox', { name: 'タイトル' });
    const memo = screen.getByRole('textbox', { name: 'メモ' });

    await user.type(title, '牛乳を買う');
    await user.type(memo, '低脂肪');
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(items()).toHaveLength(1);
    expect(screen.getByText('低脂肪')).toBeInTheDocument();
    expect(title).toHaveValue('');
    expect(memo).toHaveValue('');

    await user.type(title, 'パンを買う');
    await user.type(memo, '食パン');
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    expect(items()).toHaveLength(2);
    expect(screen.getByText('食パン')).toBeInTheDocument();
    await waitFor(async () => expect((await getAll()).todos).toHaveLength(2));
  });

  it('edits tags as chips and keeps suggesting the remaining tags after picking one', async () => {
    const todo = createTodoFixture({ title: '資料を作る', tags: ['仕事'] });
    const other = createTodoFixture({ title: '買い出し', tags: ['家', '買い物'] });
    await putAll({ folders: [], todos: [todo, other] });
    const user = await renderHome();
    await user.click(screen.getByRole('button', { name: '「資料を作る」を編集' }));

    const editor = within(screen.getByDisplayValue('資料を作る').closest('form') as HTMLElement);
    await user.click(editor.getByRole('combobox', { name: 'タグ' }));
    await user.click(editor.getByRole('option', { name: '#家' }));
    await user.click(editor.getByRole('option', { name: '#買い物' }));
    await user.click(editor.getByRole('button', { name: 'タグ「仕事」を削除' }));
    await user.click(editor.getByRole('button', { name: '保存' }));

    await waitFor(async () => {
      const saved = (await getAll()).todos.find(({ id }) => id === todo.id);
      expect(saved?.tags).toEqual(['家', '買い物']);
    });
  });

  it('repeats a todo: adds the next one on completion and undoes it from the notice', async () => {
    const user = await renderHome();
    await user.type(screen.getByRole('textbox', { name: 'タイトル' }), 'ゴミ出し');
    await user.click(screen.getByRole('button', { name: '詳細' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '繰り返し' }), '毎週');
    // When the due date is empty, it says the repeat starts today
    expect(screen.getByText('期限が無いときは今日から始めます。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '追加' }));

    const today = new Date();
    const format = (date: Date) => toLocalDateString(date).replaceAll('-', '/');
    expect(items()[0]).toHaveTextContent(`期限: ${format(today)} (今日)`);
    expect(items()[0]).toHaveTextContent('繰り返し: 毎週');

    await user.click(screen.getByRole('checkbox', { name: '「ゴミ出し」を完了にする' }));
    const nextDue = format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));
    expect(await screen.findByRole('status')).toHaveTextContent(
      `「ゴミ出し」の次の回を ${nextDue} に追加しました。`,
    );
    expect(items()).toHaveLength(2);
    const open = items().find((li) => li.textContent?.includes(nextDue));
    expect(open).toHaveTextContent('繰り返し: 毎週');
    // The completed one has handed the repeat to the next occurrence, so it shows no badge
    const done = items().find((li) => !li.textContent?.includes(nextDue));
    expect(done).not.toHaveTextContent('繰り返し');

    await user.click(within(screen.getByRole('status')).getByRole('button', { name: '元に戻す' }));
    await waitFor(() => expect(items()).toHaveLength(1));
    expect(screen.getByRole('checkbox', { name: '「ゴミ出し」を完了にする' })).not.toBeChecked();
    expect(items()[0]).toHaveTextContent('繰り返し: 毎週');
    await waitFor(async () => expect((await getAll()).todos).toHaveLength(1));
  });

  it('completes a repeating todo from the edit form, counting from the edited due date', async () => {
    await putTodos([
      createTodoFixture({
        title: 'ゴミ出し',
        dueDate: '2030-01-01',
        repeat: { frequency: 'weekly', anchorDay: 1 },
      }),
    ]);
    const user = await renderHome();
    // New todos always start as 未着手, so only the edit form has the status field
    await user.click(screen.getByRole('button', { name: '詳細' }));
    expect(screen.queryByRole('combobox', { name: 'ステータス' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '「ゴミ出し」を編集' }));
    const form = within(items()[0]);
    expect(form.getByRole('combobox', { name: 'ステータス' })).toHaveValue('todo');
    await user.selectOptions(form.getByRole('combobox', { name: 'ステータス' }), '完了');
    await user.clear(form.getByLabelText('期限'));
    await user.type(form.getByLabelText('期限'), '2030-01-10');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      '「ゴミ出し」の次の回を 2030/01/17 に追加しました。',
    );
    expect(items()).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: '「ゴミ出し」を未着手に戻す' })).toBeChecked();
  });

  it('labels the add form apart from search and guides an empty add to the title', async () => {
    const user = await renderHome();
    const title = screen.getByRole('textbox', { name: 'タイトル' });
    expect(title).toHaveAttribute('placeholder', '新しいタスクを入力…');
    const add = screen.getByRole('button', { name: '追加' });
    expect(add).toBeEnabled();

    // Pressing with an empty title adds nothing and guides the user to the title field
    await user.click(add);
    expect(title).toHaveFocus();
    expect(screen.queryByRole('list', { name: 'TODO 一覧' })).not.toBeInTheDocument();
    expect((await getAll()).todos).toHaveLength(0);
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
    expect(screen.getByRole('button', { name: '完了済みをゴミ箱に移動 (1)' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '「洗濯」を未着手に戻す' }));
    expect(status).toHaveValue('todo');
    await user.click(screen.getByRole('checkbox', { name: '「洗濯」を完了にする' }));

    await user.click(screen.getByRole('button', { name: '「洗濯」を編集' }));
    const title = within(items()[0]).getByRole('textbox', { name: 'タイトル' });
    await user.clear(title);
    await user.type(title, '洗濯物をたたむ');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('洗濯物をたたむ')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '「洗濯物をたたむ」をゴミ箱に移動' }));
    // Moving to the trash needs no confirmation
    expect(window.confirm).not.toHaveBeenCalled();
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

    const statusTabs = within(screen.getByRole('group', { name: 'ステータス' }));
    expect(
      screen.queryByRole('combobox', { name: 'ステータスで絞り込み' }),
    ).not.toBeInTheDocument();
    await user.click(statusTabs.getByRole('button', { name: '保留 1' }));
    expect(items().map((li) => li.textContent)).toEqual([expect.stringContaining('返事待ち')]);
    await user.click(statusTabs.getByRole('button', { name: 'すべて 3' }));

    await user.click(screen.getByRole('button', { name: '#家' }));
    expect(screen.getByRole('combobox', { name: 'タグで絞り込み' })).toHaveValue('家');
    expect(items().map((li) => li.textContent)).toEqual([expect.stringContaining('掃除')]);

    await user.selectOptions(screen.getByRole('combobox', { name: 'タグで絞り込み' }), '');
    await user.type(screen.getByRole('searchbox', { name: 'キーワードで検索' }), 'なし');
    expect(screen.getByText('条件に合う TODO はありません。')).toBeInTheDocument();
  });

  it('filters by status within a folder', async () => {
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
    const statusTabs = within(screen.getByRole('group', { name: 'ステータス' }));
    expect(statusTabs.getByRole('button', { name: '完了 2' })).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('navigation', { name: 'フォルダ' })).getByRole('button', {
        name: /^仕事/,
      }),
    );
    expect(statusTabs.getByRole('button', { name: '完了 1' })).toBeInTheDocument();
    await user.click(statusTabs.getByRole('button', { name: '保留 1' }));
    expect(statusTabs.getByRole('button', { name: '保留 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(items()).toHaveLength(1);
    expect(items()[0]).toHaveTextContent('返事待ち');
    expect(statusTabs.queryByRole('button', { name: /未完了/ })).not.toBeInTheDocument();
    await user.click(statusTabs.getByRole('button', { name: 'すべて 3' }));
    expect(statusTabs.getByRole('button', { name: 'すべて 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(items()).toHaveLength(3);
    await user.selectOptions(screen.getByRole('combobox', { name: 'タグで絞り込み' }), '仕事');
    await user.type(screen.getByRole('searchbox', { name: 'キーワードで検索' }), '会議');
    await user.click(statusTabs.getByRole('button', { name: '未着手 1' }));
    expect(items()).toHaveLength(1);
    expect(items()[0]).toHaveTextContent('会議');
    await user.click(statusTabs.getByRole('button', { name: '進行中 0' }));
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

  it('deletes all data from the menu after confirmation, and keeps it when canceled', async () => {
    const folder = createFolderFixture({ name: '仕事' });
    await putAll({
      folders: [folder],
      todos: [
        createTodoFixture({ title: '残す', folderId: folder.id }),
        createTodoFixture({ title: '捨てた', deletedAt: new Date().toISOString() }),
      ],
    });
    const user = await renderHome();
    const openDeleteAll = async () => {
      await user.click(screen.getByRole('button', { name: 'メニュー' }));
      await user.click(screen.getByRole('menuitem', { name: 'すべてのデータを削除…' }));
    };

    await openDeleteAll();
    expect(
      screen.getByRole('dialog', { name: 'すべてのデータを削除しますか？' }),
    ).toHaveTextContent('TODO 2 件（ゴミ箱を含む）とフォルダ 1 件が削除されます。');
    await answerConfirmation(user, 'すべてのデータを削除しますか？', 'キャンセル');
    expect(items()).toHaveLength(1);

    await openDeleteAll();
    await answerConfirmation(user, 'すべてのデータを削除しますか？', 'すべて削除');
    expect(await screen.findByText('すべてのデータを削除しました。')).toBeInTheDocument();
    expect(await getAll()).toEqual({ todos: [], folders: [] });
    expect(
      within(screen.getByRole('navigation', { name: 'フォルダ' })).queryByText('仕事'),
    ).not.toBeInTheDocument();

    // With nothing left, the item stays in the menu but is unavailable
    await user.click(screen.getByRole('button', { name: 'メニュー' }));
    expect(screen.getByRole('menuitem', { name: 'すべてのデータを削除…' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('resets the app from the menu after confirmation, and does nothing when canceled', async () => {
    await putTodos([createTodoFixture({ title: '自分の TODO' })]);
    localStorage.setItem('todo:theme', 'ocean');
    const user = await renderHome();
    const openReset = async () => {
      await user.click(screen.getByRole('button', { name: 'メニュー' }));
      await user.click(screen.getByRole('menuitem', { name: 'アプリを初期化…' }));
    };

    await openReset();
    await answerConfirmation(user, 'アプリを初期化しますか？', 'キャンセル');
    expect(reloadPage).not.toHaveBeenCalled();
    expect(localStorage.getItem('todo:theme')).toBe('ocean');

    await openReset();
    await answerConfirmation(user, 'アプリを初期化しますか？', '初期化');
    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem('todo:theme')).toBeNull();
    setResetting(false);
  });

  describe('trash', () => {
    const nav = () => screen.getByRole('navigation', { name: 'フォルダ' });
    const trashRow = () => within(nav()).getByRole('button', { name: /^ゴミ箱(\s*\d+)?$/ });

    it('moves a todo to the trash without asking and can undo it from the notice', async () => {
      await putTodos([createTodoFixture({ title: '洗濯' }), createTodoFixture({ title: '掃除' })]);
      const user = await renderHome();

      await user.click(screen.getByRole('button', { name: '「洗濯」をゴミ箱に移動' }));
      expect(window.confirm).not.toHaveBeenCalled();
      expect(await screen.findByRole('status')).toHaveTextContent(
        '「洗濯」をゴミ箱に移動しました。',
      );
      expect(items().map((li) => li.textContent)).toEqual([expect.stringContaining('掃除')]);
      expect(trashRow()).toHaveTextContent('ゴミ箱1');

      await user.click(screen.getByRole('button', { name: '元に戻す' }));
      expect(await screen.findByText('「洗濯」を元に戻しました。')).toBeInTheDocument();
      expect(items()).toHaveLength(2);
      expect(trashRow()).toHaveTextContent(/^ゴミ箱$/);
    });

    it('undoes moving to the trash with Ctrl+Z or ⌘Z, but not while typing', async () => {
      await putTodos([createTodoFixture({ title: '洗濯' }), createTodoFixture({ title: '掃除' })]);
      const user = await renderHome();

      await user.click(screen.getByRole('button', { name: '「洗濯」をゴミ箱に移動' }));
      await screen.findByText('「洗濯」をゴミ箱に移動しました。');
      expect(screen.getByRole('button', { name: '元に戻す' })).toHaveAttribute(
        'aria-keyshortcuts',
        'Control+Z Meta+Z',
      );

      // In a text field, Ctrl+Z is left to the field
      await user.click(screen.getByRole('textbox', { name: 'タイトル' }));
      await user.keyboard('{Control>}z{/Control}');
      expect(screen.getByText('「洗濯」をゴミ箱に移動しました。')).toBeInTheDocument();
      expect(items()).toHaveLength(1);

      await user.click(document.body);
      await user.keyboard('{Control>}z{/Control}');
      expect(await screen.findByText('「洗濯」を元に戻しました。')).toBeInTheDocument();
      expect(items()).toHaveLength(2);

      await user.click(screen.getByRole('button', { name: '「掃除」をゴミ箱に移動' }));
      await screen.findByText('「掃除」をゴミ箱に移動しました。');
      await user.keyboard('{Meta>}z{/Meta}');
      expect(await screen.findByText('「掃除」を元に戻しました。')).toBeInTheDocument();
      expect(items()).toHaveLength(2);
    });

    it('does not undo with Ctrl+Z while a dialog is open', async () => {
      await putTodos([createTodoFixture({ title: '洗濯' })]);
      const user = await renderHome();
      await user.click(screen.getByRole('button', { name: '「洗濯」をゴミ箱に移動' }));
      await screen.findByText('「洗濯」をゴミ箱に移動しました。');

      await user.click(within(nav()).getByRole('button', { name: '新しいフォルダ' }));
      expect(screen.getByRole('dialog', { name: '新しいフォルダ' })).toBeInTheDocument();
      // Sent outside the dialog's name field, so only the open dialog stops it
      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
      expect(screen.getByText('「洗濯」をゴミ箱に移動しました。')).toBeInTheDocument();
      expect(trashRow()).toHaveTextContent('ゴミ箱1');
    });

    it('moves completed todos to the trash and can undo them together', async () => {
      await putTodos([
        createTodoFixture({ title: '完了1', status: 'done' }),
        createTodoFixture({ title: '完了2', status: 'done' }),
        createTodoFixture({ title: '途中' }),
      ]);
      const user = await renderHome();

      await user.click(screen.getByRole('button', { name: '完了済みをゴミ箱に移動 (2)' }));
      expect(await screen.findByRole('status')).toHaveTextContent(
        '完了済みの 2 件をゴミ箱に移動しました。',
      );
      expect(items()).toHaveLength(1);
      await user.click(screen.getByRole('button', { name: '元に戻す' }));
      expect(await screen.findByText('2 件を元に戻しました。')).toBeInTheDocument();
      expect(items()).toHaveLength(3);
    });

    it('moves only the completed todos of the selected folder to the trash', async () => {
      const work = createFolderFixture({ name: '仕事' });
      const home = createFolderFixture({ name: '家' });
      await putAll({
        folders: [work, home],
        todos: [
          createTodoFixture({ title: '報告', status: 'done', folderId: work.id }),
          createTodoFixture({ title: '洗濯', status: 'done', folderId: home.id }),
          createTodoFixture({ title: '掃除', status: 'done', folderId: home.id }),
        ],
      });
      const user = await renderHome();
      await user.click(within(nav()).getByRole('button', { name: /^仕事/ }));

      await user.click(screen.getByRole('button', { name: '完了済みをゴミ箱に移動 (1)' }));
      expect(await screen.findByRole('status')).toHaveTextContent(
        '完了済みの 1 件をゴミ箱に移動しました。',
      );
      await user.click(within(nav()).getByRole('button', { name: /^家/ }));
      expect(items()).toHaveLength(2);
    });

    it('hides the status filters in the trash view', async () => {
      await putTodos([createTodoFixture({ title: '洗濯' })]);
      const user = await renderHome();
      expect(screen.getByRole('group', { name: 'ステータス' })).toBeInTheDocument();
      await user.click(trashRow());
      expect(screen.queryByRole('group', { name: 'ステータス' })).not.toBeInTheDocument();
    });

    it('does not claim to restore a todo that was deleted forever', async () => {
      await putTodos([createTodoFixture({ title: '洗濯' })]);
      const user = await renderHome();
      await user.click(screen.getByRole('button', { name: '「洗濯」をゴミ箱に移動' }));
      const undo = screen.getByRole('button', { name: '元に戻す' });

      await user.click(trashRow());
      await user.click(screen.getByRole('button', { name: '「洗濯」を完全に削除' }));
      await answerConfirmation(user, '「洗濯」を完全に削除しますか？', '完全に削除');
      // Pressing 「元に戻す」 on a notification left over after deletion does not claim to have restored it
      await user.click(undo);
      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
      expect(screen.queryByText('「洗濯」を元に戻しました。')).not.toBeInTheDocument();
    });

    it('shows the trash with restore, delete forever, and empty actions', async () => {
      const folder = createFolderFixture({ name: '家' });
      const now = Date.now();
      await putAll({
        folders: [folder],
        todos: [
          createTodoFixture({
            title: '洗濯',
            folderId: folder.id,
            deletedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
          }),
          createTodoFixture({ title: '掃除', deletedAt: new Date(now).toISOString() }),
          createTodoFixture({ title: '買い物', deletedAt: new Date(now).toISOString() }),
          createTodoFixture({ title: '残す' }),
        ],
      });
      const user = await renderHome();
      await user.click(trashRow());

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('ゴミ箱');
      expect(screen.queryByRole('region', { name: 'TODO を追加' })).not.toBeInTheDocument();
      const trashItems = () =>
        within(screen.getByRole('list', { name: 'ゴミ箱の TODO' })).getAllByRole('listitem');
      expect(trashItems()).toHaveLength(3);
      const laundry = trashItems().find((li) => li.textContent?.includes('洗濯'));
      expect(laundry).toHaveTextContent('元の場所: 家');
      expect(laundry).toHaveTextContent('あと 28 日で自動で削除');

      // Undo returns it to its original folder
      await user.click(screen.getByRole('button', { name: '「洗濯」を元に戻す' }));
      expect(trashItems()).toHaveLength(2);
      await user.click(within(nav()).getByRole('button', { name: /^家/ }));
      expect(items().map((li) => li.textContent)).toEqual([expect.stringContaining('洗濯')]);

      await user.click(trashRow());
      // Canceling keeps it
      await user.click(screen.getByRole('button', { name: '「掃除」を完全に削除' }));
      await answerConfirmation(
        user,
        '「掃除」を完全に削除しますか？',
        'キャンセル',
        'この操作は元に戻せません。',
      );
      expect(trashItems()).toHaveLength(2);

      await user.click(screen.getByRole('button', { name: '「掃除」を完全に削除' }));
      await answerConfirmation(user, '「掃除」を完全に削除しますか？', '完全に削除');
      expect(trashItems()).toHaveLength(1);

      await user.click(
        within(screen.getByRole('main')).getByRole('button', { name: 'ゴミ箱を空にする' }),
      );
      await answerConfirmation(user, 'ゴミ箱の 1 件を完全に削除しますか？', '空にする');
      expect(window.confirm).not.toHaveBeenCalled();
      expect(screen.getByText('ゴミ箱は空です。')).toBeInTheDocument();
      await waitFor(async () =>
        expect((await getAll()).todos.map((t) => t.title).sort()).toEqual(['残す', '洗濯']),
      );
    });

    it('empties the trash from the sidebar without opening it', async () => {
      await putTodos([
        createTodoFixture({ title: '洗濯', deletedAt: new Date().toISOString() }),
        createTodoFixture({ title: '残す' }),
      ]);
      const user = await renderHome();

      await user.click(within(nav()).getByRole('button', { name: 'ゴミ箱を空にする' }));
      await answerConfirmation(user, 'ゴミ箱の 1 件を完全に削除しますか？', '空にする');
      await waitFor(() => expect(trashRow()).toHaveTextContent(/^ゴミ箱$/));
      // The button disappears once the trash is empty, and the current view stays as it was
      expect(
        within(nav()).queryByRole('button', { name: 'ゴミ箱を空にする' }),
      ).not.toBeInTheDocument();
      expect(items().map((li) => li.textContent)).toEqual([expect.stringContaining('残す')]);
      expect((await getAll()).todos.map((t) => t.title)).toEqual(['残す']);
    });

    it('moves a todo to the trash by dropping it on the trash row', async () => {
      await putTodos([createTodoFixture({ title: '洗濯' })]);
      await renderHome();
      const dataTransfer = createDataTransfer();
      const header = items()[0].querySelector('[draggable="true"]') as HTMLElement;
      const row = trashRow().closest('li') as HTMLElement;

      fireEvent.dragStart(header, { dataTransfer });
      expect(fireEvent.dragOver(row, { dataTransfer })).toBe(false);
      fireEvent.drop(row, { dataTransfer });

      expect(await screen.findByText('「洗濯」をゴミ箱に移動しました。')).toBeInTheDocument();
      await waitFor(async () => expect((await getAll()).todos[0].deletedAt).not.toBeNull());
    });
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

      // The created folder is selected, and its path appears in the heading
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

      // A parent folder also shows its subfolders' todos, labeled with the folder name
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

    it('edits the selected folder from the button next to its heading', async () => {
      const parent = createFolderFixture({ name: '仕事' });
      const child = createFolderFixture({ name: '案件', parentId: parent.id });
      await putAll({ folders: [parent, child] });
      const user = await renderHome();
      const main = () => within(screen.getByRole('main'));

      // すべて and 未分類 are not folders, so they have no edit button
      expect(main().queryByRole('button', { name: /を編集$/ })).not.toBeInTheDocument();
      await user.click(within(folderNav()).getByRole('button', { name: /^未分類/ }));
      expect(main().queryByRole('button', { name: /を編集$/ })).not.toBeInTheDocument();

      await user.click(within(folderNav()).getByRole('button', { name: /^案件/ }));
      await user.click(main().getByRole('button', { name: 'フォルダ「案件」を編集' }));
      const dialog = screen.getByRole('dialog', { name: 'フォルダを編集' });
      const name = within(dialog).getByRole('textbox', { name: 'フォルダ名' });
      expect(name).toHaveValue('案件');
      await user.clear(name);
      await user.type(name, '案件 A');
      await user.click(within(dialog).getByRole('button', { name: '保存' }));

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('仕事 / 案件 A');
      expect(main().getByRole('button', { name: 'フォルダ「案件 A」を編集' })).toBeInTheDocument();
      await waitFor(async () =>
        expect((await getAll()).folders.find((f) => f.id === child.id)?.name).toBe('案件 A'),
      );
    });

    it('cancels the folder dialog when its backdrop is clicked, but not from inside', async () => {
      await putAll({ folders: [createFolderFixture({ name: '仕事' })] });
      const user = await renderHome();

      await user.click(within(folderNav()).getByRole('button', { name: 'フォルダ「仕事」を編集' }));
      const dialog = screen.getByRole('dialog', { name: 'フォルダを編集' });
      const name = within(dialog).getByRole('textbox', { name: 'フォルダ名' });
      await user.type(name, ' 2');
      // biome-ignore lint/style/noNonNullAssertion: the dialog sits on the backdrop
      const backdrop = dialog.parentElement!;

      // Do not close when pressed inside and released on the backdrop (e.g. while selecting text)
      fireEvent.pointerDown(name);
      fireEvent.click(backdrop);
      expect(dialog).toBeInTheDocument();

      // A click on the backdrop cancels without saving
      fireEvent.pointerDown(backdrop);
      fireEvent.click(backdrop);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(within(folderNav()).getByRole('button', { name: /^仕事/ })).toBeInTheDocument();
      expect((await getAll()).folders[0]?.name).toBe('仕事');
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
      await answerConfirmation(
        user,
        'フォルダ「仕事」を削除しますか？',
        '削除',
        '中のフォルダ 1 件も削除されます。 中の TODO 1 件は未分類に移ります。',
      );

      // When the selected folder is deleted, the view returns to すべて
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

      // Re-render instead of reloading
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
      /** Drag a task row onto a folder pane row. Returns whether dragover was accepted. */
      function dragTodoTo(title: string, rowName: RegExp) {
        const dataTransfer = createDataTransfer();
        const item = items().find((li) => li.textContent?.includes(title));
        if (!item) throw new Error(`todo not found: ${title}`);
        const row = within(folderNav()).getByRole('button', { name: rowName }).closest('li');
        if (!row) throw new Error('folder row not found');

        const header = item.querySelector('[draggable="true"]');
        if (!header) throw new Error('todo header not found');
        fireEvent.dragStart(header, { dataTransfer });
        fireEvent.dragEnter(row, { dataTransfer });
        // Returns false when preventDefault was called (= dropping is allowed)
        const accepted = !fireEvent.dragOver(row, { dataTransfer });
        return {
          accepted,
          row,
          drop: () => {
            fireEvent.drop(row, { dataTransfer });
            fireEvent.dragEnd(header, { dataTransfer });
          },
        };
      }

      it('moves a todo into a folder and to unfiled', async () => {
        const folder = createFolderFixture({ name: '仕事' });
        await putAll({ folders: [folder], todos: [createTodoFixture({ title: '見積もり' })] });
        const user = await renderHome();

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

        await user.click(screen.getByRole('button', { name: '通知を閉じる' }));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(items()[0]).toHaveTextContent('フォルダ: 仕事');

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

    describe('folder drag and drop', () => {
      /** Folder names in the order shown in the folder pane. */
      const folderOrder = () =>
        [...folderNav().querySelectorAll('li[draggable="true"]')].map(
          (row) => row.querySelector('.truncate')?.textContent,
        );
      const folderRow = (name: RegExp) => {
        const row = within(folderNav()).getByRole('button', { name }).closest('li');
        if (!row) throw new Error('folder row not found');
        return row;
      };

      /**
       * Drag a folder row onto another row. offset is where on the 40px-high target row the pointer is
       * (top edge = before, middle = inside, bottom edge = after). Returns whether dragover was accepted.
       */
      function dragFolderTo(name: RegExp, targetName: RegExp, offset = 20) {
        const dataTransfer = createDataTransfer();
        const source = folderRow(name);
        const row = folderRow(targetName);
        // happy-dom does not lay out, so give the target row a size
        vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
          top: 100,
          bottom: 140,
          height: 40,
          left: 0,
          right: 200,
          width: 200,
          x: 0,
          y: 100,
          toJSON: () => ({}),
        });
        // happy-dom has no DragEvent, so testing-library creates a plain Event and drops clientY
        const fireAt = (type: 'dragOver' | 'drop') => {
          const event = createEvent[type](row, { dataTransfer });
          Object.defineProperty(event, 'clientY', { value: 100 + offset });
          return fireEvent(row, event);
        };
        fireEvent.dragStart(source, { dataTransfer });
        const accepted = !fireAt('dragOver');
        return {
          accepted,
          row,
          drop: () => {
            fireAt('drop');
            fireEvent.dragEnd(source, { dataTransfer });
          },
          cancel: () => fireEvent.dragEnd(source, { dataTransfer }),
        };
      }

      it('reorders folders by dropping them on the top or bottom edge of a row', async () => {
        await putAll({
          folders: [
            createFolderFixture({ name: 'あ' }),
            createFolderFixture({ name: 'い' }),
            createFolderFixture({ name: 'う' }),
          ],
        });
        await renderHome();
        expect(folderOrder()).toEqual(['あ', 'い', 'う']);

        const before = dragFolderTo(/^う/, /^あ/, 2);
        expect(before.accepted).toBe(true);
        expect(before.row).toHaveClass('shadow-[inset_0_3px_0_0_var(--color-blue-500)]');
        before.drop();
        await waitFor(() => expect(folderOrder()).toEqual(['う', 'あ', 'い']));

        dragFolderTo(/^う/, /^い/, 38).drop();
        await waitFor(() => expect(folderOrder()).toEqual(['あ', 'い', 'う']));
        // Reordering among siblings is not announced
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        await waitFor(async () =>
          expect(
            (await getAll()).folders
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((folder) => folder.name),
          ).toEqual(['あ', 'い', 'う']),
        );
      });

      it('moves a folder into another folder and back to the top level via 未分類', async () => {
        const work = createFolderFixture({ name: '仕事' });
        const home = createFolderFixture({ name: '家' });
        await putAll({ folders: [work, home] });
        await renderHome();

        const inside = dragFolderTo(/^家/, /^仕事/);
        expect(inside.row).toHaveClass('bg-blue-600');
        inside.drop();
        expect(await screen.findByText('「家」を「仕事」に移動しました。')).toBeInTheDocument();
        await waitFor(async () =>
          expect((await getAll()).folders.find((f) => f.id === home.id)?.parentId).toBe(work.id),
        );

        const unfiled = dragFolderTo(/^家/, /^未分類/);
        expect(unfiled.accepted).toBe(true);
        unfiled.drop();
        expect(await screen.findByText('「家」を「最上位」に移動しました。')).toBeInTheDocument();
        await waitFor(async () =>
          expect((await getAll()).folders.find((f) => f.id === home.id)?.parentId).toBeNull(),
        );
        expect(folderOrder()).toEqual(['仕事', '家']);
      });

      it('does not accept a folder on itself, its descendants, すべて or the trash', async () => {
        const parent = createFolderFixture({ name: '仕事' });
        const child = createFolderFixture({ name: '案件', parentId: parent.id });
        await putAll({ folders: [parent, child] });
        await renderHome();

        for (const [target, offset] of [
          [/^仕事/, 20],
          [/^案件/, 20],
          [/^案件/, 2],
          [/^すべて/, 20],
          [/^ゴミ箱/, 20],
        ] as const) {
          const drag = dragFolderTo(/^仕事/, target, offset);
          expect(drag.accepted).toBe(false);
          drag.cancel();
        }
        // The child can still be moved out
        expect(dragFolderTo(/^案件/, /^仕事/, 2).accepted).toBe(true);
      });

      it('dims the dragged folder until the drag ends', async () => {
        await putAll({ folders: [createFolderFixture({ name: '仕事' })] });
        await renderHome();
        const dataTransfer = createDataTransfer();
        const row = folderRow(/^仕事/);
        fireEvent.dragStart(row, { dataTransfer });
        expect(row).toHaveClass('opacity-50');
        fireEvent.dragEnd(row, { dataTransfer });
        expect(row).not.toHaveClass('opacity-50');
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

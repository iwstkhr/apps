import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyDraft } from '../lib/answerDraft';
import type { Candidate } from '../lib/types';
import { AnswerForm } from './AnswerForm';

const candidates: Candidate[] = [
  { id: 'c1', startAt: new Date(2026, 9, 3, 19, 0).toISOString() },
  { id: 'c2', startAt: new Date(2026, 9, 4, 19, 0).toISOString() },
];

function setup(overrides: Partial<Parameters<typeof AnswerForm>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <AnswerForm
      candidates={candidates}
      initialDraft={emptyDraft(candidates)}
      onSubmit={onSubmit}
      submitting={false}
      mode="create"
      {...overrides}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe('AnswerForm', () => {
  it('名前が空のまま送信するとエラーを出し、送信しない', async () => {
    const { onSubmit, user } = setup();

    await user.click(screen.getByRole('button', { name: '回答する' }));

    expect(await screen.findByText('お名前を入力してください')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('入力し直すとエラーが消える', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: '回答する' }));
    await screen.findByText('お名前を入力してください');

    await user.type(screen.getByLabelText(/お名前/), '山田');

    await waitFor(() => {
      expect(screen.queryByText('お名前を入力してください')).not.toBeInTheDocument();
    });
  });

  it('検証エラーがある間は送信ボタンを無効にする', async () => {
    const { user } = setup();
    const submit = screen.getByRole('button', { name: '回答する' });

    // 未操作のうちは押せる (押すと検証が走る)
    expect(submit).toBeEnabled();
    await user.click(submit);
    await screen.findByText('お名前を入力してください');
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/お名前/), '山田');
    await waitFor(() => expect(submit).toBeEnabled());

    await user.clear(screen.getByLabelText(/お名前/));
    await waitFor(() => expect(submit).toBeDisabled());
  });

  it('候補ごとの出欠とメッセージを含めて送信する', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/お名前/), '山田');

    const [firstGroup] = screen.getAllByRole('radiogroup');
    await user.click(within(firstGroup!).getByRole('radio', { name: '○ 参加' }));

    await user.type(screen.getByLabelText(/メッセージ/), '20時から合流します');
    await user.click(screen.getByRole('button', { name: '回答する' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      name: '山田',
      message: '20時から合流します',
      choices: { c1: 'YES', c2: 'MAYBE' },
    });
  });

  it('一括ボタンですべての候補を同じ回答にする', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/お名前/), '佐藤');
    await user.click(screen.getByRole('button', { name: '×不参加' }));
    await user.click(screen.getByRole('button', { name: '回答する' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].choices).toEqual({ c1: 'NO', c2: 'NO' });
  });

  it('編集モードでは既存の回答が初期値になる', async () => {
    const { onSubmit, user } = setup({
      mode: 'edit',
      initialDraft: { name: '山田', message: 'よろしく', choices: { c1: 'YES', c2: 'NO' } },
    });

    expect(screen.getByLabelText(/お名前/)).toHaveValue('山田');

    await user.click(screen.getByRole('button', { name: '回答を更新する' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].choices).toEqual({ c1: 'YES', c2: 'NO' });
  });
});

// These assertions verify the Japanese interface explicitly.
beforeEach(() => localStorage.setItem('tsudou:language', 'ja'));

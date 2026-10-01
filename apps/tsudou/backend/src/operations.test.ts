import { RETENTION_MONTHS } from '@tsudou/shared/limits';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRepository } from './memoryRepository';
import * as ops from './operations';
import type { Repository } from './repository';
import { expiresAtFrom } from './retention';
import { generateToken } from './tokens';

const iso = (y: number, m: number, d: number, h: number) =>
  new Date(Date.UTC(y, m - 1, d, h)).toISOString();

const CANDIDATES = [{ startAt: iso(2030, 10, 3, 10) }, { startAt: iso(2030, 10, 4, 10) }];

let repo: Repository;

beforeEach(() => {
  repo = createMemoryRepository();
});

async function seedEvent(overrides: Partial<ops.CreateEventArgs> = {}) {
  const { eventId, manageToken } = await ops.createEvent(repo, {
    title: '新年会',
    fee: 3000,
    memo: '渋谷集合',
    candidates: CANDIDATES,
    ...overrides,
  });
  const event = await ops.getEvent(repo, { eventId });
  if (!event) throw new Error('seed failed');
  return { eventId, manageToken, event };
}

async function answerAll(eventId: string, name: string, statuses: ('YES' | 'NO' | 'MAYBE')[]) {
  const event = await ops.getEvent(repo, { eventId });
  if (!event) throw new Error('event missing');
  return ops.submitAnswer(repo, {
    eventId,
    name,
    message: null,
    choices: event.candidates.map((c, i) => ({
      candidateId: c.id,
      status: statuses[i] ?? 'MAYBE',
    })),
  });
}

describe('createEvent', () => {
  it('管理トークンを一度だけ返し、保存はハッシュのみ', async () => {
    const { eventId, manageToken } = await seedEvent();

    const stored = await repo.getEvent(eventId);
    expect(stored?.manageTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.manageTokenHash).not.toBe(manageToken);
  });

  it('推測されにくい ID を採番する', async () => {
    const a = await seedEvent();
    const b = await seedEvent();
    expect(a.eventId).not.toBe(b.eventId);
    expect(a.eventId).toHaveLength(22);
  });

  it('不正な入力を拒否する', async () => {
    await expect(seedEvent({ title: '  ' })).rejects.toThrow(/VALIDATION/);
    await expect(seedEvent({ candidates: [] })).rejects.toThrow(/VALIDATION/);
    await expect(seedEvent({ fee: -1 })).rejects.toThrow(/VALIDATION/);
  });

  it('過去の日時を候補にできない', async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    await expect(seedEvent({ candidates: [...CANDIDATES, { startAt: past }] })).rejects.toThrow(
      /過去/,
    );
  });

  it('編集では過去の日時の候補も保存できる (開催済みの候補を残せるように)', async () => {
    const { eventId, manageToken } = await seedEvent();
    const past = new Date(Date.now() - 60_000).toISOString();

    const updated = await ops.updateEvent(repo, {
      eventId,
      manageToken,
      candidates: [...CANDIDATES, { startAt: past }],
    });
    expect(updated.candidates).toHaveLength(3);
  });
});

describe('保持期間 (TTL)', () => {
  it('イベントに作成から3ヶ月後の TTL を付ける', async () => {
    const before = expiresAtFrom();
    const { eventId } = await seedEvent();
    const after = expiresAtFrom();

    const stored = await repo.getEvent(eventId);
    expect(stored?.expiresAt).toBeGreaterThanOrEqual(before);
    expect(stored?.expiresAt).toBeLessThanOrEqual(after);
    expect(RETENTION_MONTHS).toBe(3);
  });

  it('回答はイベントと同じ時刻に消えるよう TTL を引き継ぐ', async () => {
    const { eventId } = await seedEvent();
    const { answer } = await answerAll(eventId, '山田', ['YES', 'NO']);

    const event = await repo.getEvent(eventId);
    const stored = await repo.getAnswer(answer.id);
    expect(stored?.expiresAt).toBe(event?.expiresAt);
  });

  it('更新しても保持期間は延長しない (作成時点から数える)', async () => {
    const { eventId, manageToken } = await seedEvent();
    const before = (await repo.getEvent(eventId))?.expiresAt;

    await ops.updateEvent(repo, { eventId, manageToken, title: '忘年会' });

    expect((await repo.getEvent(eventId))?.expiresAt).toBe(before);
  });

  it('期限切れのイベントは、削除される前でも存在しない扱いになる', async () => {
    const { eventId, manageToken } = await seedEvent();
    await answerAll(eventId, '山田', ['YES', 'NO']);

    // 期限切れの削除は 1 日 1 回の Cron Trigger なので、レコードは残ったまま期限だけが過ぎる
    await repo.updateEvent(eventId, { expiresAt: Math.floor(Date.now() / 1000) - 1 } as never);

    expect(await ops.getEvent(repo, { eventId })).toBeNull();
    await expect(ops.updateEvent(repo, { eventId, manageToken, title: 'x' })).rejects.toThrow(
      /NOT_FOUND/,
    );
    await expect(ops.deleteEvent(repo, { eventId, manageToken })).rejects.toThrow(/NOT_FOUND/);
    // answerAll はヘルパ内で getEvent を呼ぶため、submitAnswer を直接叩く
    await expect(
      ops.submitAnswer(repo, { eventId, name: '佐藤', message: null, choices: [] }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});

describe('getEvent', () => {
  it('トークンのハッシュを一切返さない', async () => {
    const { eventId } = await seedEvent();
    await answerAll(eventId, '山田', ['YES', 'NO']);

    const view = await ops.getEvent(repo, { eventId });
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain('manageTokenHash');
    expect(serialized).not.toContain('editTokenHash');
  });

  it('存在しないイベントは null', async () => {
    expect(await ops.getEvent(repo, { eventId: 'missing' })).toBeNull();
  });

  it('回答を作成順に返す', async () => {
    const { eventId } = await seedEvent();
    await answerAll(eventId, '山田', ['YES', 'YES']);
    await answerAll(eventId, '佐藤', ['NO', 'NO']);

    const view = await ops.getEvent(repo, { eventId });
    expect(view?.answers.map((a) => a.name)).toEqual(['山田', '佐藤']);
  });
});

describe('updateEvent', () => {
  it('管理トークンが無いと拒否する', async () => {
    const { eventId } = await seedEvent();
    await expect(
      ops.updateEvent(repo, { eventId, manageToken: generateToken(), title: '書き換え' }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it('タイトル・参加費・メモを更新する', async () => {
    const { eventId, manageToken } = await seedEvent();
    const updated = await ops.updateEvent(repo, {
      eventId,
      manageToken,
      title: '忘年会',
      fee: 0,
      memo: null,
    });

    expect(updated.title).toBe('忘年会');
    expect(updated.fee).toBe(0);
    expect(updated.memo).toBeNull();
  });

  it('候補を追加すると既存回答は「未定」で埋まる', async () => {
    const { eventId, manageToken, event } = await seedEvent();
    await answerAll(eventId, '山田', ['YES', 'NO']);

    const updated = await ops.updateEvent(repo, {
      eventId,
      manageToken,
      candidates: [
        ...event.candidates.map((c) => ({ id: c.id, startAt: c.startAt })),
        { startAt: iso(2030, 10, 5, 10) },
      ],
    });

    expect(updated.candidates).toHaveLength(3);
    expect(updated.answers[0]!.choices).toHaveLength(3);
    expect(updated.answers[0]!.choices[2]!.status).toBe('MAYBE');
    // 既存の回答は維持される
    expect(updated.answers[0]!.choices[0]!.status).toBe('YES');
  });

  it('候補を削除すると対応する回答も消える', async () => {
    const { eventId, manageToken, event } = await seedEvent();
    await answerAll(eventId, '山田', ['YES', 'NO']);

    const kept = event.candidates[0]!;
    const updated = await ops.updateEvent(repo, {
      eventId,
      manageToken,
      candidates: [{ id: kept.id, startAt: kept.startAt }],
    });

    expect(updated.candidates).toHaveLength(1);
    expect(updated.answers[0]!.choices).toEqual([{ candidateId: kept.id, status: 'YES' }]);
  });

  it('締切フラグを立てられる', async () => {
    const { eventId, manageToken } = await seedEvent();
    expect((await ops.updateEvent(repo, { eventId, manageToken, closed: true })).closed).toBe(true);
  });
});

describe('deleteEvent', () => {
  it('管理トークンが無いと拒否する', async () => {
    const { eventId } = await seedEvent();
    await expect(ops.deleteEvent(repo, { eventId, manageToken: 'wrong' })).rejects.toThrow(
      /FORBIDDEN/,
    );
  });

  it('紐づく回答ごと削除する', async () => {
    const { eventId, manageToken } = await seedEvent();
    const { answer } = await answerAll(eventId, '山田', ['YES', 'YES']);
    const other = await seedEvent();
    const { answer: otherAnswer } = await answerAll(other.eventId, 'guest', ['NO', 'NO']);

    await ops.deleteEvent(repo, { eventId, manageToken });

    expect(await repo.getEvent(eventId)).toBeNull();
    expect(await repo.getAnswer(answer.id)).toBeNull();
    expect(await repo.getEvent(other.eventId)).not.toBeNull();
    expect(await repo.getAnswer(otherAnswer.id)).not.toBeNull();
  });
});

describe('submitAnswer', () => {
  it('編集キーを一度だけ返し、保存はハッシュのみ', async () => {
    const { eventId } = await seedEvent();
    const { answer, editToken } = await answerAll(eventId, '山田', ['YES', 'NO']);

    const stored = await repo.getAnswer(answer.id);
    expect(stored?.editTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.editTokenHash).not.toBe(editToken);
  });

  it('同じ名前の二重回答を拒否する', async () => {
    const { eventId } = await seedEvent();
    await answerAll(eventId, '山田', ['YES', 'YES']);
    await expect(answerAll(eventId, '山田', ['NO', 'NO'])).rejects.toThrow(/DUPLICATE_NAME/);
  });

  it('締切後は回答できない', async () => {
    const { eventId, manageToken } = await seedEvent();
    await ops.updateEvent(repo, { eventId, manageToken, closed: true });
    await expect(answerAll(eventId, '山田', ['YES', 'YES'])).rejects.toThrow(/CLOSED/);
  });

  it('存在しないイベントには回答できない', async () => {
    await expect(
      ops.submitAnswer(repo, { eventId: 'missing', name: '山田', message: null, choices: [] }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});

describe('updateAnswer', () => {
  it('編集キーが正しければ更新できる', async () => {
    const { eventId, event } = await seedEvent();
    const { answer, editToken } = await answerAll(eventId, '山田', ['YES', 'NO']);

    const updated = await ops.updateAnswer(repo, {
      answerId: answer.id,
      editToken,
      name: '山田 太郎',
      message: '20時から合流します',
      choices: event.candidates.map((c) => ({ candidateId: c.id, status: 'YES' as const })),
    });

    expect(updated.name).toBe('山田 太郎');
    expect(updated.message).toBe('20時から合流します');
    expect(updated.choices.every((c) => c.status === 'YES')).toBe(true);
  });

  it('編集キーが違えば拒否する', async () => {
    const { eventId, event } = await seedEvent();
    const { answer } = await answerAll(eventId, '山田', ['YES', 'NO']);

    await expect(
      ops.updateAnswer(repo, {
        answerId: answer.id,
        editToken: generateToken(),
        name: '乗っ取り',
        message: null,
        choices: event.candidates.map((c) => ({ candidateId: c.id, status: 'NO' as const })),
      }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it('他人の名前には変更できない', async () => {
    const { eventId, event } = await seedEvent();
    await answerAll(eventId, '佐藤', ['YES', 'YES']);
    const { answer, editToken } = await answerAll(eventId, '山田', ['YES', 'NO']);

    await expect(
      ops.updateAnswer(repo, {
        answerId: answer.id,
        editToken,
        name: '佐藤',
        message: null,
        choices: event.candidates.map((c) => ({ candidateId: c.id, status: 'YES' as const })),
      }),
    ).rejects.toThrow(/DUPLICATE_NAME/);
  });

  it('自分の名前のままなら更新できる', async () => {
    const { eventId, event } = await seedEvent();
    const { answer, editToken } = await answerAll(eventId, '山田', ['YES', 'NO']);

    const updated = await ops.updateAnswer(repo, {
      answerId: answer.id,
      editToken,
      name: '山田',
      message: null,
      choices: event.candidates.map((c) => ({ candidateId: c.id, status: 'NO' as const })),
    });
    expect(updated.name).toBe('山田');
  });
});

describe('deleteAnswer', () => {
  it('本人は編集キーで削除できる', async () => {
    const { eventId } = await seedEvent();
    const { answer, editToken } = await answerAll(eventId, '山田', ['YES', 'NO']);

    await ops.deleteAnswer(repo, { answerId: answer.id, editToken });
    expect(await repo.getAnswer(answer.id)).toBeNull();
  });

  it('ホストは管理トークンで削除できる', async () => {
    const { eventId, manageToken } = await seedEvent();
    const { answer } = await answerAll(eventId, '山田', ['YES', 'NO']);

    await ops.deleteAnswer(repo, { answerId: answer.id, manageToken });
    expect(await repo.getAnswer(answer.id)).toBeNull();
  });

  it('どちらのトークンも無ければ拒否する', async () => {
    const { eventId } = await seedEvent();
    const { answer } = await answerAll(eventId, '山田', ['YES', 'NO']);

    await expect(ops.deleteAnswer(repo, { answerId: answer.id })).rejects.toThrow(/FORBIDDEN/);
    await expect(
      ops.deleteAnswer(repo, { answerId: answer.id, manageToken: generateToken() }),
    ).rejects.toThrow(/FORBIDDEN/);
    expect(await repo.getAnswer(answer.id)).not.toBeNull();
  });
});

describe('一連の流れ', () => {
  it('作成 → 回答 → 編集 → 締切 → 削除', async () => {
    const { eventId, manageToken, event } = await seedEvent();

    const { answer, editToken } = await answerAll(eventId, '山田', ['YES', 'MAYBE']);
    await answerAll(eventId, '佐藤', ['YES', 'NO']);

    await ops.updateAnswer(repo, {
      answerId: answer.id,
      editToken,
      name: '山田',
      message: '遅れます',
      choices: event.candidates.map((c, i) => ({
        candidateId: c.id,
        status: i === 0 ? ('YES' as const) : ('NO' as const),
      })),
    });

    const beforeClose = await ops.getEvent(repo, { eventId });
    expect(beforeClose?.answers).toHaveLength(2);
    expect(beforeClose?.answers.find((a) => a.name === '山田')?.message).toBe('遅れます');

    await ops.updateEvent(repo, { eventId, manageToken, closed: true });
    await expect(answerAll(eventId, '鈴木', ['YES', 'YES'])).rejects.toThrow(/CLOSED/);

    await ops.deleteEvent(repo, { eventId, manageToken });
    expect(await ops.getEvent(repo, { eventId })).toBeNull();
    expect(await repo.listAnswersByEvent(eventId)).toHaveLength(0);
  });
});

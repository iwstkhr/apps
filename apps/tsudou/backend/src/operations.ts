import type { AnswerView, EventView } from '@tsudou/shared/types';
import type * as z from 'zod';
import { AppError, duplicateNameError, forbiddenError, notFoundError } from './errors';
import type { AnswerRecord, EventPatch, EventRecord, Repository } from './repository';
import { expiresAtFrom, isExpired } from './retention';
import type { AnswerBodySchema, CreateEventBodySchema, UpdateEventBodySchema } from './schemas';
import { generateEventId, generateToken, hashToken, verifyToken } from './tokens';
import {
  LIMITS,
  normalizeOptionalText,
  validateCandidates,
  validateChoices,
  validateFee,
  validateName,
  validateTitle,
} from './validate';

export type { AnswerView, EventView } from '@tsudou/shared/types';

/**
 * 公開してよいフィールドだけを持つ型に詰め替える。
 * manageTokenHash / editTokenHash は型に存在しないので構造的に漏れない。
 */
function toAnswerView(answer: AnswerRecord): AnswerView {
  return {
    id: answer.id,
    name: answer.name,
    message: answer.message,
    choices: answer.choices,
    createdAt: answer.createdAt,
    updatedAt: answer.updatedAt,
  };
}

function toEventView(event: EventRecord, answers: AnswerRecord[]): EventView {
  return {
    id: event.id,
    title: event.title,
    fee: event.fee,
    memo: event.memo,
    candidates: event.candidates,
    closed: event.closed,
    createdAt: event.createdAt,
    expiresAt: event.expiresAt,
    answers: answers
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(toAnswerView),
  };
}

/**
 * 期限切れの削除は 1 日 1 回の Cron Trigger なので、期限を過ぎたレコードは
 * まだ読めてしまう。アプリ側では存在しないものとして扱う。
 */
async function findLiveEvent(repo: Repository, eventId: string): Promise<EventRecord | null> {
  const event = await repo.getEvent(eventId);
  if (!event || isExpired(event.expiresAt)) return null;
  return event;
}

async function loadEvent(repo: Repository, eventId: string): Promise<EventRecord> {
  const event = await findLiveEvent(repo, eventId);
  if (!event) {
    throw notFoundError('イベントが見つかりません');
  }
  return event;
}

async function loadAnswer(repo: Repository, answerId: string): Promise<AnswerRecord> {
  const answer = await repo.getAnswer(answerId);
  if (!answer) {
    throw notFoundError('回答が見つかりません');
  }
  return answer;
}

/** 締切済みなら弾く。回答の新規作成と更新で共通。 */
function assertOpen(event: EventRecord): void {
  if (event.closed) {
    throw new AppError('CLOSED', 'このイベントは締め切られています');
  }
}

/**
 * 同じ名前の回答がすでにあれば弾く。
 * 更新時は自分自身を除外する (名前を変えずに保存できるように)。
 */
function assertNameAvailable(
  answers: readonly AnswerRecord[],
  name: string,
  excludeAnswerId?: string,
): void {
  const conflict = answers.some((answer) => answer.id !== excludeAnswerId && answer.name === name);
  if (conflict) {
    throw duplicateNameError();
  }
}

/** 管理トークンを検証したうえでイベントを返す。 */
async function loadEventAsHost(
  repo: Repository,
  eventId: string,
  manageToken: string,
): Promise<EventRecord> {
  const event = await loadEvent(repo, eventId);
  if (!verifyToken(manageToken, event.manageTokenHash)) {
    throw forbiddenError('管理用 URL が正しくありません');
  }
  return event;
}

// ---------------------------------------------------------------- events

export type CreateEventArgs = z.infer<typeof CreateEventBodySchema>;

export async function createEvent(repo: Repository, args: CreateEventArgs) {
  const manageToken = generateToken();

  const event = await repo.createEvent({
    id: generateEventId(),
    // 保持期間は作成時点から数える。以降の更新では延長しない。
    expiresAt: expiresAtFrom(),
    title: validateTitle(args.title),
    fee: validateFee(args.fee),
    memo: normalizeOptionalText(args.memo, 'メモ', LIMITS.memoMax),
    candidates: validateCandidates(args.candidates, { rejectPast: true }),
    closed: false,
    manageTokenHash: hashToken(manageToken),
  });

  // 管理トークンを平文で返すのはこの一度きり。以降はハッシュしか保持しない。
  return { eventId: event.id, manageToken };
}

export async function getEvent(
  repo: Repository,
  args: { eventId: string },
): Promise<EventView | null> {
  const event = await findLiveEvent(repo, args.eventId);
  if (!event) return null;

  const answers = await repo.listAnswersByEvent(event.id);
  return toEventView(event, answers);
}

export type UpdateEventArgs = z.infer<typeof UpdateEventBodySchema> & {
  eventId: string;
  manageToken: string;
};

export async function updateEvent(repo: Repository, args: UpdateEventArgs): Promise<EventView> {
  const event = await loadEventAsHost(repo, args.eventId, args.manageToken);

  const patch: EventPatch = {};
  if (args.title != null) patch.title = validateTitle(args.title);
  if (args.fee !== undefined) patch.fee = validateFee(args.fee);
  if (args.memo !== undefined)
    patch.memo = normalizeOptionalText(args.memo, 'メモ', LIMITS.memoMax);
  if (args.closed != null) patch.closed = args.closed;
  if (args.candidates) patch.candidates = validateCandidates(args.candidates);

  const updated = await repo.updateEvent(event.id, patch);

  const answers = await repo.listAnswersByEvent(event.id);
  return toEventView(updated, answers);
}

export async function deleteEvent(
  repo: Repository,
  args: { eventId: string; manageToken: string },
): Promise<void> {
  const event = await loadEventAsHost(repo, args.eventId, args.manageToken);
  await repo.deleteEvent(event.id);
}

// --------------------------------------------------------------- answers

export type SubmitAnswerArgs = z.infer<typeof AnswerBodySchema> & { eventId: string };

export async function submitAnswer(repo: Repository, args: SubmitAnswerArgs) {
  const event = await loadEvent(repo, args.eventId);
  assertOpen(event);

  const name = validateName(args.name);
  assertNameAvailable(await repo.listAnswersByEvent(event.id), name);

  const editToken = generateToken();
  const answer = await repo.createAnswer({
    id: crypto.randomUUID(),
    eventId: event.id,
    // イベントと同時に消えるよう、イベントの期限をそのまま引き継ぐ
    expiresAt: event.expiresAt,
    name,
    message: normalizeOptionalText(args.message, 'メッセージ', LIMITS.messageMax),
    choices: validateChoices(args.choices, event.candidates),
    editTokenHash: hashToken(editToken),
  });

  // 編集キーを平文で返すのはこの一度きり。クライアントが localStorage に保持する。
  return { answer: toAnswerView(answer), editToken };
}

export type UpdateAnswerArgs = z.infer<typeof AnswerBodySchema> & {
  answerId: string;
  editToken: string;
};

export async function updateAnswer(repo: Repository, args: UpdateAnswerArgs): Promise<AnswerView> {
  const answer = await loadAnswer(repo, args.answerId);
  if (!verifyToken(args.editToken, answer.editTokenHash)) {
    throw forbiddenError('この回答を編集する権限がありません');
  }

  const event = await loadEvent(repo, answer.eventId);
  assertOpen(event);

  const name = validateName(args.name);
  assertNameAvailable(await repo.listAnswersByEvent(event.id), name, answer.id);

  const updated = await repo.updateAnswer(answer.id, {
    name,
    message: normalizeOptionalText(args.message, 'メッセージ', LIMITS.messageMax),
    choices: validateChoices(args.choices, event.candidates),
  });

  return toAnswerView(updated);
}

export type DeleteAnswerArgs = {
  answerId: string;
  editToken?: string | null;
  manageToken?: string | null;
};

export async function deleteAnswer(repo: Repository, args: DeleteAnswerArgs): Promise<void> {
  const answer = await loadAnswer(repo, args.answerId);

  // 本人 (編集キー) かホスト (管理トークン) のどちらかであればよい
  const isOwner = verifyToken(args.editToken, answer.editTokenHash);
  let isHost = false;
  if (!isOwner && args.manageToken) {
    const event = await repo.getEvent(answer.eventId);
    isHost = !!event && verifyToken(args.manageToken, event.manageTokenHash);
  }

  if (!isOwner && !isHost) {
    throw forbiddenError('この回答を削除する権限がありません');
  }

  await repo.deleteAnswer(answer.id);
}

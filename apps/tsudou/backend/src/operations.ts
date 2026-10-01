import type { AnswerView, CandidateInput, Choice, EventView } from '@tsudou/shared/types';
import { AppError, duplicateNameError, forbiddenError, notFoundError } from './errors';
import type { AnswerRecord, EventRecord, Repository } from './repository';
import { expiresAtFrom, isExpired } from './retention';
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

export type CreateEventArgs = {
  title: string;
  fee?: number | null;
  memo?: string | null;
  candidates: CandidateInput[];
};

export async function createEvent(repo: Repository, args: CreateEventArgs) {
  const manageToken = generateToken();

  const event = await repo.createEvent({
    id: generateEventId(),
    // 保持期間は作成時点から数える。以降の更新では延長しない。
    expiresAt: expiresAtFrom(),
    title: validateTitle(args.title),
    fee: validateFee(args.fee),
    memo: normalizeOptionalText(args.memo, LIMITS.memoMax, 'メモ'),
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

export type UpdateEventArgs = {
  eventId: string;
  manageToken: string;
  title?: string | null;
  fee?: number | null;
  memo?: string | null;
  candidates?: CandidateInput[] | null;
  closed?: boolean | null;
};

export async function updateEvent(repo: Repository, args: UpdateEventArgs): Promise<EventView> {
  const event = await loadEventAsHost(repo, args.eventId, args.manageToken);

  const patch: Parameters<Repository['updateEvent']>[1] = {};
  if (args.title != null) patch.title = validateTitle(args.title);
  if (args.fee !== undefined) patch.fee = validateFee(args.fee);
  if (args.memo !== undefined)
    patch.memo = normalizeOptionalText(args.memo, LIMITS.memoMax, 'メモ');
  if (args.closed != null) patch.closed = args.closed;

  const candidates = args.candidates ? validateCandidates(args.candidates) : null;
  if (candidates) patch.candidates = candidates;

  const updated = await repo.updateEvent(event.id, patch);

  const answers = await repo.listAnswersByEvent(event.id);
  return toEventView(updated, answers);
}

export async function deleteEvent(
  repo: Repository,
  args: { eventId: string; manageToken: string },
) {
  const event = await loadEventAsHost(repo, args.eventId, args.manageToken);

  // 孤児レコードが残らないよう、先に回答を消してからイベントを消す
  const answers = await repo.listAnswersByEvent(event.id);
  await Promise.all(answers.map((answer) => repo.deleteAnswer(answer.id)));
  await repo.deleteEvent(event.id);

  return true;
}

// --------------------------------------------------------------- answers

export type SubmitAnswerArgs = {
  eventId: string;
  name: string;
  message?: string | null;
  choices: Choice[];
};

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
    message: normalizeOptionalText(args.message, LIMITS.messageMax, 'メッセージ'),
    choices: validateChoices(args.choices, event.candidates),
    editTokenHash: hashToken(editToken),
  });

  // 編集キーを平文で返すのはこの一度きり。クライアントが localStorage に保持する。
  return { answer: toAnswerView(answer), editToken };
}

export type UpdateAnswerArgs = {
  answerId: string;
  editToken: string;
  name: string;
  message?: string | null;
  choices: Choice[];
};

export async function updateAnswer(repo: Repository, args: UpdateAnswerArgs): Promise<AnswerView> {
  const answer = await repo.getAnswer(args.answerId);
  if (!answer) {
    throw notFoundError('回答が見つかりません');
  }
  if (!verifyToken(args.editToken, answer.editTokenHash)) {
    throw forbiddenError('この回答を編集する権限がありません');
  }

  const event = await loadEvent(repo, answer.eventId);
  assertOpen(event);

  const name = validateName(args.name);
  assertNameAvailable(await repo.listAnswersByEvent(event.id), name, answer.id);

  const updated = await repo.updateAnswer(answer.id, {
    name,
    message: normalizeOptionalText(args.message, LIMITS.messageMax, 'メッセージ'),
    choices: validateChoices(args.choices, event.candidates),
  });

  return toAnswerView(updated);
}

export type DeleteAnswerArgs = {
  answerId: string;
  editToken?: string | null;
  manageToken?: string | null;
};

export async function deleteAnswer(repo: Repository, args: DeleteAnswerArgs) {
  const answer = await repo.getAnswer(args.answerId);
  if (!answer) {
    throw notFoundError('回答が見つかりません');
  }

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
  return true;
}

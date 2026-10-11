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
 * Copy into a type that has only the fields safe to expose.
 * manageTokenHash / editTokenHash do not exist in the type, so they cannot leak structurally.
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
 * Expired events are deleted by a once-a-day Cron Trigger, so records past their expiry
 * can still be read. The app treats them as nonexistent.
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

/** Reject if closed. Shared by creating and updating responses. */
function assertOpen(event: EventRecord): void {
  if (event.closed) {
    throw new AppError('CLOSED', 'このイベントは締め切られています');
  }
}

/**
 * Reject if a response with the same name already exists.
 * When updating, exclude the response itself (so it can be saved without changing the name).
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

/** Verify the manage token and return the event. */
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
    // The retention period counts from creation. Later updates do not extend it.
    expiresAt: expiresAtFrom(),
    title: validateTitle(args.title),
    fee: validateFee(args.fee),
    memo: normalizeOptionalText(args.memo, 'メモ', LIMITS.memoMax),
    candidates: validateCandidates(args.candidates, { rejectPast: true }),
    closed: false,
    manageTokenHash: hashToken(manageToken),
  });

  // This is the only time the manage token is returned in plain text. Afterwards only its hash is kept.
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
    // Inherit the event's expiry so the response is deleted together with the event
    expiresAt: event.expiresAt,
    name,
    message: normalizeOptionalText(args.message, 'メッセージ', LIMITS.messageMax),
    choices: validateChoices(args.choices, event.candidates),
    editTokenHash: hashToken(editToken),
  });

  // This is the only time the edit key is returned in plain text. The client keeps it in localStorage.
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

  // Either the respondent (edit key) or the host (manage token) is enough
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

import type {
  AnswerPatch,
  AnswerRecord,
  EventPatch,
  EventRecord,
  NewAnswer,
  NewEvent,
  Repository,
} from './repository';

import { reconcileChoices } from './validate';

/**
 * テスト用のインメモリ実装。D1 と同じく「更新は部分適用」「取得は参照ではなく複製」
 * になるよう、出し入れのたびに構造化複製する。
 */
export function createMemoryRepository(
  now: () => string = () => new Date().toISOString(),
): Repository & {
  events: Map<string, EventRecord>;
  answers: Map<string, AnswerRecord>;
} {
  const events = new Map<string, EventRecord>();
  const answers = new Map<string, AnswerRecord>();
  const clone = <T>(value: T): T => structuredClone(value);

  return {
    events,
    answers,

    async createEvent(input: NewEvent) {
      const timestamp = now();
      const record: EventRecord = { ...clone(input), createdAt: timestamp, updatedAt: timestamp };
      events.set(record.id, record);
      return clone(record);
    },

    async getEvent(eventId: string) {
      const record = events.get(eventId);
      return record ? clone(record) : null;
    },

    async updateEvent(eventId: string, patch: EventPatch) {
      const current = events.get(eventId);
      if (!current) throw new Error(`event not found: ${eventId}`);
      const next: EventRecord = { ...current, ...clone(patch), updatedAt: now() };
      // 全レコードの構築が成功してから反映し、途中の失敗では何も変更しない。
      const reconciled = patch.candidates
        ? [...answers.values()]
            .filter((answer) => answer.eventId === eventId)
            .map((answer) => {
              const choices = reconcileChoices(answer.choices, next.candidates);
              return JSON.stringify(choices) === JSON.stringify(answer.choices)
                ? answer
                : { ...answer, choices, updatedAt: next.updatedAt };
            })
        : [];
      const result = clone(next);
      events.set(eventId, next);
      for (const answer of reconciled) answers.set(answer.id, answer);
      return result;
    },

    async deleteEvent(eventId: string) {
      events.delete(eventId);
    },

    async createAnswer(input: NewAnswer) {
      const timestamp = now();
      const record: AnswerRecord = { ...clone(input), createdAt: timestamp, updatedAt: timestamp };
      answers.set(record.id, record);
      return clone(record);
    },

    async getAnswer(answerId: string) {
      const record = answers.get(answerId);
      return record ? clone(record) : null;
    },

    async listAnswersByEvent(eventId: string) {
      return [...answers.values()].filter((a) => a.eventId === eventId).map(clone);
    },

    async updateAnswer(answerId: string, patch: AnswerPatch) {
      const current = answers.get(answerId);
      if (!current) throw new Error(`answer not found: ${answerId}`);
      const next: AnswerRecord = { ...current, ...clone(patch), updatedAt: now() };
      answers.set(answerId, next);
      return clone(next);
    },

    async deleteAnswer(answerId: string) {
      answers.delete(answerId);
    },
  };
}

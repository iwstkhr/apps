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
 * In-memory implementation for tests. Every read and write is structured-cloned so that, as with D1,
 * "updates are partial" and "reads return copies, not references".
 */
export function createMemoryRepository(
  now: () => string = () => new Date().toISOString(),
): Repository {
  const events = new Map<string, EventRecord>();
  const answers = new Map<string, AnswerRecord>();
  const clone = <T>(value: T): T => structuredClone(value);

  return {
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
      // Apply only after every record is built successfully; a failure midway changes nothing.
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
      for (const [id, answer] of answers) {
        if (answer.eventId === eventId) answers.delete(id);
      }
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

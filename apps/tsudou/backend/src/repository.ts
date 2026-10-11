import type { Candidate, Choice } from '@tsudou/shared/types';

export type EventRecord = {
  id: string;
  title: string;
  fee: number | null;
  memo: string | null;
  candidates: Candidate[];
  closed: boolean;
  manageTokenHash: string;
  /** Retention deadline (epoch seconds). The Cron Trigger deletes records past it. */
  expiresAt: number;
  createdAt: string;
  updatedAt: string;
};

export type AnswerRecord = {
  id: string;
  eventId: string;
  name: string;
  message: string | null;
  choices: Choice[];
  editTokenHash: string;
  /** Same value as the event's, so it is deleted together with the event. */
  expiresAt: number;
  createdAt: string;
  updatedAt: string;
};

export type NewEvent = Omit<EventRecord, 'createdAt' | 'updatedAt'>;
export type NewAnswer = Omit<AnswerRecord, 'createdAt' | 'updatedAt'>;

export type EventPatch = Partial<
  Pick<EventRecord, 'title' | 'fee' | 'memo' | 'candidates' | 'closed'>
>;
export type AnswerPatch = Partial<Pick<AnswerRecord, 'name' | 'message' | 'choices'>>;

/**
 * The data access boundary. Production plugs in the D1 implementation (d1-repository.ts),
 * and tests plug in the in-memory one.
 */
export interface Repository {
  createEvent(input: NewEvent): Promise<EventRecord>;
  getEvent(eventId: string): Promise<EventRecord | null>;
  /** When candidates are updated, existing responses' choices are adjusted in the same operation, and everything is saved atomically. */
  updateEvent(eventId: string, patch: EventPatch): Promise<EventRecord>;
  /** Delete an event together with its responses. Other events are unaffected. */
  deleteEvent(eventId: string): Promise<void>;

  createAnswer(input: NewAnswer): Promise<AnswerRecord>;
  getAnswer(answerId: string): Promise<AnswerRecord | null>;
  listAnswersByEvent(eventId: string): Promise<AnswerRecord[]>;
  updateAnswer(answerId: string, patch: AnswerPatch): Promise<AnswerRecord>;
  deleteAnswer(answerId: string): Promise<void>;
}

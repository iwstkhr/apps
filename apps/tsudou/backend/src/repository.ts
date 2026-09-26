import type { Candidate, Choice } from '@tsudou/shared/types';

export type EventRecord = {
  id: string;
  title: string;
  fee: number | null;
  memo: string | null;
  candidates: Candidate[];
  closed: boolean;
  manageTokenHash: string;
  /** 保持期限 (エポック秒)。過ぎたものは Cron Trigger が消す。 */
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
  /** イベントと同じ値。イベントと同時に消えるようにする。 */
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
 * データアクセスの境界。本番は D1 実装 (d1Repository.ts)、
 * テストはインメモリ実装を差し込む。
 */
export interface Repository {
  createEvent(input: NewEvent): Promise<EventRecord>;
  getEvent(eventId: string): Promise<EventRecord | null>;
  updateEvent(eventId: string, patch: EventPatch): Promise<EventRecord>;
  deleteEvent(eventId: string): Promise<void>;

  createAnswer(input: NewAnswer): Promise<AnswerRecord>;
  getAnswer(answerId: string): Promise<AnswerRecord | null>;
  listAnswersByEvent(eventId: string): Promise<AnswerRecord[]>;
  updateAnswer(answerId: string, patch: AnswerPatch): Promise<AnswerRecord>;
  deleteAnswer(answerId: string): Promise<void>;
}

/**
 * Domain types shared by the server and the frontend.
 *
 * This is also bundled for the browser, so Node-only APIs cannot be used (the same constraint as limits.ts).
 * The frontend cannot reference the backend package, so types used by both live here.
 */

export type AnswerStatus = 'YES' | 'NO' | 'MAYBE';

export type Candidate = { id: string; startAt: string };
export type CandidateInput = { id?: string | null; startAt: string };
export type Choice = { candidateId: string; status: AnswerStatus };

export type AnswerView = {
  id: string;
  name: string;
  message: string | null;
  choices: Choice[];
  createdAt: string;
  updatedAt: string;
};

export type EventView = {
  id: string;
  title: string;
  fee: number | null;
  memo: string | null;
  candidates: Candidate[];
  closed: boolean;
  createdAt: string;
  /** When it is deleted automatically (epoch seconds). */
  expiresAt: number;
  answers: AnswerView[];
};

/**
 * サーバとフロントで共有するドメイン型。
 *
 * ブラウザにもバンドルされるため、Node 専用の API は使えない (limits.ts と同じ制約)。
 * フロントはバックエンドのパッケージを参照できないので、両方で使う型はここに置く。
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
  /** 自動削除される時刻 (エポック秒)。 */
  expiresAt: number;
  answers: AnswerView[];
};

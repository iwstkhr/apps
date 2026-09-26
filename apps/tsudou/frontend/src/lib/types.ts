/**
 * ドメイン型はサーバと共有する (shared/src/types.ts が唯一の定義)。
 * 表示用のラベルだけがフロント固有なのでここに置く。
 */
export type {
  AnswerStatus,
  AnswerView,
  Candidate,
  CandidateInput,
  Choice,
  EventView,
} from '@tsudou/shared/types';

import type { AnswerStatus } from '@tsudou/shared/types';

export const STATUS_LABEL: Record<AnswerStatus, string> = {
  YES: '参加',
  NO: '不参加',
  MAYBE: '未定',
};

export const STATUS_MARK: Record<AnswerStatus, string> = {
  YES: '○',
  NO: '×',
  MAYBE: '△',
};

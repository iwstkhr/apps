/**
 * Domain types are shared with the server (shared/src/types.ts is the single definition).
 * Only display labels are frontend-specific, so they live here.
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

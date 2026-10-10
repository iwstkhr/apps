import type { AnswerStatus, Candidate, Choice } from './types';

export type AnswerDraft = {
  name: string;
  message: string;
  choices: Record<string, AnswerStatus>;
};

/** 全候補を「未定」で埋めた初期値。未回答の候補が出ないようにする。 */
export function emptyDraft(candidates: readonly Candidate[]): AnswerDraft {
  return {
    name: '',
    message: '',
    choices: Object.fromEntries(candidates.map((c) => [c.id, 'MAYBE' as AnswerStatus])),
  };
}

export function draftFromAnswer(
  candidates: readonly Candidate[],
  answer: { name: string; message: string | null; choices: Choice[] },
): AnswerDraft {
  const byId = new Map(answer.choices.map((c) => [c.candidateId, c.status]));
  return {
    name: answer.name,
    message: answer.message ?? '',
    choices: Object.fromEntries(candidates.map((c) => [c.id, byId.get(c.id) ?? 'MAYBE'])),
  };
}

export function draftToChoices(candidates: readonly Candidate[], draft: AnswerDraft): Choice[] {
  return candidates.map((c) => ({ candidateId: c.id, status: draft.choices[c.id] ?? 'MAYBE' }));
}

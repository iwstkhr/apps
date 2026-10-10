import { cx } from '../lib/cx';
import { formatDate, formatTime } from '../lib/format';
import { t, useLanguage } from '../lib/i18n';
import { bestCandidateIds, summarize } from '../lib/tally';
import { type AnswerStatus, type AnswerView, type Candidate, STATUS_MARK } from '../lib/types';

const MARK_CLASS: Record<AnswerStatus, string> = {
  YES: 'text-emerald-600 dark:text-emerald-400',
  MAYBE: 'text-amber-600 dark:text-amber-400',
  NO: 'text-slate-400 dark:text-slate-600',
};

export function AnswerGrid({
  candidates,
  answers,
  highlightAnswerId,
}: {
  candidates: readonly Candidate[];
  answers: readonly AnswerView[];
  highlightAnswerId?: string | null;
}) {
  useLanguage();
  const tallies = summarize(candidates, answers);
  const best = bestCandidateIds(tallies, answers.length);
  const byId = new Map(tallies.map((t) => [t.candidateId, t]));

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 border-b border-slate-200 bg-white px-3 py-2 text-left font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
            >
              {t('回答者')}
            </th>
            {candidates.map((candidate) => {
              const tally = byId.get(candidate.id);
              const isBest = best.has(candidate.id);
              return (
                <th
                  key={candidate.id}
                  scope="col"
                  className={cx(
                    'border-b border-slate-200 px-3 py-2 text-center font-medium whitespace-nowrap dark:border-slate-800',
                    isBest
                      ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'text-slate-700 dark:text-slate-200',
                  )}
                >
                  <div>{formatDate(candidate.startAt)}</div>
                  <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {formatTime(candidate.startAt)}
                  </div>
                  <div className="mt-1 text-xs font-normal tabular-nums">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {STATUS_MARK.YES}
                      {tally?.yes ?? 0}
                    </span>
                    <span className="mx-1 text-amber-600 dark:text-amber-400">
                      {STATUS_MARK.MAYBE}
                      {tally?.maybe ?? 0}
                    </span>
                    <span className="text-slate-400">
                      {STATUS_MARK.NO}
                      {tally?.no ?? 0}
                    </span>
                  </div>
                  {isBest && (
                    <div className="mt-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      {t('最多')}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {answers.length === 0 && (
            <tr>
              <td
                colSpan={candidates.length + 1}
                className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
              >
                {t('まだ回答がありません。')}
              </td>
            </tr>
          )}

          {answers.map((answer) => {
            const isMine = answer.id === highlightAnswerId;
            return (
              <tr key={answer.id} className={cx(isMine && 'bg-indigo-50/60 dark:bg-indigo-950/30')}>
                <th
                  scope="row"
                  className={cx(
                    'sticky left-0 z-10 border-b border-slate-100 px-3 py-2 text-left font-normal whitespace-nowrap dark:border-slate-800',
                    isMine ? 'bg-indigo-50 dark:bg-indigo-950/60' : 'bg-white dark:bg-slate-900',
                  )}
                >
                  {answer.name}
                  {isMine && (
                    <span className="ml-1.5 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white">
                      {t('自分')}
                    </span>
                  )}
                </th>
                {candidates.map((candidate) => {
                  const status = answer.choices.find((c) => c.candidateId === candidate.id)?.status;
                  return (
                    <td
                      key={candidate.id}
                      className="border-b border-slate-100 px-3 py-2 text-center text-base dark:border-slate-800"
                    >
                      {status ? (
                        <span className={MARK_CLASS[status]} title={status}>
                          {STATUS_MARK[status]}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

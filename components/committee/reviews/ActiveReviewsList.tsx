'use client';

import ReviewPanel from '@/components/committee/reviews/ReviewPanel';
import type { CommitteeReviewsView } from '@/demo/committee-demo';
import { useState } from 'react';

type ActiveReviewsTabId = 'pending' | 'approved' | 'rejected';

type ActiveReviewsListProps = {
  data: CommitteeReviewsView;
  /**
   * Called once a panel's local vote FSM has reached the terminal `voted`
   * state. The page can use this to persist the vote or move the submission
   * between tabs.
   */
  onVoteFinalised?: (
    submissionId: string,
    intent: 'approve' | 'reject',
    txHash?: string,
  ) => void;
};

type TabDescriptor = {
  id: ActiveReviewsTabId;
  label: string;
  countKey: keyof CommitteeReviewsView['tabCounts'];
  toneClass: string;
};

const TABS: TabDescriptor[] = [
  { id: 'pending', label: 'Pending Reviews', countKey: 'pending', toneClass: 'text-blue-600' },
  { id: 'approved', label: 'Approved', countKey: 'approved', toneClass: 'text-emerald-700' },
  { id: 'rejected', label: 'Rejected', countKey: 'rejected', toneClass: 'text-red-600' },
];

/**
 * Main working surface for committee members. The tab axis describes the
 * *submission's* on-chain state, not the viewer's relationship to it:
 *
 *  - `pending`  — submission is still gathering votes. Buttons live here.
 *  - `approved` — submission reached approval quorum. Read-only banner.
 *  - `rejected` — submission reached rejection threshold. Read-only banner.
 *
 * Within `pending`, viewer-specific cues (e.g. "Your vote is required") are
 * surfaced by `ReviewPanel` from `submission.currentMemberVoted`.
 */
export default function ActiveReviewsList({
  data,
  onVoteFinalised,
}: ActiveReviewsListProps) {
  const [activeTab, setActiveTab] = useState<ActiveReviewsTabId>('pending');

  const visible = data[activeTab];
  // Voting controls only make sense on the pending tab. Even there, individual
  // panels disable their own buttons once the viewer has voted.
  const isActionable = activeTab === 'pending';

  return (
    <section>
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Active Reviews</h1>
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {data.totalPending} Pending
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Review milestone evidence, check AI verdicts, and cast your approval votes.
        </p>
      </header>

      <div className="mt-6 border-b border-slate-200">
        <nav className="-mb-px flex flex-wrap gap-1 text-sm" aria-label="Review state">
          {TABS.map(({ id, label, countKey, toneClass }) => {
            const isActive = id === activeTab;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 transition ${
                  isActive
                    ? `font-semibold ${toneClass}`
                    : 'font-medium text-slate-500 hover:text-slate-800'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{label}</span>
                <span
                  className={`tabular-nums ${isActive ? toneClass : 'text-slate-400'}`}
                >
                  ({data.tabCounts[countKey]})
                </span>
                {isActive ? (
                  <span
                    className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${
                      id === 'approved'
                        ? 'bg-emerald-500'
                        : id === 'rejected'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                    }`}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-5 space-y-4">
        {visible.length === 0 ? (
          <EmptyTabState tab={activeTab} />
        ) : (
          visible.map((submission) => (
            <ReviewPanel
              key={submission.id}
              submission={submission}
              actionable={isActionable}
              onVoteFinalised={onVoteFinalised}
            />
          ))
        )}
      </div>
    </section>
  );
}

function EmptyTabState({ tab }: { tab: ActiveReviewsTabId }) {
  const copy = {
    pending: {
      title: 'No reviews waiting',
      detail:
        'New milestone submissions will show up here as soon as the builder submits proof of work.',
    },
    approved: {
      title: 'Nothing approved yet',
      detail:
        'Once a submission crosses the approval quorum, it will be archived here with its final tally.',
    },
    rejected: {
      title: 'Nothing rejected yet',
      detail:
        'Submissions the committee turns down — and the reason on chain — will appear here.',
    },
  }[tab];

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-700">{copy.title}</p>
      <p className="mt-1 text-xs text-slate-500">{copy.detail}</p>
    </div>
  );
}

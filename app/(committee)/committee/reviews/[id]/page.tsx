'use client';

import CommitteeAccessDeniedToast from '@/components/committee/CommitteeAccessDeniedToast';
import CommitteeAppShell from '@/components/committee/CommitteeAppShell';
import CommitteeReviewSkeleton from '@/components/committee/CommitteeReviewSkeleton';
import SubHeaderBackButton from '@/components/navigation/SubHeaderBackButton';
import ReviewPanel from '@/components/committee/reviews/ReviewPanel';
import { getCommitteeDemoSubmissionById } from '@/demo/committee-demo';
import { useAuthGuard } from '@/lib/authGuard';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Single-milestone review view.
 *
 * Reached by tapping a row in the dashboard's "Pending Review" table or
 * any deep-link that targets a specific submission. Renders one
 * `ReviewPanel` — the same component used on `/committee/reviews` — so the
 * voting / quorum behaviour is identical, just scoped to one milestone.
 *
 * Auth gating mirrors the other committee routes.
 */

const MIN_VALIDATION_MS = 1500;
export default function CommitteeSingleReviewPage() {
  const params = useParams<{ id: string }>();
  const submissionId = decodeURIComponent(params?.id ?? '');

  const guard = useAuthGuard('committee');

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  const authorized = minTimeElapsed && guard.state === 'allowed';

  const submission = useMemo(
    () => getCommitteeDemoSubmissionById(submissionId),
    [submissionId],
  );

  // The pending tab is the only one where the action buttons should be live;
  // approved/rejected submissions land here read-only.
  const actionable = !submission?.finalOutcome;

  const handleVoteFinalised = useCallback(
    (id: string, intent: 'approve' | 'reject', txHash?: string) => {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[committee] single-review vote finalised', { id, intent, txHash });
      }
    },
    [],
  );

  return (
    <CommitteeAppShell
      breadcrumb={[
        { label: 'Committee Actions', href: '/committee' },
        { label: 'Review Queue', href: '/committee/reviews' },
        { label: submission?.grantTitle ?? 'Milestone Review' },
      ]}
    >
      {authorized ? (
        <main className="w-full px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
            <BackToDashboardLink />

            {submission ? (
              <>
                <FocusedHeader
                  grantTitle={submission.grantTitle}
                  grantId={submission.grantId}
                  milestoneIndex={submission.milestoneIndex}
                  milestoneTitle={submission.milestoneTitle}
                  finalOutcome={submission.finalOutcome}
                />
                <ReviewPanel
                  submission={submission}
                  actionable={actionable}
                  onVoteFinalised={handleVoteFinalised}
                />
              </>
            ) : (
              <NotFoundCallout submissionId={submissionId} />
            )}
          </div>
        </main>
      ) : (
        <>
          <CommitteeReviewSkeleton />
          {guard.state === 'blocked' ? <CommitteeAccessDeniedToast /> : null}
        </>
      )}
    </CommitteeAppShell>
  );
}

function BackToDashboardLink() {
  return (
    <SubHeaderBackButton
      label="Back to Committee Actions"
      fallbackHref="/committee"
    />
  );
}

function FocusedHeader({
  grantTitle,
  grantId,
  milestoneIndex,
  milestoneTitle,
  finalOutcome,
}: {
  grantTitle: string;
  grantId: string;
  milestoneIndex: number;
  milestoneTitle: string;
  finalOutcome?: 'approved' | 'rejected';
}) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Milestone Review &middot; {grantId}
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            {grantTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Milestone {milestoneIndex}: {milestoneTitle}
          </p>
        </div>
        {finalOutcome ? <OutcomePill outcome={finalOutcome} /> : null}
      </div>
    </header>
  );
}

function OutcomePill({ outcome }: { outcome: 'approved' | 'rejected' }) {
  if (outcome === 'approved') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200">
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-700 ring-1 ring-red-200">
      Rejected
    </span>
  );
}

function NotFoundCallout({ submissionId }: { submissionId: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-700">
        We couldn&rsquo;t find that submission
      </p>
      <p className="mt-1 break-all text-xs text-slate-500">
        ID <span className="font-mono">{submissionId || '(empty)'}</span> isn&rsquo;t in
        the current review queue.
      </p>
      <Link
        href="/committee/reviews"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-slate-50"
      >
        Browse all reviews
      </Link>
    </div>
  );
}

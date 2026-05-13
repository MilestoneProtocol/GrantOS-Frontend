'use client';

import CommitteeAccessDeniedToast from '@/components/committee/CommitteeAccessDeniedToast';
import CommitteeAppShell from '@/components/committee/CommitteeAppShell';
import CommitteeReviewSkeleton from '@/components/committee/CommitteeReviewSkeleton';
import ActiveReviewsList from '@/components/committee/reviews/ActiveReviewsList';
import { getCommitteeDemoActiveReviews } from '@/demo/committee-demo';
import { useAuthGuard } from '@/lib/authGuard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Active Reviews (US-03 main working surface).
 *
 * Same authorization shape as the dashboard route — the shell renders, the
 * skeleton sits for a minimum window, and unauthorized requests redirect to
 * `/` after the inline access-denied toast.
 *
 * Demo data is used while we wait on the contract reads for
 * `submitted`-state milestones across the connected wallet's committee grants.
 */
const MIN_VALIDATION_MS = 1500;
const ACCESS_DENIED_LINGER_MS = 1600;

export default function CommitteeReviewsPage() {
  const guard = useAuthGuard('committee');

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  const authorized = minTimeElapsed && guard.state === 'allowed';

  const data = useMemo(() => getCommitteeDemoActiveReviews(), []);

  const handleVoteFinalised = useCallback(
    (submissionId: string, intent: 'approve' | 'reject', txHash?: string) => {
      // Wire to a contract write + optimistic tab move when the real flow lands.
      // For now we just log so the demo flow is observable in the console.
      if (process.env.NODE_ENV !== 'production') {
        console.info('[committee] vote finalised', { submissionId, intent, txHash });
      }
    },
    [],
  );

  return (
    <CommitteeAppShell breadcrumb="Active Reviews" reviewsBadge={data.tabCounts.pending}>
      {authorized ? (
        <main className="w-full px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <ActiveReviewsList data={data} onVoteFinalised={handleVoteFinalised} />
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

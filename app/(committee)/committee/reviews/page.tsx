'use client';

import CommitteeAccessDeniedToast from '@/components/committee/CommitteeAccessDeniedToast';
import CommitteeAppShell from '@/components/committee/CommitteeAppShell';
import CommitteeReviewSkeleton from '@/components/committee/CommitteeReviewSkeleton';
import ActiveReviewsList from '@/components/committee/reviews/ActiveReviewsList';
import { useAuthGuard } from '@/lib/authGuard';
import { useCommitteeReviews } from '@/lib/hooks/useCommitteeReviews';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Active Reviews (US-03 main working surface).
 *
 * Same authorization shape as the dashboard route — the shell renders, the
 * skeleton sits for a minimum window, and unauthorized requests redirect to
 * `/` after the inline access-denied toast.
 *
 */
const MIN_VALIDATION_MS = 1500;
const ACCESS_DENIED_LINGER_MS = 1600;

export default function CommitteeReviewsPage() {
  const guard = useAuthGuard('committee');
  const { data, loading: dataLoading } = useCommitteeReviews();

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  const authorized = minTimeElapsed && guard.state === 'allowed' && !dataLoading;

  const handleVoteFinalised = useCallback(
    (submissionId: string, intent: 'approve' | 'reject', txHash?: string) => {
      console.info('[committee] vote finalised', { submissionId, intent, txHash });
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

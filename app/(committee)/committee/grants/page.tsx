'use client';

import CommitteeAccessDeniedToast from '@/components/committee/CommitteeAccessDeniedToast';
import CommitteeAppShell from '@/components/committee/CommitteeAppShell';
import CommitteeReviewSkeleton from '@/components/committee/CommitteeReviewSkeleton';
import ActiveGrantsSection from '@/components/committee/dashboard/ActiveGrantsSection';
import DashboardOverview from '@/components/committee/dashboard/DashboardOverview';
import { useAuthGuard } from '@/lib/authGuard';
import { useCommitteeGrants } from '@/lib/hooks/useCommitteeGrants';
import { useCommitteeReviews } from '@/lib/hooks/useCommitteeReviews';
import { useEffect, useState } from 'react';

const MIN_VALIDATION_MS = 1500;

/**
 * All Grants — committee grants the connected wallet serves on.
 * Uses `DashboardOverview` + `ActiveGrantsSection` from the committee dashboard design pass.
 */
export default function CommitteeAllGrantsPage() {
  const guard = useAuthGuard('committee');
  const { data: reviews } = useCommitteeReviews();
  const {
    grants,
    totalActiveGrants,
    usdcUnderControl,
    isLoading: grantsLoading,
  } = useCommitteeGrants();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  const authorized = minTimeElapsed && guard.state === 'allowed';
  const pendingReviews = reviews?.totalPending ?? 0;

  return (
    <CommitteeAppShell
      breadcrumb="All Grants"
      reviewsBadge={reviews.tabCounts.pending}
    >
      {authorized ? (
        <main className="w-full px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl space-y-2">
            <DashboardOverview
              totalActiveGrants={totalActiveGrants}
              usdcUnderControl={usdcUnderControl}
              pendingReviews={pendingReviews}
              showAllCaughtUpBanner={pendingReviews === 0}
            />
            <ActiveGrantsSection grants={grants} isLoading={grantsLoading} />
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

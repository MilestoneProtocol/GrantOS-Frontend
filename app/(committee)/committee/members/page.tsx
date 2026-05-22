'use client';

import CommitteeAccessDeniedToast from '@/components/committee/CommitteeAccessDeniedToast';
import CommitteeAppShell from '@/components/committee/CommitteeAppShell';
import CommitteeReviewSkeleton from '@/components/committee/CommitteeReviewSkeleton';
import CommitteeRosterList from '@/components/committee/members/CommitteeRosterList';
import type { CommitteeGrantRoster } from '@/demo/committee-demo';
import { useAuthGuard } from '@/lib/authGuard';
import { useCommitteeReviews } from '@/lib/hooks/useCommitteeReviews';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

const MIN_VALIDATION_MS = 1500;

/**
 * Committee members — rosters and quorum per grant the wallet serves on.
 */
export default function CommitteeMembersPage() {
  const guard = useAuthGuard('committee');
  const { address } = useAccount();
  const { data: reviews } = useCommitteeReviews();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  const authorized = minTimeElapsed && guard.state === 'allowed';
  const rosters = useMemo((): CommitteeGrantRoster[] => [], []);

  return (
    <CommitteeAppShell breadcrumb="Committee" reviewsBadge={reviews.tabCounts.pending}>
      {authorized ? (
        <main className="w-full px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-3xl">
            <header className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Committee</h1>
              <p className="text-sm text-slate-500">
                Members and quorum settings for each grant you help oversee.
              </p>
            </header>
            <CommitteeRosterList rosters={rosters} viewerAddress={address} />
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

'use client';

import CommitteeAccessDeniedToast from '@/components/committee/CommitteeAccessDeniedToast';
import CommitteeAppShell from '@/components/committee/CommitteeAppShell';
import CommitteeReviewSkeleton from '@/components/committee/CommitteeReviewSkeleton';
import GrantHeaderCard from '@/components/committee/grant-detail/GrantHeaderCard';
import MilestoneReviewRow from '@/components/committee/grant-detail/MilestoneReviewRow';
import { getCommitteeDemoGrantDetail } from '@/demo/committee-demo';
import { useAuthGuard } from '@/lib/authGuard';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

/**
 * Grant detail view (committee role).
 *
 * Lands here from the Active Reviews list or by drilling into a single grant.
 * Renders the milestone roster top-down with one row per milestone, and each
 * row carries its own substate (awaiting vote, awaiting quorum, approved with
 * Superfluid stream or lump-sum payout, or rejected with an EAS reason).
 *
 * Authorization mirrors `/committee` and `/committee/reviews`: the shell
 * renders, a skeleton sits for a minimum window, and unauthorized wallets see
 * an inline access-denied toast before being redirected to `/`.
 */
const MIN_VALIDATION_MS = 1500;
const ACCESS_DENIED_LINGER_MS = 1600;

export default function CommitteeGrantDetailPage() {
  const guard = useAuthGuard('committee');
  const params = useParams();
  const grantId = typeof params.id === 'string' ? params.id : '';

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  const authorized = minTimeElapsed && guard.state === 'allowed';

  // Demo: full milestone panel for `cross-chain-yield`; other list ids still land here until
  // per-grant contract reads ship.
  const grant = useMemo(() => {
    const detail = getCommitteeDemoGrantDetail();
    if (!grantId || grantId === detail.id) return detail;
    return { ...detail, id: grantId };
  }, [grantId]);

  return (
    <CommitteeAppShell
      breadcrumb={[
        { label: 'All Grants', href: '/committee/grants' },
        { label: grant.title },
      ]}
    >
      {authorized ? (
        <main className="w-full px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <GrantHeaderCard grant={grant} />

            <section className="flex flex-col gap-3">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Milestone Review Panel
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  {grant.completedMilestones} of {grant.totalMilestones} Milestones Completed
                </p>
              </header>

              <div className="flex flex-col gap-3">
                {grant.milestones.map((milestone) => (
                  <MilestoneReviewRow
                    key={`${grant.id}-${milestone.index}`}
                    milestone={milestone}
                  />
                ))}
              </div>
            </section>
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

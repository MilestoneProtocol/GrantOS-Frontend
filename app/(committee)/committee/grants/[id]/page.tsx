'use client';

import CommitteeAccessDeniedToast from '@/components/committee/CommitteeAccessDeniedToast';
import CommitteeAppShell from '@/components/committee/CommitteeAppShell';
import CommitteeReviewSkeleton from '@/components/committee/CommitteeReviewSkeleton';
import GrantHeaderCard from '@/components/committee/grant-detail/GrantHeaderCard';
import MilestoneReviewRow from '@/components/committee/grant-detail/MilestoneReviewRow';
import type { GrantDetail, GrantDetailMilestone, GrantMilestoneOutcome } from '@/demo/committee-demo';
import { useAuthGuard } from '@/lib/authGuard';
import { useGrantDetailFull } from '@/hooks/useGrantDetailFull';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const MIN_VALIDATION_MS = 1500;

function mapMilestoneOutcome(
  m: { submission?: { status: string } | null; warnings?: unknown[] },
  index: number,
): GrantMilestoneOutcome {
  const slashed = (m.warnings ?? []).some((w: unknown) => (w as { slashed?: boolean }).slashed);
  if (slashed) {
    return { kind: 'rejected', reason: 'Milestone slashed', decidedByAddress: '0x0000000000000000000000000000000000000000', easAttestationOnchain: false };
  }
  if (m.submission?.status === 'approved') {
    return { kind: 'approved_lump_sum', approvers: 1, committeeRequired: 1 };
  }
  if (m.submission?.status === 'rejected') {
    return { kind: 'rejected', reason: 'Rejected by committee', decidedByAddress: '0x0000000000000000000000000000000000000000', easAttestationOnchain: false };
  }
  if (m.submission) {
    return { kind: 'awaiting_quorum', currentVotes: 1, quorumRequired: 2 };
  }
  return {
    kind: 'awaiting_vote',
    needsCurrentVote: true,
    totalCommittee: 1,
    quorumRequired: 1,
    currentApproved: 0,
    currentRejected: 0,
  };
}

export default function CommitteeGrantDetailPage() {
  const guard = useAuthGuard('committee');
  const params = useParams();
  const grantIdRaw = typeof params.id === 'string' ? params.id : '';
  const onChainId = /^\d+$/.test(grantIdRaw) ? Number(grantIdRaw) : null;

  const { data: fullDetail, isLoading } = useGrantDetailFull(onChainId);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  const authorized = minTimeElapsed && guard.state === 'allowed';

  const grant = useMemo((): GrantDetail | null => {
    if (!fullDetail) return null;
    const milestones: GrantDetailMilestone[] = fullDetail.milestones.map((m, index) => ({
      index: index + 1,
      title: m.title || `Milestone ${index + 1}`,
      description: m.description || '',
      payoutUsdc: Number(BigInt(m.amount) / BigInt(1_000_000)),
      outcome: mapMilestoneOutcome(m, index),
    }));
    const approved = milestones.filter((m) => m.outcome.kind === 'approved_lump_sum' || m.outcome.kind === 'approved_streaming').length;
    return {
      id: grantIdRaw,
      tag: 'GRANT',
      tagTone: 'other',
      lifecycleLabel: 'Active Grant',
      title: milestones[0]?.title ?? `Grant ${grantIdRaw}`,
      description: milestones[0]?.description ?? '',
      totalAllocationUsdc: Number(fullDetail.grant.totalUsdc) || milestones.reduce((s, m) => s + m.payoutUsdc, 0),
      isStreaming: fullDetail.grant.isStreaming,
      completedMilestones: approved,
      totalMilestones: milestones.length,
      milestones: milestones.reverse(),
    };
  }, [fullDetail, grantIdRaw]);

  return (
    <CommitteeAppShell
      breadcrumb={[
        { label: 'All Grants', href: '/committee/grants' },
        { label: grant?.title ?? (grantIdRaw || 'Grant') },
      ]}
    >
      {authorized ? (
        <main className="w-full px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading grant from backend…</p>
            ) : !grant ? (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <h1 className="text-xl font-semibold text-slate-900">Grant not found</h1>
                <p className="mt-2 text-sm text-slate-500">
                  No grant data for this id. Connect the committee grants API to load details.
                </p>
                <Link
                  href="/committee/grants"
                  className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black"
                >
                  Back to all grants
                </Link>
              </section>
            ) : (
              <>
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
              </>
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

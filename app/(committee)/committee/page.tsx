'use client';

import CommitteeAccessDeniedToast from '@/components/committee/CommitteeAccessDeniedToast';
import CommitteeAppShell, {
  type CommitteeBreadcrumbSegment,
} from '@/components/committee/CommitteeAppShell';
import CommitteeReviewSkeleton from '@/components/committee/CommitteeReviewSkeleton';
import CommitteeActionsHeader from '@/components/committee/actions/CommitteeActionsHeader';
import MilestoneWarningView from '@/components/committee/actions/MilestoneWarningView';
import OverdueMilestoneCard from '@/components/committee/actions/OverdueMilestoneCard';
import PendingReviewTable from '@/components/committee/actions/PendingReviewTable';
import {
  getCommitteeDemoActions,
  type MilestoneActivityEvent,
  type OverdueMilestone,
  type OverdueMilestoneState,
} from '@/demo/committee-demo';
import {
  markBuilderWarningSlashed,
  saveBuilderWarning,
} from '@/lib/builder-warnings';
import { buildArbiscanTxUrl } from '@/lib/warning-flow';
import { useAuthGuard } from '@/lib/authGuard';
import { useCommitteeReviews } from '@/lib/hooks/useCommitteeReviews';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

/**
 * Committee Actions entrypoint (US-03 / US-04).
 *
 * The dashboard is the committee member's triage surface — it surfaces
 * milestones that actually need a decision right now. Two sections:
 *  - **Action Required: Overdue** — milestones past deadline and still
 *    Pending. Each card carries the due-process gating (issue warning →
 *    24h cool-off → slash) inline, so the next required step is obvious.
 *  - **Pending Review** — a compact table of milestones submitted on time
 *    and waiting for committee votes; clicking through opens the dedicated
 *    review surface at `/committee/reviews`.
 *
 * Authorization rules (PRD):
 * - Wallet required.
 * - Membership required — wallet must appear in some grant's `committeeAddresses`.
 *
 * Unauthorized requests render the in-page "Access Denied" toast over the
 * skeleton for a beat (so the user actually sees why they're being bounced),
 * then redirect to `/` (the future role-routing landing page).
 */

/** Minimum time the skeleton stays visible after entering the route. */
const MIN_VALIDATION_MS = 1500;
/** How long the inline access-denied toast shows before we redirect. */
const ACCESS_DENIED_LINGER_MS = 1600;

/** 24h in milliseconds — duration of the warning cool-off enforced onchain. */
const WARNING_COOLOFF_MS = 24 * 60 * 60 * 1000;
/**
 * Demo override for the warning cool-off. Real `GrantEscrow.recordWarning`
 * uses the 24h figure above, but for the click-through demo we shrink it so
 * the committee member can see the `EnforcementActionPanel → SlashReadyPanel`
 * transition without waiting a day.
 */
const WARNING_COOLOFF_DEMO_MS = 30 * 1000;
/** Wallet placeholder used when no connected address is available (demo only). */
const PLACEHOLDER_COMMITTEE_ADDRESS: `0x${string}` =
  '0x0000000000000000000000000000000000000000';

/** Default Arbitrum EAS scan URL builder for a given attestation UID. */
function buildEasScanUrl(attestationUid: string): string {
  return `https://arbitrum.easscan.org/attestation/view/${attestationUid}`;
}

/** True when the UI demo flag is on; chosen at module load. */
const IS_UI_DEMO = process.env.NEXT_PUBLIC_GRANTOS_UI_DEMO === 'true';

export default function CommitteeDashboardPage() {
  const guard = useAuthGuard('committee');
  const { address } = useAccount();

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  const authorized = minTimeElapsed && guard.state === 'allowed';

  const { data: realData, loading: reviewsLoading } = useCommitteeReviews();

  const actions = useMemo(() => {
    const mappedPending = realData.pending.map((submission) => ({
      id: submission.id,
      grantId: submission.grantId,
      grantTitle: submission.grantTitle,
      milestoneTitle: submission.milestoneTitle,
      submittedLabel: 'recently',
      deadlineIso: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
    return {
      pendingReview: mappedPending,
      pendingReviewCount: realData.totalPending,
      overdue: [] as OverdueMilestone[], // Overdue logic to be implemented via backend indexing
    };
  }, [realData]);

  /**
   * When set, the page pivots out of the dashboard and into the Warning
   * Issuance screen state for this milestone. We deliberately don't push a
   * new route — this is a state transition on `/committee`, matching the
   * PRD: "no navigation, no modal — the panel expands inline".
   */
  const [activeWarningMilestoneId, setActiveWarningMilestoneId] = useState<string | null>(
    null,
  );

  /**
   * Local overrides keyed by milestone id. We layer these on top of the
   * demo data so the post-confirm state transition (`deadline_missed` →
   * `warning_issued`) is reactive without round-tripping through the
   * fixture file. In production this is replaced by an indexer subscription
   * (or a `useReadContract` re-fetch triggered by the `WarningRecorded`
   * event) — the override map disappears entirely.
   */
  const [milestoneOverrides, setMilestoneOverrides] = useState<
    Record<string, OverdueMilestone>
  >({});

  /**
   * Demo data layered with the local overrides above. We keep slashed
   * milestones in the merged list (so the focused warning view can still
   * render the `SlashedBadge`) and filter them out at the dashboard render
   * step — see `dashboardOverdueMilestones`.
   */
  const overdueMilestones = useMemo(
    () => actions.overdue.map((m) => milestoneOverrides[m.id] ?? m),
    [actions.overdue, milestoneOverrides],
  );

  /**
   * Subset shown on the dashboard cards. Slashed milestones are terminal —
   * they exit the Pending state on chain and would no longer be returned by
   * `GrantEscrow.getCommitteeGrants(...)`, so we mirror that here.
   */
  const dashboardOverdueMilestones = useMemo(
    () => overdueMilestones.filter((m) => m.state.kind !== 'slashed'),
    [overdueMilestones],
  );

  const activeWarningMilestone = useMemo(() => {
    if (!activeWarningMilestoneId) return null;
    return overdueMilestones.find((m) => m.id === activeWarningMilestoneId) ?? null;
  }, [overdueMilestones, activeWarningMilestoneId]);

  const handleIssueWarning = useCallback((milestoneId: string) => {
    setActiveWarningMilestoneId(milestoneId);
  }, []);

  const handleCancelWarning = useCallback(() => {
    setActiveWarningMilestoneId(null);
  }, []);

  const handleWarningConfirmed = useCallback(
    (payload: {
      milestoneId: string;
      txHash: string;
      attestationUid: string;
      message: string;
      warningTimestampIso: string;
    }) => {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[committee] warning attestation confirmed', payload);
      }

      const committeeMember = (address ??
        PLACEHOLDER_COMMITTEE_ADDRESS) as `0x${string}`;
      const issuedAt = new Date(payload.warningTimestampIso);
      // Production uses the 24h cool-off enforced by `GrantEscrow.slash`'s
      // require check; in demo mode we collapse it to ~30 seconds so the
      // full SlashReady → confirmation → SLASHED flow is exercisable in a
      // single sitting.
      const cooloffMs = IS_UI_DEMO ? WARNING_COOLOFF_DEMO_MS : WARNING_COOLOFF_MS;
      const slashUnlocksAt = new Date(issuedAt.getTime() + cooloffMs);

      const nextState: OverdueMilestoneState = {
        kind: 'warning_issued',
        warningIssuedAtIso: payload.warningTimestampIso,
        slashUnlocksAtIso: slashUnlocksAt.toISOString(),
        attestationUrl: buildEasScanUrl(payload.attestationUid),
        committeeMemberAddress: committeeMember,
        message: payload.message,
      };

      const newActivityEvent: MilestoneActivityEvent = {
        id: `evt-warning-${payload.attestationUid.slice(2, 10)}`,
        title: 'Warning Attestation Recorded',
        description:
          'Committee member issued a 24h on-chain warning via EAS. Countdown to slash availability is active.',
        relativeLabel: 'Just now',
      };

      const base =
        milestoneOverrides[payload.milestoneId] ??
        actions.overdue.find((m) => m.id === payload.milestoneId);

      setMilestoneOverrides((prev) => {
        // Resolve the latest known milestone (override → demo source) so we
        // don't clobber concurrent local mutations.
        const resolved =
          prev[payload.milestoneId] ??
          actions.overdue.find((m) => m.id === payload.milestoneId);
        if (!resolved) return prev;

        const next: OverdueMilestone = {
          ...resolved,
          state: nextState,
          activity: [newActivityEvent, ...resolved.activity],
        };
        return { ...prev, [payload.milestoneId]: next };
      });

      // Surface the warning to the builder's dashboard. Reads in
      // `useBuilderWarnings` listen for the change event the store emits
      // here, so the banner appears the moment the builder navigates over
      // (or live, if they happen to have both routes open).
      if (base) {
        // Anchor a plausible Pending → Overdue timeline for the detail
        // page. The demo's `daysOverdue` tracks days since the deadline
        // passed; we derive the approval date by stepping back another
        // ~90d so the timeline reads sensibly.
        const overdueAtMs =
          issuedAt.getTime() - base.daysOverdue * 24 * 60 * 60 * 1000;
        const approvedAtMs =
          overdueAtMs - 90 * 24 * 60 * 60 * 1000;

        saveBuilderWarning({
          id: base.id,
          milestoneId: base.id,
          builderAddress: base.builderAddress,
          grantId: base.grantId,
          grantTitle: base.grantTitle,
          milestoneTitle: base.milestoneTitle,
          milestoneIndex: base.milestoneIndex,
          amountAtRiskUsdc: base.amount.value,
          committeeMemberAddress: committeeMember,
          committeeMemberLabel: 'Committee Lead',
          message: payload.message,
          warningIssuedAtIso: payload.warningTimestampIso,
          slashUnlocksAtIso: slashUnlocksAt.toISOString(),
          attestationUrl: buildEasScanUrl(payload.attestationUid),
          milestoneApprovedAtIso: new Date(approvedAtMs).toISOString(),
          milestoneOverdueAtIso: new Date(overdueAtMs).toISOString(),
        });
      }
    },
    [actions.overdue, milestoneOverrides],
  );

  const handleSlash = useCallback(
    (milestoneId: string) => {
      // The dashboard `Slash` button is locked while the milestone is
      // `deadline_missed` or `warning_issued`; once it's `slash_available`,
      // clicking it should open the focused warning view so the committee
      // member sees the confirmation modal flow rather than slashing in
      // place from the dashboard card.
      setActiveWarningMilestoneId(milestoneId);
    },
    [],
  );

  const handleSlashConfirmed = useCallback(
    (payload: {
      milestoneId: string;
      txHash: string;
      slashedAtIso: string;
      amountReturnedUsdc: number;
    }) => {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[committee] slash confirmed', payload);
      }

      setMilestoneOverrides((prev) => {
        const base =
          prev[payload.milestoneId] ??
          actions.overdue.find((m) => m.id === payload.milestoneId);
        if (!base) return prev;

        // Carry the warning attestation URL through to the slashed state so
        // the audit-trail link doesn't go dark; `slash` requires a prior
        // `MilestoneWarning` attestation to have existed, so it always
        // exists at this point.
        const attestationUrl =
          base.state.kind === 'warning_issued' || base.state.kind === 'slash_available'
            ? base.state.attestationUrl
            : 'https://arbitrum.easscan.org';

        const slashedActivityEvent: MilestoneActivityEvent = {
          id: `evt-slashed-${payload.txHash.slice(2, 10)}`,
          title: 'Milestone Slashed Onchain',
          description: `${formatUsdInline(payload.amountReturnedUsdc)} USDC returned to the treasury via GrantEscrow.slash. Milestone permanently closed.`,
          relativeLabel: 'Just now',
        };

        const next: OverdueMilestone = {
          ...base,
          state: {
            kind: 'slashed',
            slashedAtIso: payload.slashedAtIso,
            txHash: payload.txHash,
            amountReturnedUsdc: payload.amountReturnedUsdc,
            attestationUrl,
          },
          activity: [slashedActivityEvent, ...base.activity],
        };
        return { ...prev, [payload.milestoneId]: next };
      });

      // Surface the slash to the builder side: the banner stack retires
      // the warning (filters out `slash`), but the Warning Detail page
      // keeps the record alive so the builder can still review the full
      // timeline + slash tx.
      markBuilderWarningSlashed(payload.milestoneId, {
        slashedAtIso: payload.slashedAtIso,
        txHash: payload.txHash,
        slashTxUrl: buildArbiscanTxUrl(payload.txHash),
        amountReturnedUsdc: payload.amountReturnedUsdc,
      });
    },
    [actions.overdue],
  );

  const breadcrumb: string | CommitteeBreadcrumbSegment[] = activeWarningMilestone
    ? [
        { label: 'Committee', href: '/committee' },
        { label: 'Active Grants', href: '/committee' },
        { label: activeWarningMilestone.grantTitle },
      ]
    : 'Committee Actions';

  return (
    <CommitteeAppShell
      breadcrumb={breadcrumb}
      reviewsBadge={actions.pendingReviewCount}
    >
      {authorized ? (
        <main className="w-full px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            {activeWarningMilestone ? (
              <MilestoneWarningView
                milestone={activeWarningMilestone}
                onCancel={handleCancelWarning}
                onConfirmed={handleWarningConfirmed}
                onSlashConfirmed={handleSlashConfirmed}
              />
            ) : (
              <>
                <CommitteeActionsHeader
                  overdueCount={dashboardOverdueMilestones.length}
                  pendingReviewCount={actions.pendingReviewCount}
                />

                {dashboardOverdueMilestones.length > 0 ? (
                  <section className="flex flex-col gap-3">
                    <SectionHeader
                      label="Action Required: Overdue"
                      tone="overdue"
                    />
                    <div className="flex flex-col gap-3">
                      {dashboardOverdueMilestones.map((milestone) => (
                        <OverdueMilestoneCard
                          key={milestone.id}
                          milestone={milestone}
                          onIssueWarning={handleIssueWarning}
                          onSlash={handleSlash}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="flex flex-col gap-3">
                  <SectionHeader label="Pending Review" tone="neutral" />
                  {reviewsLoading ? (
                    <div className="flex justify-center p-8 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : actions.pendingReview.length === 0 ? (
                    <div className="flex justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                      No milestones pending review.
                    </div>
                  ) : (
                    <PendingReviewTable rows={actions.pendingReview} />
                  )}
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

function formatUsdInline(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function SectionHeader({
  label,
  tone,
}: {
  label: string;
  tone: 'overdue' | 'neutral';
}) {
  if (tone === 'overdue') {
    return (
      <h2 className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-600">
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
        {label}
      </h2>
    );
  }
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
      {label}
    </h2>
  );
}

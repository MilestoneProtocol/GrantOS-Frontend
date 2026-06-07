'use client';

import VotePendingOverlay from '@/components/committee/reviews/VotePendingOverlay';
import type { GrantDetailMilestone, GrantMilestoneOutcome } from '@/demo/committee-demo';
import { useDemoVoteFlow } from '@/lib/committee-vote-flow';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type MilestoneReviewRowProps = {
  milestone: GrantDetailMilestone;
};

const PEER_VOTE_INTERVAL_MS = 1500;
/**
 * Probability that a simulated peer votes the *same* way as the viewer.
 * 0.7 = ~70 % chance the demo trends toward the viewer's intent without
 * cheating quorum entirely.
 */
const PEER_MATCH_PROBABILITY = 0.7;

type PeerVote = 'approve' | 'reject';

const GithubMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

function formatUsd(amount: number) {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function badgeTone(outcome: GrantMilestoneOutcome): {
  className: string;
  amountClassName: string;
} {
  switch (outcome.kind) {
    case 'approved_streaming':
    case 'approved_lump_sum':
      return {
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        amountClassName: 'text-emerald-600',
      };
    case 'rejected':
      return {
        className: 'border-red-200 bg-red-50 text-red-600',
        amountClassName: 'text-red-500',
      };
    case 'awaiting_quorum':
      return {
        className: 'border-slate-200 bg-slate-50 text-slate-600',
        amountClassName: 'text-blue-600',
      };
    case 'awaiting_vote':
    default:
      return {
        className: 'border-slate-200 bg-slate-50 text-slate-600',
        amountClassName: 'text-blue-600',
      };
  }
}

/**
 * Compact milestone row for the grant detail / review queue view. One row
 * absorbs all of the milestone substates:
 *  - awaiting_vote        → "Your Vote is Required" + Reject / Approve buttons
 *  - awaiting_quorum      → "Awaiting Quorum (N/M votes)" + `You voted X` chip
 *  - approved_streaming   → green quorum banner + live Sablier flow rate
 *  - approved_lump_sum    → green quorum banner + "USDC transferred to builder"
 *  - rejected             → red banner + EAS attestation note + reason quote
 */
export default function MilestoneReviewRow({ milestone }: MilestoneReviewRowProps) {
  const flow = useDemoVoteFlow();
  // After the viewer votes, simulate peer VoteCast events arriving. Each peer
  // votes independently with a light bias toward the viewer's intent. The list
  // contains one entry per peer in the order they "arrived".
  const [simulatedPeerVotes, setSimulatedPeerVotes] = useState<PeerVote[]>([]);

  const config = useMemo(
    () =>
      milestone.outcome.kind === 'awaiting_vote'
        ? {
            totalCommittee: milestone.outcome.totalCommittee,
            quorumRequired: milestone.outcome.quorumRequired,
            baseApproved: milestone.outcome.currentApproved ?? 0,
            baseRejected: milestone.outcome.currentRejected ?? 0,
          }
        : null,
    [milestone.outcome],
  );

  // Drive the simulated peer feed.
  useEffect(() => {
    if (flow.state.kind !== 'voted') return;
    if (!config) return;

    const viewerIntent = flow.state.intent;
    const rejectionThreshold = config.totalCommittee - config.quorumRequired + 1;

    const intervalId = window.setInterval(() => {
      const willMatch = Math.random() < PEER_MATCH_PROBABILITY;
      const peerVote: PeerVote = willMatch
        ? viewerIntent
        : viewerIntent === 'approve'
          ? 'reject'
          : 'approve';

      setSimulatedPeerVotes((prev) => {
        const approvedNow =
          config.baseApproved +
          (viewerIntent === 'approve' ? 1 : 0) +
          prev.filter((p) => p === 'approve').length;
        const rejectedNow =
          config.baseRejected +
          (viewerIntent === 'reject' ? 1 : 0) +
          prev.filter((p) => p === 'reject').length;
        // Viewer + peers cannot exceed the total committee size.
        const slotsLeft = config.totalCommittee - 1 - prev.length - config.baseApproved -
          config.baseRejected;

        if (
          approvedNow >= config.quorumRequired ||
          rejectedNow >= rejectionThreshold ||
          slotsLeft <= 0
        ) {
          window.clearInterval(intervalId);
          return prev;
        }
        return [...prev, peerVote];
      });
    }, PEER_VOTE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [flow.state, config]);

  const overlayState =
    flow.state.kind === 'confirming' || flow.state.kind === 'submitted' ? flow.state : null;

  // Compute the *visual* outcome after merging the FSM + simulated peer state.
  // Rows that arrive with a non-`awaiting_vote` outcome render their final
  // state as-is.
  const effectiveOutcome: GrantMilestoneOutcome = deriveEffectiveOutcome(
    milestone,
    flow.state.kind === 'voted' ? flow.state.intent : null,
    simulatedPeerVotes,
  );

  const tone = badgeTone(effectiveOutcome);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-5 p-5 sm:gap-6 sm:p-6">
        <MilestoneIndexBadge index={milestone.index} className={tone.className} />

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold leading-tight text-slate-900">
                {milestone.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {milestone.description}
              </p>
            </div>
            <p className={`shrink-0 font-mono text-sm font-bold ${tone.amountClassName}`}>
              ${formatUsd(milestone.payoutUsdc)}
            </p>
          </header>

          <OutcomeBlock
            outcome={effectiveOutcome}
            milestoneIndex={milestone.index}
            onApprove={() => flow.start('approve')}
            onReject={() => flow.start('reject')}
            isVoting={flow.state.kind !== 'idle'}
          />
        </div>
      </div>

      {overlayState ? (
        <VotePendingOverlay
          state={overlayState.kind}
          intent={overlayState.intent}
          txHash={overlayState.kind === 'submitted' ? overlayState.txHash : undefined}
        />
      ) : null}
    </article>
  );
}

/**
 * Derives the visual outcome shown on a milestone row given the original
 * (server) outcome, the viewer's vote intent (`null` if they haven't voted),
 * and the number of simulated peer votes that have rolled in since.
 *
 * The "Quorum reached" transition kicks in as soon as the live tally crosses
 * the configured threshold (3 of 3 for the demo).
 */
function deriveEffectiveOutcome(
  milestone: GrantDetailMilestone,
  viewerIntent: 'approve' | 'reject' | null,
  simulatedPeerVotes: PeerVote[],
): GrantMilestoneOutcome {
  if (milestone.outcome.kind !== 'awaiting_vote' || !viewerIntent) {
    return milestone.outcome;
  }

  const { totalCommittee, quorumRequired } = milestone.outcome;
  const baseApproved = milestone.outcome.currentApproved ?? 0;
  const baseRejected = milestone.outcome.currentRejected ?? 0;
  const rejectionThreshold = totalCommittee - quorumRequired + 1;

  const peerApprovals = simulatedPeerVotes.filter((v) => v === 'approve').length;
  const peerRejections = simulatedPeerVotes.filter((v) => v === 'reject').length;
  const totalApproved =
    baseApproved + (viewerIntent === 'approve' ? 1 : 0) + peerApprovals;
  const totalRejected =
    baseRejected + (viewerIntent === 'reject' ? 1 : 0) + peerRejections;

  if (totalApproved >= quorumRequired) {
    return {
      kind: 'approved_streaming',
      approvers: totalApproved,
      committeeRequired: quorumRequired,
      flowRate: deriveFlowRate(milestone.payoutUsdc),
    };
  }

  if (totalRejected >= rejectionThreshold) {
    return {
      kind: 'rejected',
      reason:
        'Rejection recorded by the committee. The builder may resubmit with the requested revisions before the milestone deadline.',
      decidedByAddress: '0x0000000000000000000000000000000000000000',
      easAttestationOnchain: true,
    };
  }

  // Still mid-flight — show the live tally toward the *viewer's* outcome.
  const currentVotes = viewerIntent === 'approve' ? totalApproved : totalRejected;
  const required = viewerIntent === 'approve' ? quorumRequired : rejectionThreshold;
  return {
    kind: 'awaiting_quorum',
    currentVotes,
    quorumRequired: required,
    myVote: viewerIntent,
  };
}

/** Approximate a Sablier flow rate from a lump-sum amount + 30-day window. */
function deriveFlowRate(usdc: number) {
  const ratePerSec = usdc / (30 * 86_400);
  return `${ratePerSec.toFixed(6)} USDC/sec`;
}

function MilestoneIndexBadge({
  index,
  className,
}: {
  index: number;
  className: string;
}) {
  const padded = index.toString().padStart(2, '0');
  return (
    <div
      className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border text-center font-mono ${className}`}
      aria-hidden
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] opacity-70">MS</span>
      <span className="text-base font-bold leading-none">{padded}</span>
    </div>
  );
}

function OutcomeBlock({
  outcome,
  milestoneIndex,
  onApprove,
  onReject,
  isVoting,
}: {
  outcome: GrantMilestoneOutcome;
  milestoneIndex: number;
  onApprove: () => void;
  onReject: () => void;
  isVoting: boolean;
}) {
  switch (outcome.kind) {
    case 'awaiting_vote':
      return (
        <AwaitingVoteBlock
          outcome={outcome}
          onApprove={onApprove}
          onReject={onReject}
          disabled={isVoting}
        />
      );
    case 'awaiting_quorum':
      return <AwaitingQuorumBlock outcome={outcome} />;
    case 'approved_streaming':
    case 'approved_lump_sum':
      return <ApprovedBlock outcome={outcome} />;
    case 'rejected':
      return <RejectedBlock outcome={outcome} milestoneIndex={milestoneIndex} />;
  }
}

function AwaitingVoteBlock({
  outcome,
  onApprove,
  onReject,
  disabled,
}: {
  outcome: Extract<GrantMilestoneOutcome, { kind: 'awaiting_vote' }>;
  onApprove: () => void;
  onReject: () => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {outcome.proofOfWorkUrl ? (
          <a
            href={outcome.proofOfWorkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View Proof of Work
          </a>
        ) : null}
        {outcome.proofOfWorkUrl && outcome.commitsUrl ? (
          <span className="text-slate-300" aria-hidden>
            |
          </span>
        ) : null}
        {outcome.commitsUrl ? (
          <a
            href={outcome.commitsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900"
          >
            <GithubMark className="h-3.5 w-3.5" />
            Commits
          </a>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-sm font-medium text-slate-600">Your Vote is Required</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReject}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            Reject
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            Approve
          </button>
        </div>
      </div>
    </>
  );
}

function AwaitingQuorumBlock({
  outcome,
}: {
  outcome: Extract<GrantMilestoneOutcome, { kind: 'awaiting_quorum' }>;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <p className="inline-flex items-center gap-2 text-sm text-slate-500">
        <Clock className="h-4 w-4 text-slate-400" aria-hidden />
        Awaiting Quorum ({outcome.currentVotes}/{outcome.quorumRequired} votes)
      </p>
      {outcome.myVote ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
          {outcome.myVote === 'approve' ? (
            <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.2} aria-hidden />
          ) : (
            <ThumbsDown className="h-3.5 w-3.5 text-red-500" strokeWidth={2.2} aria-hidden />
          )}
          You voted {outcome.myVote === 'approve' ? 'Approve' : 'Reject'}
        </span>
      ) : null}
    </div>
  );
}

function ApprovedBlock({
  outcome,
}: {
  outcome:
    | Extract<GrantMilestoneOutcome, { kind: 'approved_streaming' }>
    | Extract<GrantMilestoneOutcome, { kind: 'approved_lump_sum' }>;
}) {
  const isStreaming = outcome.kind === 'approved_streaming';
  return (
    <div className="animate-quorum-banner-in mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-900">
            Quorum reached &mdash; payment released.
          </p>
          <p className="mt-0.5 text-xs text-emerald-800/80">
            Approved by {outcome.approvers}/{outcome.committeeRequired} committee members
          </p>
        </div>
      </div>

      {isStreaming ? (
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono tabular-nums">Streaming at {outcome.flowRate}</span>
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          USDC transferred to builder
        </span>
      )}
    </div>
  );
}

function RejectedBlock({
  outcome,
  milestoneIndex,
}: {
  outcome: Extract<GrantMilestoneOutcome, { kind: 'rejected' }>;
  milestoneIndex: number;
}) {
  return (
    <div className="animate-quorum-banner-in mt-4 space-y-3">
      <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
            <XCircle className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-red-900">
              Rejected &mdash; builder may resubmit before deadline.
            </p>
            {outcome.easAttestationOnchain ? (
              <p className="mt-0.5 text-xs text-red-800/80">
                EAS Attestation recorded on-chain
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Reason:</p>
        <blockquote
          aria-label={`Rejection reason for milestone ${milestoneIndex}`}
          className="mt-1.5 text-sm italic leading-relaxed text-slate-700 [font-family:var(--font-geist-sans),ui-sans-serif,system-ui,sans-serif]"
        >
          &ldquo;{outcome.reason}&rdquo;
        </blockquote>
      </div>
    </div>
  );
}

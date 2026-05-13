'use client';

import VotePendingOverlay from '@/components/committee/reviews/VotePendingOverlay';
import type {
  CommitteeAiVerdictTag,
  CommitteeApprover,
  CommitteeReviewSubmission,
} from '@/demo/committee-demo';
import { useDemoVoteFlow, type VoteFlowState } from '@/lib/committee-vote-flow';
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Radio,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const SIMULATED_PEER_INTERVAL_MS = 1500;
const QUORUM_BANNER_DELAY_MS = 700;
/**
 * Probability that a simulated peer votes the *same* way as the viewer.
 * Anything > 0.5 gives the demo a visible majority bias toward the viewer's
 * intent, while still letting the occasional counter-vote slip in so it
 * doesn't look fake. Keep < 1 — quorum is never guaranteed in real life.
 */
const PEER_MATCH_PROBABILITY = 0.7;

type ReviewPanelProps = {
  submission: CommitteeReviewSubmission;
  /** Notified once the local vote FSM reaches the terminal `voted` state. */
  onVoteFinalised?: (id: string, intent: 'approve' | 'reject', txHash?: string) => void;
  /**
   * When `false`, Approve / Reject buttons are inactive and the live-feed
   * simulation pauses. Used by the `Voted` / `Completed` tabs.
   */
  actionable?: boolean;
};

const GithubMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

function truncateAddress(addr: string) {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function formatUsd(amount: number) {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * Full-width review panel for a single milestone submission.
 *
 * State substates handled in-component (US-03 / Screen 4):
 *  - `idle`        — both Approve / Reject buttons active.
 *  - `confirming`  — overlay "Confirm in your wallet" pinned over the panel.
 *  - `submitted`   — overlay flips to "Transaction submitted" with Arbiscan link.
 *  - `voted`       — buttons are replaced by a grey `You voted Approve/Reject`
 *                    chip and the approver pills include the current viewer.
 *
 * "Another Member Voting" is simulated locally with `simulatedPeerVotes` while
 * we don't have a deployed `VoteCast` event. Replace with
 * `useWatchContractEvent({ eventName: 'VoteCast' })` when wiring real reads.
 */
export default function ReviewPanel({
  submission,
  onVoteFinalised,
  actionable = true,
}: ReviewPanelProps) {
  // Bootstrap the FSM with `voted` when the data already says the viewer cast a
  // vote, so the `Voted` tab renders the chip directly without re-playing the
  // confirm/submitted phases.
  const initialFlow: VoteFlowState | undefined = submission.currentMemberVoted
    ? { kind: 'voted', intent: 'approve' }
    : undefined;
  const flow = useDemoVoteFlow(initialFlow);

  // Simulated peer "VoteCast" feed — appends matching peer votes after the
  // viewer votes so the live counter visibly ticks all the way to quorum.
  // Disabled when the panel is not actionable.
  const [simulatedPeerVotes, setSimulatedPeerVotes] = useState<CommitteeApprover[]>([]);
  const shouldRunLiveFeed = actionable && !submission.finalOutcome;

  useEffect(() => {
    if (!shouldRunLiveFeed) return;
    if (flow.state.kind !== 'voted') return;

    const viewerIntent = flow.state.intent;
    const totalMembers = submission.approvers.length;
    const quorum = submission.committeeRequired;
    // Approval becomes mathematically impossible at this many rejections.
    const rejectionThreshold = totalMembers - quorum + 1;

    const baseApproved = submission.approvers.filter((a) => a.status === 'approved').length;
    const baseRejected = submission.approvers.filter((a) => a.status === 'rejected').length;
    const pendingSlots = submission.approvers.filter((a) => a.status === 'pending').length;

    const intervalId = window.setInterval(() => {
      // Decide *this* peer's vote up-front so the random draw is stable even
      // if React re-invokes the setState callback (strict mode).
      const willMatchViewer = Math.random() < PEER_MATCH_PROBABILITY;
      const matchStatus: 'approved' | 'rejected' =
        viewerIntent === 'approve' ? 'approved' : 'rejected';
      const counterStatus: 'approved' | 'rejected' =
        viewerIntent === 'approve' ? 'rejected' : 'approved';
      const peer: CommitteeApprover = {
        address: makeRandomAddress(),
        status: willMatchViewer ? matchStatus : counterStatus,
      };

      setSimulatedPeerVotes((prev) => {
        const approvedNow =
          baseApproved +
          (viewerIntent === 'approve' ? 1 : 0) +
          prev.filter((p) => p.status === 'approved').length;
        const rejectedNow =
          baseRejected +
          (viewerIntent === 'reject' ? 1 : 0) +
          prev.filter((p) => p.status === 'rejected').length;
        // Viewer occupies one of the pending slots; peers occupy the rest.
        const slotsLeft = pendingSlots - 1 - prev.length;

        // Final-state stop conditions: real contract semantics.
        const reachedApprovalQuorum = approvedNow >= quorum;
        const reachedRejectionThreshold = rejectedNow >= rejectionThreshold;

        if (reachedApprovalQuorum || reachedRejectionThreshold || slotsLeft <= 0) {
          window.clearInterval(intervalId);
          return prev;
        }
        return [...prev, peer];
      });
    }, SIMULATED_PEER_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [
    flow.state,
    shouldRunLiveFeed,
    submission.approvers,
    submission.committeeRequired,
  ]);

  const approversAfterFlow = useMemo(() => {
    let approvers: CommitteeApprover[] = submission.approvers.slice();

    // If the viewer just voted, promote the *first pending* slot to their
    // vote. Avoids guessing the viewer's address while keeping the visual
    // tally accurate.
    if (flow.state.kind === 'voted') {
      const pendingIdx = approvers.findIndex((a) => a.status === 'pending');
      if (pendingIdx >= 0) {
        approvers = approvers.slice();
        approvers[pendingIdx] = {
          ...approvers[pendingIdx],
          status: flow.state.intent === 'approve' ? 'approved' : 'rejected',
        };
      }
    }

    if (simulatedPeerVotes.length > 0) {
      approvers = approvers.slice();
      let peerIdx = 0;
      for (let i = 0; i < approvers.length && peerIdx < simulatedPeerVotes.length; i++) {
        if (approvers[i].status === 'pending') {
          approvers[i] = simulatedPeerVotes[peerIdx];
          peerIdx++;
        }
      }
    }

    return approvers;
  }, [submission.approvers, flow.state, simulatedPeerVotes]);

  const approvedCount = approversAfterFlow.filter((a) => a.status === 'approved').length;
  const rejectedCount = approversAfterFlow.filter((a) => a.status === 'rejected').length;
  const pendingApproverCount = approversAfterFlow.filter((a) => a.status === 'pending').length;
  const progressPercent = Math.min(
    100,
    Math.round((approvedCount / submission.committeeRequired) * 100),
  );

  const overlayState =
    flow.state.kind === 'confirming' || flow.state.kind === 'submitted' ? flow.state : null;
  // Once we hit quorum the buttons should be inert even if FSM is technically
  // idle (e.g. another member's vote crossed the threshold). Rejection lands
  // when approval is mathematically impossible — i.e. enough members have
  // rejected that the remaining slots can no longer reach the approval quorum.
  const totalMembers = approversAfterFlow.length;
  const rejectionThreshold = totalMembers - submission.committeeRequired + 1;
  const rawQuorumOutcome: 'approved' | 'rejected' | null =
    approvedCount >= submission.committeeRequired
      ? 'approved'
      : rejectedCount >= rejectionThreshold
        ? 'rejected'
        : null;

  // Give the counter a beat to visibly tick before the banner takes over —
  // simulates the on-chain `MilestoneApproved` / `MilestoneRejected` event
  // arriving slightly after the final VoteCast.
  const [quorumOutcome, setQuorumOutcome] = useState<typeof rawQuorumOutcome>(
    submission.finalOutcome ?? null,
  );

  useEffect(() => {
    if (!rawQuorumOutcome) return;
    if (quorumOutcome) return;
    const t = window.setTimeout(() => {
      setQuorumOutcome(rawQuorumOutcome);
    }, QUORUM_BANNER_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [rawQuorumOutcome, quorumOutcome]);

  const buttonsDisabled =
    !actionable ||
    flow.state.kind !== 'idle' ||
    Boolean(submission.finalOutcome) ||
    submission.currentMemberVoted ||
    Boolean(quorumOutcome);

  // Surface the finalised vote to the page once.
  useEffect(() => {
    if (flow.state.kind !== 'voted') return;
    onVoteFinalised?.(submission.id, flow.state.intent, flow.state.txHash);
  }, [flow.state, submission.id, onVoteFinalised]);

  const quorumReached = Boolean(rawQuorumOutcome);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:divide-x lg:divide-slate-100">
        <EvidenceBlock submission={submission} />
        <VotingBlock
          submission={submission}
          approvers={approversAfterFlow}
          approvedCount={approvedCount}
          rejectedApproverCount={rejectedCount}
          skippedMembersCount={pendingApproverCount}
          progressPercent={progressPercent}
          buttonsDisabled={buttonsDisabled}
          quorumReached={quorumReached}
          quorumOutcome={quorumOutcome}
          flowState={flow.state}
          onApprove={() => flow.start('approve')}
          onReject={() => flow.start('reject')}
          showLiveUpdates={shouldRunLiveFeed && flow.state.kind !== 'idle'}
        />
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

function EvidenceBlock({ submission }: { submission: CommitteeReviewSubmission }) {
  return (
    <section className="p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-tight text-slate-900">
            {submission.grantTitle}
          </h3>
          <p className="mt-1 font-mono text-xs text-slate-500">
            Grant {submission.grantId} · Builder:{' '}
            <span className="font-semibold text-blue-600">
              {truncateAddress(submission.builder)}
            </span>
          </p>
        </div>
        <ZkVerifiedPill verified={submission.zkVerified} />
      </header>

      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          <p className="text-sm font-bold text-blue-900">AI Analysis Verdict</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {submission.aiVerdictSummary}
        </p>
        {submission.aiVerdictTags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {submission.aiVerdictTags.map((tag) => (
              <VerdictTag key={tag.label} tag={tag} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Builder submission notes
        </p>
        <blockquote className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 italic text-sm leading-relaxed text-slate-700 [font-family:var(--font-geist-sans),ui-sans-serif,system-ui,sans-serif]">
          &ldquo;{submission.builderSummary}&rdquo;
        </blockquote>
      </div>

      <footer className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        {submission.easAttestationUrl ? (
          <a
            href={submission.easAttestationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View EAS Attestation
          </a>
        ) : null}
        {submission.githubPrUrl ? (
          <a
            href={submission.githubPrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900"
          >
            <GithubMark className="h-3.5 w-3.5" />
            GitHub PR
          </a>
        ) : null}
      </footer>
    </section>
  );
}

function VotingBlock({
  submission,
  approvers,
  approvedCount,
  rejectedApproverCount,
  skippedMembersCount,
  progressPercent,
  buttonsDisabled,
  quorumReached,
  quorumOutcome,
  flowState,
  onApprove,
  onReject,
  showLiveUpdates,
}: {
  submission: CommitteeReviewSubmission;
  approvers: CommitteeApprover[];
  approvedCount: number;
  rejectedApproverCount: number;
  skippedMembersCount: number;
  progressPercent: number;
  buttonsDisabled: boolean;
  quorumReached: boolean;
  quorumOutcome: 'approved' | 'rejected' | null;
  flowState: VoteFlowState;
  onApprove: () => void;
  onReject: () => void;
  showLiveUpdates: boolean;
}) {
  const isVoted = flowState.kind === 'voted';
  // Once an outcome is locked in, the remaining "pending" members didn't get
  // to vote — their slot is closed. Only render the members who actually cast
  // a vote and roll the rest into a "+ N did not vote" pill.
  const displayedApprovers = quorumOutcome
    ? approvers.filter((a) => a.status !== 'pending')
    : approvers;

  return (
    <section className="flex h-full flex-col gap-5 bg-slate-50/40 p-5 sm:p-6 lg:bg-white">
      <div>
        <h4 className="text-base font-bold leading-tight text-slate-900">
          Milestone {submission.milestoneIndex}: {submission.milestoneTitle}
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          <span className="mr-1" aria-hidden>
            💵
          </span>
          Payout:{' '}
          <span className="font-semibold text-slate-900">
            {formatUsd(submission.payoutUsdc)} USDC
          </span>{' '}
          {submission.payoutMode === 'superfluid' ? 'via Superfluid' : 'lump-sum'}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-700">
              {quorumOutcome ? 'Committee Vote' : 'Committee Approvals'}
            </p>
            {showLiveUpdates ? <LiveUpdatesBadge /> : null}
          </div>
          {quorumOutcome ? (
            <p className="font-medium text-slate-500">
              <span className="font-bold text-emerald-700">{approvedCount} approved</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span
                className={`font-bold ${
                  rejectedApproverCount > 0 ? 'text-red-600' : 'text-slate-500'
                }`}
              >
                {rejectedApproverCount} rejected
              </span>
            </p>
          ) : (
            <p className="font-bold text-slate-900">
              {approvedCount}{' '}
              <span className="font-medium text-slate-400">
                / {submission.committeeRequired} Required
              </span>
            </p>
          )}
        </div>
        {!quorumOutcome ? (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-[width] duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        ) : null}

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {displayedApprovers.map((approver, i) => (
            <li key={`${approver.address}-${i}`}>
              <ApproverChip approver={approver} />
            </li>
          ))}
          {quorumOutcome && skippedMembersCount > 0 ? (
            <li>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
                +{skippedMembersCount} did not vote
              </span>
            </li>
          ) : null}
        </ul>

        {quorumReached && !quorumOutcome ? (
          <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
            Quorum reached
          </p>
        ) : null}
      </div>

      <div className="mt-auto pt-2">
        {quorumOutcome === 'approved' ? (
          <QuorumApprovedBanner
            submission={submission}
            approvedCount={approvedCount}
          />
        ) : quorumOutcome === 'rejected' ? (
          <QuorumRejectedBanner
            rejectedCount={rejectedApproverCount}
            totalMembers={submission.approvers.length}
            reason={submission.rejectionReason}
          />
        ) : isVoted ? (
          <VotedChip intent={flowState.intent} txHash={flowState.txHash} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={buttonsDisabled}
              onClick={onReject}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={buttonsDisabled}
              onClick={onApprove}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ThumbsUp className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              Approve
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function QuorumApprovedBanner({
  submission,
  approvedCount,
}: {
  submission: CommitteeReviewSubmission;
  approvedCount: number;
}) {
  const isStreaming = submission.payoutMode === 'superfluid';
  const flowRate = useMemo(
    () => deriveDemoFlowRate(submission.payoutUsdc),
    [submission.payoutUsdc],
  );
  return (
    <div className="animate-quorum-banner-in rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-900">
            Quorum reached &mdash; payment released.
          </p>
          <p className="mt-0.5 text-xs text-emerald-800/80">
            Approved by {approvedCount} of {submission.committeeRequired} required committee
            members
          </p>
        </div>
      </div>
      <div className="mt-3">
        {isStreaming ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono tabular-nums">Streaming at {flowRate}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            USDC transferred to builder
          </span>
        )}
      </div>
    </div>
  );
}

function QuorumRejectedBanner({
  rejectedCount,
  totalMembers,
  reason,
}: {
  rejectedCount: number;
  totalMembers: number;
  reason?: string;
}) {
  return (
    <div className="animate-quorum-banner-in space-y-3">
      <div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
            <XCircle className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-red-900">
              Rejected &mdash; builder may resubmit before deadline.
            </p>
            <p className="mt-0.5 text-xs text-red-800/80">
              Rejected by {rejectedCount} of {totalMembers} committee members &middot; EAS
              attestation recorded on-chain
            </p>
          </div>
        </div>
      </div>
      {reason ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Reason
          </p>
          <blockquote className="mt-1.5 text-xs italic leading-relaxed text-slate-700">
            &ldquo;{reason}&rdquo;
          </blockquote>
        </div>
      ) : null}
    </div>
  );
}

/** Approximate a Superfluid flow rate from a lump-sum amount + 30-day window. */
function deriveDemoFlowRate(usdc: number) {
  const ratePerSec = usdc / (30 * 86_400);
  return `${ratePerSec.toFixed(6)} USDC/sec`;
}

/** Random 40-char hex address (lowercased, 0x-prefixed). */
function makeRandomAddress(): `0x${string}` {
  let out = '0x';
  const chars = 'abcdef0123456789';
  for (let i = 0; i < 40; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out as `0x${string}`;
}

function VotedChip({
  intent,
  txHash,
}: {
  intent: 'approve' | 'reject';
  txHash?: string;
}) {
  const isApprove = intent === 'approve';
  return (
    <div className="space-y-2 text-center">
      <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
        {isApprove ? (
          <ThumbsUp className="h-4 w-4 text-emerald-600" strokeWidth={2.2} aria-hidden />
        ) : (
          <ThumbsDown className="h-4 w-4 text-red-500" strokeWidth={2.2} aria-hidden />
        )}
        You voted {isApprove ? 'Approve' : 'Reject'}
      </span>
      {txHash ? (
        <a
          href={`https://arbiscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
          View on Arbiscan
        </a>
      ) : null}
    </div>
  );
}

function LiveUpdatesBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      <Radio className="hidden h-2.5 w-2.5" aria-hidden />
      Live updates
    </span>
  );
}

function ZkVerifiedPill({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        ZK Verified
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">
      <XCircle className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      Unverified
    </span>
  );
}

function VerdictTag({ tag }: { tag: CommitteeAiVerdictTag }) {
  const toneClass =
    tag.tone === 'positive'
      ? 'bg-emerald-50 text-emerald-700'
      : tag.tone === 'negative'
        ? 'bg-red-50 text-red-700'
        : 'bg-slate-100 text-slate-700';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}
    >
      {tag.tone === 'positive' ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
      {tag.label}
    </span>
  );
}

function ApproverChip({ approver }: { approver: CommitteeApprover }) {
  if (approver.status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700">
        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        {truncateAddress(approver.address)}
      </span>
    );
  }
  if (approver.status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-700">
        <span className="flex h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
        {truncateAddress(approver.address)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
      <Clock className="h-3 w-3" aria-hidden />
      Pending…
    </span>
  );
}

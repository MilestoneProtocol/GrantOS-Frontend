/**
 * Committee dashboard demo data — used while `NEXT_PUBLIC_GRANTOS_UI_DEMO=true`
 * so we can design the workspace before wiring real contract reads.
 *
 * In the empty state, `pendingReviews === 0` and no milestone is in the
 * `submitted` state, so milestone rows render as read-only status badges.
 */

export type CommitteeMilestoneStatus =
  | 'completed'
  | 'building'
  | 'submitted'
  | 'not_started'
  | 'rejected';

export type CommitteeGrantStatus = 'in_progress' | 'completed';

export type CommitteeDemoMilestone = {
  /** Short label like "M1", "M2", surfaced in the UI alongside the title. */
  label: string;
  title: string;
  status: CommitteeMilestoneStatus;
};

export type CommitteeDemoGrant = {
  id: string;
  title: string;
  builder: `0x${string}`;
  /** USDC amount in whole units (no decimals). */
  totalAllocation: number;
  milestonesTotal: number;
  milestonesCompleted: number;
  status: CommitteeGrantStatus;
  milestones: CommitteeDemoMilestone[];
  /** ISO date string, only set when `status === "completed"`. */
  approvedAt?: string;
};

export type CommitteeDemoSummary = {
  totalActiveGrants: number;
  usdcUnderControl: number;
  pendingReviews: number;
  grants: CommitteeDemoGrant[];
};

/* -------------------------------------------------------------------------- */
/*                          Active Reviews (US-03 main)                       */
/* -------------------------------------------------------------------------- */

export type CommitteeApproverStatus = 'approved' | 'pending' | 'rejected';

export type CommitteeApprover = {
  address: `0x${string}`;
  status: CommitteeApproverStatus;
};

export type CommitteeAiVerdictTag = {
  label: string;
  tone: 'positive' | 'neutral' | 'negative';
};

export type CommitteeReviewSubmission = {
  id: string;
  grantId: string;
  grantTitle: string;
  builder: `0x${string}`;
  milestoneIndex: number;
  milestoneTitle: string;
  payoutUsdc: number;
  payoutMode: 'lump_sum' | 'superfluid';
  zkVerified: boolean;
  aiVerdictSummary: string;
  aiVerdictTags: CommitteeAiVerdictTag[];
  builderSummary: string;
  easAttestationUrl?: string;
  githubPrUrl?: string;
  committeeRequired: number;
  approvers: CommitteeApprover[];
  /** From the current viewer's perspective: have they already cast a vote? */
  currentMemberVoted: boolean;
  /**
   * Final on-chain outcome for the submission.
   *  - `undefined` → submission is still gathering votes (Pending Reviews tab).
   *  - `'approved'` → approval quorum reached; renders in the Approved tab.
   *  - `'rejected'` → rejection threshold reached; renders in the Rejected tab.
   */
  finalOutcome?: 'approved' | 'rejected';
  /** Optional rejection reason copied from the deciding voter's EAS attestation. */
  rejectionReason?: string;
};

export type CommitteeReviewsView = {
  /** Total reviews still gathering votes — surfaced in the header pill. */
  totalPending: number;
  /** Counts on the segmented tab bar (each tab shows every submission of that state). */
  tabCounts: {
    pending: number;
    approved: number;
    rejected: number;
  };
  pending: CommitteeReviewSubmission[];
  approved: CommitteeReviewSubmission[];
  rejected: CommitteeReviewSubmission[];
};

export function getCommitteeDemoActiveReviews(): CommitteeReviewsView {
  // -------------------------------- PENDING --------------------------------

  /** Fresh submission — viewer hasn't voted yet, one prior approval on chain. */
  const pendingDefiUi: CommitteeReviewSubmission = {
    id: 'sub-defi-ui-m2',
    grantId: '#4092',
    grantTitle: 'DeFi Aggregator UI v2',
    builder: '0x4F2bA1cE9d3eC1A2bD5cF60d12c5b3e9F87a8B21',
    milestoneIndex: 2,
    milestoneTitle: 'Frontend Integration',
    payoutUsdc: 5_000,
    payoutMode: 'superfluid',
    zkVerified: true,
    aiVerdictSummary:
      'The provided GitHub commits and Vercel deployment links match the milestone criteria. Smart contract integrations for swap routing have been verified on Arbiscan. No critical vulnerabilities detected in the surface scan.',
    aiVerdictTags: [
      { label: 'Code Merged', tone: 'positive' },
      { label: 'Deployed', tone: 'positive' },
    ],
    builderSummary:
      'Completed the UI overhaul for the swap interface. Integrated 1inch router for better rates. Live preview is available at the provided link.',
    easAttestationUrl: 'https://arbitrum.easscan.org/attestation/view/0xabc',
    githubPrUrl: 'https://github.com/example/defi-aggregator/pull/214',
    committeeRequired: 3,
    approvers: [
      { address: '0x1Ab43e5cF0123Ee9d8C4B2A0bE1FFcD12Aa9F022', status: 'approved' },
      { address: '0x885F8aBe1CdA2eC4F0E91dA3aB7e8F12C3a3C341', status: 'pending' },
      { address: '0x2E14b9DE2F8AA1cC54e7BC91dE0F12cBfA17D088', status: 'pending' },
      { address: '0x5D9aB2C7Ee103aB4DfC2F88D11Ea7Cc04F39A001', status: 'pending' },
      { address: '0x77c9Aa12eE83b4D2C7e1F2Aa3B1c2EeC9DfD2002', status: 'pending' },
    ],
    currentMemberVoted: false,
  };

  /** Pending — viewer has already voted; awaiting other members. */
  const pendingPublicGoods: CommitteeReviewSubmission = {
    id: 'sub-pg-m1',
    grantId: '#4087',
    grantTitle: 'Public Goods Explorer',
    builder: '0x2c4FAa31Be7c0E7c5bBF7CdE2b0C5dF4eFa2A8F1a',
    milestoneIndex: 1,
    milestoneTitle: 'Discovery Page MVP',
    payoutUsdc: 2_500,
    payoutMode: 'lump_sum',
    zkVerified: true,
    aiVerdictSummary:
      'Frontend matches the linked Figma. API contract is honoured and accessibility audit passes. Awaiting one more committee vote to reach quorum.',
    aiVerdictTags: [
      { label: 'Design Match', tone: 'positive' },
      { label: 'A11y Audit', tone: 'positive' },
    ],
    builderSummary:
      'Shipped the discovery page MVP with a faceted search. Lighthouse scores attached in the PR description.',
    easAttestationUrl: 'https://arbitrum.easscan.org/attestation/view/0x123',
    githubPrUrl: 'https://github.com/example/public-goods/pull/9',
    committeeRequired: 3,
    approvers: [
      { address: '0x1Ab43e5cF0123Ee9d8C4B2A0bE1FFcD12Aa9F022', status: 'approved' },
      { address: '0x885F8aBe1CdA2eC4F0E91dA3aB7e8F12C3a3C341', status: 'approved' },
      { address: '0x2E14b9DE2F8AA1cC54e7BC91dE0F12cBfA17D088', status: 'pending' },
      { address: '0x5D9aB2C7Ee103aB4DfC2F88D11Ea7Cc04F39A001', status: 'pending' },
      { address: '0x77c9Aa12eE83b4D2C7e1F2Aa3B1c2EeC9DfD2002', status: 'pending' },
    ],
    currentMemberVoted: true,
  };

  /** Pending — viewer hasn't voted, brand-new submission with no votes yet. */
  const pendingZkCircuits: CommitteeReviewSubmission = {
    id: 'sub-zk-m1',
    grantId: '#4118',
    grantTitle: 'ZK Identity Solutions',
    builder: '0x9B1CC8e6F11d99Ee2c3aA4F1Ee72BfA67dD64D2c',
    milestoneIndex: 1,
    milestoneTitle: 'Architecture Design',
    payoutUsdc: 4_500,
    payoutMode: 'lump_sum',
    zkVerified: true,
    aiVerdictSummary:
      'Architecture spec and circuit diagrams are coherent. Test vectors compile and the proving key matches the declared parameters. Suggest committee verify wallet binding flow before approval.',
    aiVerdictTags: [
      { label: 'Spec Reviewed', tone: 'positive' },
      { label: 'Manual Check Suggested', tone: 'neutral' },
    ],
    builderSummary:
      'Drafted the architecture for the identity binding circuits with notarised constraints. Documentation and tests are linked in the PR.',
    easAttestationUrl: 'https://arbitrum.easscan.org/attestation/view/0xdef',
    githubPrUrl: 'https://github.com/example/zk-identity/pull/42',
    committeeRequired: 3,
    approvers: [
      { address: '0x1Ab43e5cF0123Ee9d8C4B2A0bE1FFcD12Aa9F022', status: 'pending' },
      { address: '0x2E14b9DE2F8AA1cC54e7BC91dE0F12cBfA17D088', status: 'pending' },
      { address: '0x885F8aBe1CdA2eC4F0E91dA3aB7e8F12C3a3C341', status: 'pending' },
      { address: '0x5D9aB2C7Ee103aB4DfC2F88D11Ea7Cc04F39A001', status: 'pending' },
      { address: '0x77c9Aa12eE83b4D2C7e1F2Aa3B1c2EeC9DfD2002', status: 'pending' },
    ],
    currentMemberVoted: false,
  };

  // -------------------------------- APPROVED --------------------------------

  /** Finalised approved — 3 of 5 approved, 1 rejected, 1 did not vote. Streaming payout. */
  const approvedDefiContracts: CommitteeReviewSubmission = {
    id: 'sub-defi-m1',
    grantId: '#4092',
    grantTitle: 'DeFi Aggregator UI v2',
    builder: '0x4F2bA1cE9d3eC1A2bD5cF60d12c5b3e9F87a8B21',
    milestoneIndex: 1,
    milestoneTitle: 'Smart Contracts',
    payoutUsdc: 5_000,
    payoutMode: 'superfluid',
    zkVerified: true,
    aiVerdictSummary:
      'Contracts deployed to Arbitrum and verified on Arbiscan. Tests pass and coverage exceeds 90%. Approved by quorum.',
    aiVerdictTags: [
      { label: 'Verified', tone: 'positive' },
      { label: '>90% Coverage', tone: 'positive' },
    ],
    builderSummary:
      'Deployed the swap and router contracts to Arbitrum. Tests and gas reports are attached.',
    easAttestationUrl: 'https://arbitrum.easscan.org/attestation/view/0x456',
    githubPrUrl: 'https://github.com/example/defi-aggregator/pull/198',
    committeeRequired: 3,
    approvers: [
      { address: '0x1Ab43e5cF0123Ee9d8C4B2A0bE1FFcD12Aa9F022', status: 'approved' },
      { address: '0x885F8aBe1CdA2eC4F0E91dA3aB7e8F12C3a3C341', status: 'approved' },
      { address: '0x2E14b9DE2F8AA1cC54e7BC91dE0F12cBfA17D088', status: 'approved' },
      { address: '0x5D9aB2C7Ee103aB4DfC2F88D11Ea7Cc04F39A001', status: 'rejected' },
      { address: '0x77c9Aa12eE83b4D2C7e1F2Aa3B1c2EeC9DfD2002', status: 'pending' },
    ],
    currentMemberVoted: true,
    finalOutcome: 'approved',
  };

  /** Finalised approved — clean 3-of-3 unanimous, lump-sum. */
  const approvedZkOnboarding: CommitteeReviewSubmission = {
    id: 'sub-zk-m0',
    grantId: '#4118',
    grantTitle: 'ZK Identity Solutions',
    builder: '0x9B1CC8e6F11d99Ee2c3aA4F1Ee72BfA67dD64D2c',
    milestoneIndex: 0,
    milestoneTitle: 'Discovery & Scoping',
    payoutUsdc: 1_500,
    payoutMode: 'lump_sum',
    zkVerified: true,
    aiVerdictSummary:
      'Scoping doc covers acceptance criteria and risk register. AI verdict: low risk, ready to proceed.',
    aiVerdictTags: [
      { label: 'Scope Approved', tone: 'positive' },
      { label: 'Low Risk', tone: 'positive' },
    ],
    builderSummary:
      'Compiled the scoping doc and risk register with the committee. Linked all artefacts in the PR.',
    easAttestationUrl: 'https://arbitrum.easscan.org/attestation/view/0x789',
    githubPrUrl: 'https://github.com/example/zk-identity/pull/12',
    committeeRequired: 3,
    approvers: [
      { address: '0x1Ab43e5cF0123Ee9d8C4B2A0bE1FFcD12Aa9F022', status: 'approved' },
      { address: '0x885F8aBe1CdA2eC4F0E91dA3aB7e8F12C3a3C341', status: 'approved' },
      { address: '0x2E14b9DE2F8AA1cC54e7BC91dE0F12cBfA17D088', status: 'approved' },
    ],
    currentMemberVoted: true,
    finalOutcome: 'approved',
  };

  // -------------------------------- REJECTED --------------------------------

  /** Finalised rejected — 3 of 5 rejected, 1 approved, 1 didn't vote. */
  const rejectedAnalytics: CommitteeReviewSubmission = {
    id: 'sub-analytics-m2',
    grantId: '#4071',
    grantTitle: 'On-Chain Analytics Dashboard',
    builder: '0x8E2dDe9A7c3F1B45e6F9D8c2A1Bc0fE34De71D54',
    milestoneIndex: 2,
    milestoneTitle: 'Backfill Pipeline',
    payoutUsdc: 3_000,
    payoutMode: 'lump_sum',
    zkVerified: true,
    aiVerdictSummary:
      'Backfill jobs run end-to-end but the verifier flagged inconsistent block ranges and missing reconciliation tests. Recommend committee request a revised submission.',
    aiVerdictTags: [
      { label: 'Test Gaps', tone: 'negative' },
      { label: 'Range Drift', tone: 'negative' },
    ],
    builderSummary:
      'Backfilled the last 90 days of pool events into the warehouse. Reconciliation script attached.',
    easAttestationUrl: 'https://arbitrum.easscan.org/attestation/view/0xfa1',
    githubPrUrl: 'https://github.com/example/analytics-dashboard/pull/57',
    committeeRequired: 3,
    approvers: [
      { address: '0x1Ab43e5cF0123Ee9d8C4B2A0bE1FFcD12Aa9F022', status: 'rejected' },
      { address: '0x885F8aBe1CdA2eC4F0E91dA3aB7e8F12C3a3C341', status: 'rejected' },
      { address: '0x2E14b9DE2F8AA1cC54e7BC91dE0F12cBfA17D088', status: 'rejected' },
      { address: '0x5D9aB2C7Ee103aB4DfC2F88D11Ea7Cc04F39A001', status: 'approved' },
      { address: '0x77c9Aa12eE83b4D2C7e1F2Aa3B1c2EeC9DfD2002', status: 'pending' },
    ],
    currentMemberVoted: true,
    finalOutcome: 'rejected',
    rejectionReason:
      'Reconciliation tests missing for the new backfill ranges and the verifier flagged inconsistent block windows. Please add coverage and resubmit.',
  };

  const pending = [pendingDefiUi, pendingPublicGoods, pendingZkCircuits];
  const approved = [approvedDefiContracts, approvedZkOnboarding];
  const rejected = [rejectedAnalytics];

  return {
    totalPending: pending.length,
    tabCounts: {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
    },
    pending,
    approved,
    rejected,
  };
}

/* -------------------------------------------------------------------------- */
/*                  Grant Detail (Quorum Reached substates)                   */
/* -------------------------------------------------------------------------- */

export type GrantTagTone = 'defi' | 'infra' | 'social' | 'public_good' | 'other';

export type GrantMilestoneOutcome =
  | {
      kind: 'awaiting_vote';
      proofOfWorkUrl?: string;
      commitsUrl?: string;
      /** True when the current viewer has not voted yet. */
      needsCurrentVote: boolean;
      /** Total committee members eligible to vote. */
      totalCommittee: number;
      /** Number of approvals required to release payment. */
      quorumRequired: number;
      /**
       * Optional pre-existing tally (e.g. when other members voted before the
       * viewer landed on the page). Defaults to all-pending.
       */
      currentApproved?: number;
      currentRejected?: number;
    }
  | {
      kind: 'awaiting_quorum';
      currentVotes: number;
      quorumRequired: number;
      /** Set when the current viewer has cast a vote that's still gathering quorum. */
      myVote?: 'approve' | 'reject';
    }
  | {
      kind: 'approved_streaming';
      approvers: number;
      committeeRequired: number;
      /** Pretty string like "0.000014 USDC/sec" for the live flow indicator. */
      flowRate: string;
    }
  | {
      kind: 'approved_lump_sum';
      approvers: number;
      committeeRequired: number;
      /** ISO timestamp for the on-chain payout. */
      paidAtIso?: string;
    }
  | {
      kind: 'rejected';
      reason: string;
      decidedByAddress: `0x${string}`;
      easAttestationOnchain: boolean;
    };

export type GrantDetailMilestone = {
  index: number;
  title: string;
  description: string;
  payoutUsdc: number;
  outcome: GrantMilestoneOutcome;
};

export type GrantDetail = {
  id: string;
  /** Short uppercased tag shown on the header card (e.g. "DEFI"). */
  tag: string;
  tagTone: GrantTagTone;
  /** Lifecycle pill next to the tag (e.g. "ACTIVE GRANT"). */
  lifecycleLabel: string;
  title: string;
  description: string;
  totalAllocationUsdc: number;
  /** When `true`, approvals trigger a Superfluid stream rather than a lump-sum. */
  isStreaming: boolean;
  /** "3 of 4 Milestones Completed" — already derived. */
  completedMilestones: number;
  totalMilestones: number;
  /** Reverse-chronological list (latest milestone first). */
  milestones: GrantDetailMilestone[];
};

export function getCommitteeDemoGrantDetail(): GrantDetail {
  return {
    id: 'cross-chain-yield',
    tag: 'DEFI',
    tagTone: 'defi',
    lifecycleLabel: 'Active Grant',
    title: 'Cross-Chain Yield Aggregator',
    description:
      'Building a unified interface for yield farming across Arbitrum, Optimism, and Base using LayerZero messaging.',
    totalAllocationUsdc: 50_000,
    isStreaming: true,
    completedMilestones: 3,
    totalMilestones: 4,
    milestones: [
      {
        index: 4,
        title: 'Mainnet Deployment & Audit Fixes',
        description:
          'Deploy smart contracts to Arbitrum mainnet and implement all recommended fixes from the Trail of Bits audit report.',
        payoutUsdc: 15_000,
        outcome: {
          kind: 'awaiting_vote',
          proofOfWorkUrl: 'https://example.com/proof-of-work',
          commitsUrl: 'https://github.com/example/cross-chain-yield/commits/main',
          needsCurrentVote: true,
          totalCommittee: 5,
          quorumRequired: 3,
          currentApproved: 1,
          currentRejected: 0,
        },
      },
      {
        index: 3,
        title: 'Testnet Integration',
        description:
          'Complete integration with LayerZero testnet endpoints and deploy beta UI for community testing.',
        payoutUsdc: 10_000,
        outcome: {
          kind: 'awaiting_quorum',
          currentVotes: 2,
          quorumRequired: 3,
          myVote: 'approve',
        },
      },
      {
        index: 2,
        title: 'Smart Contract Architecture',
        description: 'Finalize smart contract architecture and complete internal security review.',
        payoutUsdc: 15_000,
        outcome: {
          kind: 'approved_streaming',
          approvers: 3,
          committeeRequired: 3,
          flowRate: '0.000014 USDC/sec',
        },
      },
      {
        index: 1,
        title: 'Initial Prototype',
        description: 'Deliver working prototype of the UI and basic contract interactions.',
        payoutUsdc: 10_000,
        outcome: {
          kind: 'rejected',
          reason:
            'Prototype lacks integration with the specified testnet. The UI is functional but the contract interactions are currently mocked. Please complete the actual testnet deployment before resubmitting.',
          decidedByAddress: '0x1Ab43e5cF0123Ee9d8C4B2A0bE1FFcD12Aa9F022',
          easAttestationOnchain: true,
        },
      },
    ],
  };
}

const truncateBuilder = (a: `0x${string}`) => a;

export function getCommitteeDemoEmptyState(): CommitteeDemoSummary {
  return {
    totalActiveGrants: 12,
    usdcUnderControl: 45_000,
    pendingReviews: 0,
    grants: [
      {
        id: 'demo-grant-defi',
        title: 'DeFi Aggregator Protocol',
        builder: truncateBuilder('0x4A2bD3aE5C9f00cBEED11d9F0aA8a1B2C5C71E9c'),
        totalAllocation: 15_000,
        milestonesTotal: 4,
        milestonesCompleted: 2,
        status: 'in_progress',
        milestones: [
          { label: 'M1', title: 'Smart Contracts', status: 'completed' },
          { label: 'M2', title: 'Testnet Deployment', status: 'building' },
        ],
      },
      {
        id: 'demo-grant-zk',
        title: 'ZK Identity Solutions',
        builder: truncateBuilder('0x9B1CC8e6F11d99Ee2c3aA4F1Ee72BfA67dD64D2c'),
        totalAllocation: 25_000,
        milestonesTotal: 5,
        milestonesCompleted: 1,
        status: 'in_progress',
        milestones: [
          { label: 'M1', title: 'Architecture Design', status: 'completed' },
          { label: 'M2', title: 'Core Circuits', status: 'not_started' },
        ],
      },
      {
        id: 'demo-grant-public',
        title: 'Public Goods Explorer',
        builder: truncateBuilder('0x2c4FAa31Be7c0E7c5bBF7CdE2b0C5dF4eFa2A8F1a'),
        totalAllocation: 5_000,
        milestonesTotal: 3,
        milestonesCompleted: 3,
        status: 'completed',
        milestones: [],
        approvedAt: '2025-10-13',
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/*                        Committee Actions (US-04 slash)                     */
/* -------------------------------------------------------------------------- */

/**
 * Lifecycle of an overdue milestone in the committee actions surface.
 *  - `deadline_missed` → no warning attestation has been written yet; the
 *    committee must issue one before slashing is permitted.
 *  - `warning_issued`  → a warning attestation exists on chain; a 24h
 *    countdown is running. Slashing is still locked until it elapses.
 *  - `slash_available` → 24h has passed since the warning; the contract will
 *    now accept a slash transaction.
 *  - `slashed`         → terminal state after `GrantEscrow.slash(...)` has
 *    been confirmed; the milestone is permanently closed and the escrow has
 *    been returned to the treasury. All committee controls are gone.
 *
 * In practice the UI derives the `slash_available` state from
 * `warning_issued` by comparing `Date.now()` to `slashUnlocksAtIso`; we keep
 * the explicit kind for fixtures that want to demo the slash-ready state
 * without first walking through the warning countdown.
 */
export type OverdueMilestoneState =
  | { kind: 'deadline_missed' }
  | {
      kind: 'warning_issued';
      warningIssuedAtIso: string;
      /** ISO timestamp 24h after the warning was issued; UI counts down to this. */
      slashUnlocksAtIso: string;
      attestationUrl: string;
      committeeMemberAddress: `0x${string}`;
      message: string;
    }
  | {
      kind: 'slash_available';
      warningIssuedAtIso: string;
      attestationUrl: string;
    }
  | {
      kind: 'slashed';
      /** ISO timestamp of the `Slashed` event from `GrantEscrow`. */
      slashedAtIso: string;
      /** Slash transaction hash; linked to Arbiscan in the SlashedBadge. */
      txHash: string;
      /** Amount of USDC reclaimed to the treasury (whole units). */
      amountReturnedUsdc: number;
      /** EAS attestation URL that authorised the slash (the warning UID). */
      attestationUrl: string;
    };

export type CommitteeActionToken = 'ARB' | 'USDC';

/**
 * One event in the milestone's onchain audit trail (deadline missed, stream
 * paused, warning issued, etc.). Surfaced in the activity timeline on the
 * Warning Issuance screen.
 */
export type MilestoneActivityEvent = {
  id: string;
  title: string;
  description: string;
  /** Pretty relative timestamp, e.g. "2 days ago". */
  relativeLabel: string;
};

export type OverdueMilestone = {
  id: string;
  grantId: string;
  grantTitle: string;
  /** Position of the milestone in the grant timeline, e.g. "Milestone 2 of 4". */
  milestoneIndex: number;
  totalMilestones: number;
  milestoneTitle: string;
  amount: { value: number; token: CommitteeActionToken };
  paymentMode: 'superfluid' | 'lump_sum';
  /** Original on-chain deadline. */
  deadlineIso: string;
  state: OverdueMilestoneState;
  /* ---------------------- Focused-view metadata ---------------------- */
  /** Builder wallet that owns the grant. */
  builderAddress: `0x${string}`;
  /** USDC currently locked in escrow for this milestone (whole units). */
  escrowBalanceUsdc: number;
  /**
   * Pre-formatted stream rate (e.g. "500 USDC / week") — only meaningful when
   * `paymentMode === 'superfluid'`. Left undefined for lump-sum milestones.
   */
  streamRateLabel?: string;
  /** Whole days the milestone is past its deadline. */
  daysOverdue: number;
  /** Reverse-chronological onchain activity feed (latest first). */
  activity: MilestoneActivityEvent[];
  /**
   * Default body for the Warning Message textarea. The PRD requires a
   * pre-filled draft that the committee member can edit before signing.
   */
  warningMessageDraft: string;
};

export type PendingReviewSummary = {
  id: string;
  grantId: string;
  grantTitle: string;
  milestoneTitle: string;
  /** Pretty relative submitted time, e.g. "2 days ago". */
  submittedLabel: string;
  deadlineIso: string;
};

export type CommitteeActionsView = {
  overdueCount: number;
  pendingReviewCount: number;
  overdue: OverdueMilestone[];
  pendingReview: PendingReviewSummary[];
};

/**
 * Baseline timestamps for the seeded `warning_issued` milestone. Computed
 * once at module load so they're stable across page navigations within a
 * session (committee + builder dashboard see the same countdown) but always
 * "in the future" relative to the current wall clock — the demo never
 * accidentally ships with a slash-window-already-elapsed seed.
 */
const SEED_WARNING_ISSUED_AT_MS = Date.now() - 15 * 60 * 1000;
const SEED_SLASH_UNLOCKS_AT_MS =
  SEED_WARNING_ISSUED_AT_MS + 23 * 60 * 60 * 1000 + 45 * 60 * 1000;
const SEED_WARNING_ISSUED_AT_ISO = new Date(SEED_WARNING_ISSUED_AT_MS).toISOString();
const SEED_SLASH_UNLOCKS_AT_ISO = new Date(SEED_SLASH_UNLOCKS_AT_MS).toISOString();

/**
 * Demo data for `/committee`. The first overdue row is in `deadline_missed`
 * (the focus of this screen state); the second is in `warning_issued` so the
 * countdown variant is also visible.
 */
export function getCommitteeDemoActions(): CommitteeActionsView {
  const warningIssuedAtIso = SEED_WARNING_ISSUED_AT_ISO;
  const slashUnlocksAtIso = SEED_SLASH_UNLOCKS_AT_ISO;

  const overdue: OverdueMilestone[] = [
    {
      id: 'overdue-defi-m2',
      grantId: '#GRT-8921',
      grantTitle: 'DeFi Protocol Expansion',
      milestoneIndex: 2,
      totalMilestones: 4,
      milestoneTitle: 'V2 Testnet Launch',
      amount: { value: 25_000, token: 'USDC' },
      paymentMode: 'superfluid',
      deadlineIso: '2026-04-12',
      state: { kind: 'deadline_missed' },
      builderAddress: '0x4B2bA1cE9d3eC1A2bD5cF60d12c5b3e9F87a19aF',
      escrowBalanceUsdc: 25_000,
      streamRateLabel: '500 USDC / week',
      daysOverdue: 14,
      warningMessageDraft:
        'This milestone is overdue. You have 24 hours to respond or your escrow will be slashed.',
      activity: [
        {
          id: 'evt-stream-paused',
          title: 'Stream Paused by Protocol',
          description: 'Superfluid stream automatically paused due to missed deadline.',
          relativeLabel: '2 days ago',
        },
        {
          id: 'evt-deadline-passed',
          title: 'Milestone Deadline Passed',
          description: 'System flagged milestone as overdue.',
          relativeLabel: '14 days ago',
        },
      ],
    },
    {
      id: 'overdue-zk-m3',
      grantId: '#GRT-3881',
      grantTitle: 'ZK Identity Protocol',
      milestoneIndex: 3,
      totalMilestones: 3,
      milestoneTitle: 'Smart Contract Audit',
      amount: { value: 40_000, token: 'USDC' },
      paymentMode: 'superfluid',
      deadlineIso: '2026-04-10',
      state: {
        kind: 'warning_issued',
        warningIssuedAtIso,
        slashUnlocksAtIso,
        attestationUrl: 'https://arbitrum.easscan.org/attestation/view/0xdeadbeef',
        committeeMemberAddress: '0x1Ab43e5cF0123Ee9d8C4B2A0bE1FFcD12Aa9F022',
        message:
          'Submit deliverables for the Smart Contract Audit milestone or this grant will be slashed.',
      },
      builderAddress: '0x9B1CC8e6F11d99Ee2c3aA4F1Ee72BfA67dD64D2c',
      escrowBalanceUsdc: 40_000,
      streamRateLabel: '750 USDC / week',
      daysOverdue: 16,
      warningMessageDraft:
        'Submit deliverables for the Smart Contract Audit milestone or this grant will be slashed.',
      activity: [
        {
          id: 'evt-warning-issued',
          title: 'Warning Attestation Recorded',
          description:
            'Committee member issued a 24h on-chain warning via EAS. Countdown to slash availability is active.',
          relativeLabel: '1 day ago',
        },
        {
          id: 'evt-stream-paused-zk',
          title: 'Stream Paused by Protocol',
          description: 'Superfluid stream automatically paused due to missed deadline.',
          relativeLabel: '3 days ago',
        },
        {
          id: 'evt-deadline-passed-zk',
          title: 'Milestone Deadline Passed',
          description: 'System flagged milestone as overdue.',
          relativeLabel: '16 days ago',
        },
      ],
    },
  ];

  // Derive the pending-review table from the same source of truth as the
  // active-reviews surface so the deep-link IDs are guaranteed to resolve.
  // `submittedLabel` and `deadlineIso` are demo-only metadata that don't
  // exist on `CommitteeReviewSubmission` yet, so we project them on the fly.
  const reviewsView = getCommitteeDemoActiveReviews();
  const SUBMITTED_LABEL_FALLBACKS = ['2 days ago', '1 day ago', '4 hours ago', '3 days ago', '6 hours ago'];
  const DEADLINE_FALLBACKS = ['2026-05-20', '2026-05-22', '2026-05-25', '2026-05-18', '2026-05-23'];
  const pendingReview: PendingReviewSummary[] = reviewsView.pending.map((submission, i) => ({
    id: submission.id,
    grantId: submission.grantId,
    grantTitle: submission.grantTitle,
    milestoneTitle: submission.milestoneTitle,
    submittedLabel: SUBMITTED_LABEL_FALLBACKS[i] ?? 'recently',
    deadlineIso: DEADLINE_FALLBACKS[i] ?? '2026-06-01',
  }));

  return {
    overdueCount: overdue.length,
    pendingReviewCount: pendingReview.length,
    overdue,
    pendingReview,
  };
}

/**
 * Locate a single submission across all three tabs (pending / approved /
 * rejected). Used by `/committee/reviews/[id]` to render a focused view of
 * the specific milestone the committee member tapped on the dashboard.
 */
export function getCommitteeDemoSubmissionById(
  id: string,
): CommitteeReviewSubmission | undefined {
  const view = getCommitteeDemoActiveReviews();
  return [...view.pending, ...view.approved, ...view.rejected].find((s) => s.id === id);
}

/**
 * Lookup helper used by the inline Warning Issuance screen state on
 * `/committee`. We don't navigate to a new route — we just pivot the page
 * into a focused view of the one milestone the committee member chose to
 * warn, so a fast in-memory find is all we need.
 */
export function getOverdueMilestoneById(id: string): OverdueMilestone | undefined {
  return getCommitteeDemoActions().overdue.find((m) => m.id === id);
}

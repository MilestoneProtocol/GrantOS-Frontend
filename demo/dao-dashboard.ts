/**
 * DAO Governance Analytics — demo grant ledger + hero aggregates.
 * Gated by the same `NEXT_PUBLIC_GRANTOS_UI_DEMO` flag as the rest of the UI;
 * production wiring replaces this with GrantEscrow + indexers.
 */

export type DaoGrantPaymentMode = 'streaming' | 'lump_sum';

/** Lifecycle tags used by filter pills (OR semantics across selections). */
export type DaoGrantFilterTag =
  | 'active'
  | 'completed'
  | 'slashed'
  | 'warning_issued'
  | 'streaming';

export type DaoMilestoneStatus = 'pending' | 'approved' | 'overdue' | 'warning_issued' | 'slashed';

export type DaoMilestoneProofType = 'ZK' | 'PR' | 'Manual';

export type DaoMilestoneZkProof = {
  proofHash: `0x${string}`;
  prNumber: number;
  mergeStatus: 'Merged' | 'Open' | 'Closed';
  authorHandle: string;
  verification: 'Verified' | 'Unverified';
  verifiedBlockNumber?: number;
};

export type DaoMilestoneAiVerdict = {
  badge: 'Pass' | 'Review' | 'Fail';
  explanation: string;
};

export type DaoWarningAttestation = {
  issuedAtIso: string;
  committeeMember: `0x${string}`;
  message: string;
  attestationUrl: string;
};

export type DaoMilestoneTx = {
  kind: 'submission' | 'vote' | 'warning' | 'payment' | 'slash';
  txHash: `0x${string}`;
  txUrl: string;
  timestampIso: string;
};

export type DaoMilestoneModel = {
  index: number;
  title: string;
  description: string;
  amountUsdc: number;
  deadlineIso: string;
  status: DaoMilestoneStatus;
  proofType: DaoMilestoneProofType;
  zkProof: DaoMilestoneZkProof;
  aiVerdict: DaoMilestoneAiVerdict;
  warningHistory: DaoWarningAttestation[];
  transactions: DaoMilestoneTx[];
};

export type DaoGrantCardModel = {
  /** URL-safe id for future drawer route, e.g. `8692` */
  slug: string;
  /** Display id, e.g. `#GRT-8692` */
  displayId: string;
  builder: `0x${string}`;
  zkVerified: boolean;
  /** Human label, e.g. "Tier 2 Contributor" */
  contributionTier: string;
  reputationScore: number;
  createdAtIso: string;
  totalGrantUsdc: number;
  milestoneCompleted: number;
  milestoneTotal: number;
  /** Next pending milestone deadline (ISO); null if none */
  nextDeadlineIso: string | null;
  paymentMode: DaoGrantPaymentMode;
  /** Superfluid-style live ticker */
  isStreamingActive: boolean;
  /** USDC per second */
  streamRateUsdcPerSec: number;
  /** Accumulated streamed USDC at `streamEpochMs` */
  streamAccumulatedUsdcAtEpoch: number;
  streamEpochMs: number;
  hasWarning: boolean;
  hasSlashed: boolean;
  /** Derived filter tags for this row */
  tags: DaoGrantFilterTag[];
  milestones: DaoMilestoneModel[];
};

export type DaoHeroStatsModel = {
  totalUsdcLocked: number;
  activeGrants: number;
  milestonesDueThisWeek: number;
  totalReleasedThisMonth: number;
  /** Monotonic — ticks up on poll in demo */
  liveSlashCounterUsdc: number;
  /** Monotonic — ticks up on poll in demo */
  totalZkProofsVerified: number;
};

export type DaoDashboardSnapshot = {
  hero: DaoHeroStatsModel;
  grants: DaoGrantCardModel[];
};

const NOW = () => Date.now();

function buildArbiscanTxUrl(txHash: `0x${string}`): string {
  return `https://sepolia.arbiscan.io/tx/${txHash}`;
}

function buildEasUrl(uid: `0x${string}`): string {
  return `https://arbitrum-sepolia.easscan.org/attestation/view/${uid}`;
}

/** Base snapshot; `pollTick` bumps slash + ZK to exercise upward animations. */
export function getDaoDashboardSnapshot(pollTick: number): DaoDashboardSnapshot {
  const epoch = NOW();
  const createdAtBase = epoch - 220 * 24 * 60 * 60 * 1000;
  const grants: DaoGrantCardModel[] = [
    {
      slug: '8692',
      displayId: '#GRT-8692',
      builder: '0x4A2b9F2c8E1d3F5a6B7C8D9E0F1a2B3C4D5E6F7a8',
      zkVerified: true,
      contributionTier: 'Tier 2 Contributor',
      reputationScore: 84,
      createdAtIso: new Date(createdAtBase + 9 * 24 * 60 * 60 * 1000).toISOString(),
      totalGrantUsdc: 50_000,
      milestoneCompleted: 2,
      milestoneTotal: 4,
      nextDeadlineIso: new Date(epoch + 5 * 24 * 60 * 60 * 1000).toISOString(),
      paymentMode: 'streaming',
      isStreamingActive: true,
      streamRateUsdcPerSec: 0.000014,
      streamAccumulatedUsdcAtEpoch: 1402.85,
      streamEpochMs: epoch - 45 * 60 * 1000,
      hasWarning: false,
      hasSlashed: false,
      tags: ['active', 'streaming'],
      milestones: [
        {
          index: 1,
          title: 'Architecture & Core Contracts',
          description:
            'Initial setup of the aggregator smart contracts and local test harness.',
          amountUsdc: 10_000,
          deadlineIso: new Date(epoch - 18 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          proofType: 'PR',
          zkProof: {
            proofHash: '0x5b4e6d8c2a1f90b3a4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b' as `0x${string}`,
            prNumber: 214,
            mergeStatus: 'Merged',
            authorHandle: '@builder-a',
            verification: 'Verified',
            verifiedBlockNumber: 29384123,
          },
          aiVerdict: {
            badge: 'Pass',
            explanation:
              'Contract architecture matches the milestone scope and includes comprehensive unit tests. No obvious security issues found in the provided diff.',
          },
          warningHistory: [],
          transactions: [
            {
              kind: 'submission',
              txHash: '0x9c2fd9a2c6d4c4adf8b1d2a9b6b2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f7a8b9' as `0x${string}`,
              txUrl: buildArbiscanTxUrl(
                '0x9c2fd9a2c6d4c4adf8b1d2a9b6b2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f7a8b9' as `0x${string}`,
              ),
              timestampIso: new Date(epoch - 17 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              kind: 'payment',
              txHash: '0x2d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f7a8b99c2fd9a2' as `0x${string}`,
              txUrl: buildArbiscanTxUrl(
                '0x2d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f7a8b99c2fd9a2' as `0x${string}`,
              ),
              timestampIso: new Date(epoch - 16 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        },
        {
          index: 2,
          title: 'Frontend Integration & ZK Proofs',
          description:
            'Connect the React frontend to the smart contracts and implement ZK circuits for private voting.',
          amountUsdc: 15_000,
          deadlineIso: new Date(epoch + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          proofType: 'ZK',
          zkProof: {
            proofHash: '0xa9b0c1d2e3f4a5b697887766554433221100ffeeddccbbaa998877665544332211' as `0x${string}`,
            prNumber: 315,
            mergeStatus: 'Open',
            authorHandle: '@builder-a',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Review',
            explanation:
              'Submission includes ZK circuit scaffolding and basic integration, but verification artifacts are incomplete. Recommend committee review for correctness and security before approval.',
          },
          warningHistory: [],
          transactions: [
            {
              kind: 'submission',
              txHash: '0x0e90c9d1b2a3c4d5e6f7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e' as `0x${string}`,
              txUrl: buildArbiscanTxUrl(
                '0x0e90c9d1b2a3c4d5e6f7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e' as `0x${string}`,
              ),
              timestampIso: new Date(epoch - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        },
        {
          index: 3,
          title: 'Audit Remediation',
          description: 'Fix issues found during third‑party audit and ship patch release.',
          amountUsdc: 15_000,
          deadlineIso: new Date(epoch + 12 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          proofType: 'Manual',
          zkProof: {
            proofHash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff' as `0x${string}`,
            prNumber: 0,
            mergeStatus: 'Open',
            authorHandle: '@builder-a',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Review',
            explanation:
              'Awaiting submission. No artifacts available yet. Keep an eye on deadline and streaming status.',
          },
          warningHistory: [],
          transactions: [],
        },
        {
          index: 4,
          title: 'Mainnet Launch',
          description: 'Deploy the final system to mainnet and publish release notes.',
          amountUsdc: 10_000,
          deadlineIso: new Date(epoch + 28 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          proofType: 'Manual',
          zkProof: {
            proofHash: '0xffffeeeeddccbbbbaa0099887766554433221100ffeeddccbbaa998877665544' as `0x${string}`,
            prNumber: 0,
            mergeStatus: 'Open',
            authorHandle: '@builder-a',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Review',
            explanation:
              'Awaiting submission. This milestone is a deployment task and should include deployment tx + verification links.',
          },
          warningHistory: [],
          transactions: [],
        },
      ],
    },
    {
      slug: '7731',
      displayId: '#GRT-7731',
      builder: '0x9B1CC8e6F11d99Ee2c3aA4F1Ee72BfA67dD64D2c',
      zkVerified: true,
      contributionTier: 'Tier 1 Contributor',
      reputationScore: 62,
      createdAtIso: new Date(createdAtBase + 37 * 24 * 60 * 60 * 1000).toISOString(),
      totalGrantUsdc: 25_000,
      milestoneCompleted: 1,
      milestoneTotal: 5,
      nextDeadlineIso: new Date(epoch + 14 * 60 * 60 * 1000).toISOString(),
      paymentMode: 'lump_sum',
      isStreamingActive: false,
      streamRateUsdcPerSec: 0,
      streamAccumulatedUsdcAtEpoch: 0,
      streamEpochMs: epoch,
      hasWarning: true,
      hasSlashed: false,
      tags: ['active', 'warning_issued'],
      milestones: [
        {
          index: 1,
          title: 'ZK Identity Oracle',
          description: 'Integrate identity oracle and proof verification pipeline.',
          amountUsdc: 5_000,
          deadlineIso: new Date(epoch - 8 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          proofType: 'ZK',
          zkProof: {
            proofHash: '0xabcdeffedcba00112233445566778899aabbccddeeff00112233445566778899' as `0x${string}`,
            prNumber: 88,
            mergeStatus: 'Merged',
            authorHandle: '@builder-b',
            verification: 'Verified',
            verifiedBlockNumber: 29391234,
          },
          aiVerdict: {
            badge: 'Pass',
            explanation:
              'Proof pipeline and contract wiring look consistent with the milestone spec. Verification receipts are present and reproducible.',
          },
          warningHistory: [],
          transactions: [],
        },
        {
          index: 2,
          title: 'Yield Aggregator Protocol',
          description: 'Implement deposit/withdraw flows and strategy routing.',
          amountUsdc: 10_000,
          deadlineIso: new Date(epoch + 14 * 60 * 60 * 1000).toISOString(),
          status: 'warning_issued',
          proofType: 'PR',
          zkProof: {
            proofHash: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' as `0x${string}`,
            prNumber: 89,
            mergeStatus: 'Open',
            authorHandle: '@builder-b',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Fail',
            explanation:
              'Submitted artifacts do not match the promised functionality and miss critical tests. Committee warning issued; builder must respond with complete deliverables.',
          },
          warningHistory: [
            {
              issuedAtIso: new Date(epoch - 3 * 60 * 60 * 1000).toISOString(),
              committeeMember: '0x1Ab43e5cF0123Ee9d8C4B2A0bE1FFcD12Aa9F022',
              message:
                'Your submission is incomplete. Provide full deliverables and tests within 24 hours or the milestone will be slashed.',
              attestationUrl: buildEasUrl(
                '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`,
              ),
            },
          ],
          transactions: [
            {
              kind: 'warning',
              txHash: '0x3b7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5' as `0x${string}`,
              txUrl: buildArbiscanTxUrl(
                '0x3b7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5' as `0x${string}`,
              ),
              timestampIso: new Date(epoch - 3 * 60 * 60 * 1000).toISOString(),
            },
          ],
        },
        {
          index: 3,
          title: 'Strategy Backtesting',
          description: 'Backtest strategies and publish performance report.',
          amountUsdc: 5_000,
          deadlineIso: new Date(epoch + 9 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          proofType: 'Manual',
          zkProof: {
            proofHash: '0x99990000aaaabbbbccccddddeeeeffff11112222333344445555666677778888' as `0x${string}`,
            prNumber: 0,
            mergeStatus: 'Open',
            authorHandle: '@builder-b',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Review',
            explanation:
              'Awaiting submission. Expect a reproducible notebook or report with methodology and datasets referenced.',
          },
          warningHistory: [],
          transactions: [],
        },
        {
          index: 4,
          title: 'Security Review',
          description: 'Internal security review and fixes.',
          amountUsdc: 3_000,
          deadlineIso: new Date(epoch + 16 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          proofType: 'PR',
          zkProof: {
            proofHash: '0x2222333344445555666677778888999900001111222233334444555566667777' as `0x${string}`,
            prNumber: 0,
            mergeStatus: 'Open',
            authorHandle: '@builder-b',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Review',
            explanation:
              'Awaiting submission. Expect PR with changes + audit notes + mitigations.',
          },
          warningHistory: [],
          transactions: [],
        },
        {
          index: 5,
          title: 'Mainnet Release',
          description: 'Deploy to mainnet, verify contracts, publish release notes.',
          amountUsdc: 2_000,
          deadlineIso: new Date(epoch + 28 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          proofType: 'Manual',
          zkProof: {
            proofHash: '0x7777888899990000aaaabbbbccccddddeeeeffff000011112222333344445555' as `0x${string}`,
            prNumber: 0,
            mergeStatus: 'Open',
            authorHandle: '@builder-b',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Review',
            explanation:
              'Awaiting submission. Expect deployment tx hashes + verified source + rollout checklist.',
          },
          warningHistory: [],
          transactions: [],
        },
      ],
    },
    {
      slug: '6102',
      displayId: '#GRT-6102',
      builder: '0x2F8a3C4D5E6F7a8B9C0D1E2F3a4B5C6D7E8F9a0B',
      zkVerified: false,
      contributionTier: 'Unranked',
      reputationScore: 12,
      createdAtIso: new Date(createdAtBase + 66 * 24 * 60 * 60 * 1000).toISOString(),
      totalGrantUsdc: 12_000,
      milestoneCompleted: 0,
      milestoneTotal: 3,
      nextDeadlineIso: null,
      paymentMode: 'lump_sum',
      isStreamingActive: false,
      streamRateUsdcPerSec: 0,
      streamAccumulatedUsdcAtEpoch: 0,
      streamEpochMs: epoch,
      hasWarning: false,
      hasSlashed: true,
      tags: ['slashed'],
      milestones: [
        {
          index: 1,
          title: 'Initial Delivery',
          description: 'Deliver MVP and minimal documentation.',
          amountUsdc: 4_000,
          deadlineIso: new Date(epoch - 31 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'slashed',
          proofType: 'Manual',
          zkProof: {
            proofHash: '0x0f0e0d0c0b0a09080706050403020100ffeeddccbbaa99887766554433221100' as `0x${string}`,
            prNumber: 0,
            mergeStatus: 'Closed',
            authorHandle: '@builder-c',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Fail',
            explanation:
              'Milestone missed deadline and lacked verifiable artifacts. Funds were recovered via slash to protect the treasury.',
          },
          warningHistory: [
            {
              issuedAtIso: new Date(epoch - 40 * 24 * 60 * 60 * 1000).toISOString(),
              committeeMember: '0x1Ab43e5cF0123Ee9d8C4B2A0bE1FFcD12Aa9F022',
              message:
                'Milestone overdue and no progress submitted. Provide verifiable deliverables or face slash.',
              attestationUrl: buildEasUrl(
                '0xbeadbeadbeadbeadbeadbeadbeadbeadbeadbeadbeadbeadbeadbeadbeadbead' as `0x${string}`,
              ),
            },
          ],
          transactions: [
            {
              kind: 'warning',
              txHash: '0x6f7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e' as `0x${string}`,
              txUrl: buildArbiscanTxUrl(
                '0x6f7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e' as `0x${string}`,
              ),
              timestampIso: new Date(epoch - 40 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              kind: 'slash',
              txHash: '0x7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f' as `0x${string}`,
              txUrl: buildArbiscanTxUrl(
                '0x7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f' as `0x${string}`,
              ),
              timestampIso: new Date(epoch - 39 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        },
        {
          index: 2,
          title: 'Follow-up',
          description: 'N/A — terminated by slash.',
          amountUsdc: 4_000,
          deadlineIso: new Date(epoch - 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'slashed',
          proofType: 'Manual',
          zkProof: {
            proofHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
            prNumber: 0,
            mergeStatus: 'Closed',
            authorHandle: '@builder-c',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Fail',
            explanation: 'Grant terminated.',
          },
          warningHistory: [],
          transactions: [],
        },
        {
          index: 3,
          title: 'Closeout',
          description: 'N/A — terminated by slash.',
          amountUsdc: 4_000,
          deadlineIso: new Date(epoch - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'slashed',
          proofType: 'Manual',
          zkProof: {
            proofHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
            prNumber: 0,
            mergeStatus: 'Closed',
            authorHandle: '@builder-c',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Fail',
            explanation: 'Grant terminated.',
          },
          warningHistory: [],
          transactions: [],
        },
      ],
    },
    {
      slug: '5400',
      displayId: '#GRT-5400',
      builder: '0x71C9a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9',
      zkVerified: true,
      contributionTier: 'Tier 3 Contributor',
      reputationScore: 91,
      createdAtIso: new Date(createdAtBase + 89 * 24 * 60 * 60 * 1000).toISOString(),
      totalGrantUsdc: 18_000,
      milestoneCompleted: 4,
      milestoneTotal: 4,
      nextDeadlineIso: null,
      paymentMode: 'lump_sum',
      isStreamingActive: false,
      streamRateUsdcPerSec: 0,
      streamAccumulatedUsdcAtEpoch: 0,
      streamEpochMs: epoch,
      hasWarning: false,
      hasSlashed: false,
      tags: ['completed'],
      milestones: [
        {
          index: 1,
          title: 'Milestone 1',
          description: 'Completed milestone.',
          amountUsdc: 4_500,
          deadlineIso: new Date(epoch - 80 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          proofType: 'PR',
          zkProof: {
            proofHash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as `0x${string}`,
            prNumber: 87,
            mergeStatus: 'Merged',
            authorHandle: '@builder-d',
            verification: 'Verified',
            verifiedBlockNumber: 29350000,
          },
          aiVerdict: {
            badge: 'Pass',
            explanation: 'Milestone completed successfully.',
          },
          warningHistory: [],
          transactions: [],
        },
        {
          index: 2,
          title: 'Milestone 2',
          description: 'Completed milestone.',
          amountUsdc: 4_500,
          deadlineIso: new Date(epoch - 60 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          proofType: 'PR',
          zkProof: {
            proofHash: '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' as `0x${string}`,
            prNumber: 90,
            mergeStatus: 'Merged',
            authorHandle: '@builder-d',
            verification: 'Verified',
            verifiedBlockNumber: 29360000,
          },
          aiVerdict: {
            badge: 'Pass',
            explanation: 'Milestone completed successfully.',
          },
          warningHistory: [],
          transactions: [],
        },
        {
          index: 3,
          title: 'Milestone 3',
          description: 'Completed milestone.',
          amountUsdc: 4_500,
          deadlineIso: new Date(epoch - 40 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          proofType: 'ZK',
          zkProof: {
            proofHash: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as `0x${string}`,
            prNumber: 91,
            mergeStatus: 'Merged',
            authorHandle: '@builder-d',
            verification: 'Verified',
            verifiedBlockNumber: 29370000,
          },
          aiVerdict: {
            badge: 'Pass',
            explanation: 'Milestone completed successfully.',
          },
          warningHistory: [],
          transactions: [],
        },
        {
          index: 4,
          title: 'Milestone 4',
          description: 'Completed milestone.',
          amountUsdc: 4_500,
          deadlineIso: new Date(epoch - 20 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          proofType: 'Manual',
          zkProof: {
            proofHash: '0x1234123412341234123412341234123412341234123412341234123412341234' as `0x${string}`,
            prNumber: 0,
            mergeStatus: 'Merged',
            authorHandle: '@builder-d',
            verification: 'Verified',
            verifiedBlockNumber: 29380000,
          },
          aiVerdict: {
            badge: 'Pass',
            explanation: 'Milestone completed successfully.',
          },
          warningHistory: [],
          transactions: [],
        },
      ],
    },
    {
      slug: '4201',
      displayId: '#GRT-4201',
      builder: '0xA1b2C3d4E5f6A7B8c9D0e1F2a3B4c5D6e7F8a9B0',
      zkVerified: true,
      contributionTier: 'Tier 2 Contributor',
      reputationScore: 78,
      createdAtIso: new Date(createdAtBase + 121 * 24 * 60 * 60 * 1000).toISOString(),
      totalGrantUsdc: 35_000,
      milestoneCompleted: 1,
      milestoneTotal: 3,
      nextDeadlineIso: new Date(epoch + 30 * 60 * 60 * 1000).toISOString(),
      paymentMode: 'streaming',
      isStreamingActive: true,
      streamRateUsdcPerSec: 0.000009,
      streamAccumulatedUsdcAtEpoch: 512.4,
      streamEpochMs: epoch - 20 * 60 * 1000,
      hasWarning: false,
      hasSlashed: false,
      tags: ['active', 'streaming'],
      milestones: [
        {
          index: 1,
          title: 'Protocol Spec',
          description: 'Write formal spec + reference implementation plan.',
          amountUsdc: 10_000,
          deadlineIso: new Date(epoch - 6 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          proofType: 'Manual',
          zkProof: {
            proofHash: '0x2468246824682468246824682468246824682468246824682468246824682468' as `0x${string}`,
            prNumber: 77,
            mergeStatus: 'Merged',
            authorHandle: '@builder-e',
            verification: 'Verified',
            verifiedBlockNumber: 29381111,
          },
          aiVerdict: {
            badge: 'Pass',
            explanation: 'Spec is complete and consistent with implementation plan.',
          },
          warningHistory: [],
          transactions: [],
        },
        {
          index: 2,
          title: 'Implementation',
          description: 'Build core protocol contracts and tests.',
          amountUsdc: 15_000,
          deadlineIso: new Date(epoch + 30 * 60 * 60 * 1000).toISOString(),
          status: 'overdue',
          proofType: 'PR',
          zkProof: {
            proofHash: '0x1357135713571357135713571357135713571357135713571357135713571357' as `0x${string}`,
            prNumber: 102,
            mergeStatus: 'Open',
            authorHandle: '@builder-e',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Review',
            explanation:
              'Deadline is close; ensure tests cover edge cases and contract verification is included.',
          },
          warningHistory: [],
          transactions: [],
        },
        {
          index: 3,
          title: 'Launch',
          description: 'Deploy and run monitoring.',
          amountUsdc: 10_000,
          deadlineIso: new Date(epoch + 16 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          proofType: 'Manual',
          zkProof: {
            proofHash: '0x9876987698769876987698769876987698769876987698769876987698769876' as `0x${string}`,
            prNumber: 0,
            mergeStatus: 'Open',
            authorHandle: '@builder-e',
            verification: 'Unverified',
          },
          aiVerdict: {
            badge: 'Review',
            explanation: 'Awaiting submission.',
          },
          warningHistory: [],
          transactions: [],
        },
      ],
    },
    {
      slug: '3300',
      displayId: '#GRT-3300',
      builder: '0xB2c3D4e5F6a7B8C9d0E1f2A3b4C5d6E7f8A9b0C1',
      zkVerified: true,
      contributionTier: 'Tier 1 Contributor',
      reputationScore: 88,
      createdAtIso: new Date(createdAtBase + 152 * 24 * 60 * 60 * 1000).toISOString(),
      totalGrantUsdc: 60_000,
      milestoneCompleted: 2,
      milestoneTotal: 6,
      nextDeadlineIso: new Date(epoch + 36 * 60 * 60 * 1000).toISOString(),
      paymentMode: 'lump_sum',
      isStreamingActive: false,
      streamRateUsdcPerSec: 0,
      streamAccumulatedUsdcAtEpoch: 0,
      streamEpochMs: epoch,
      hasWarning: false,
      hasSlashed: false,
      tags: ['active'],
      milestones: Array.from({ length: 6 }).map((_, i) => ({
        index: i + 1,
        title: `Milestone ${i + 1}`,
        description: 'Milestone details (demo).',
        amountUsdc: 10_000,
        deadlineIso: new Date(epoch + (i + 2) * 24 * 60 * 60 * 1000).toISOString(),
        status: i < 2 ? 'approved' : 'pending',
        proofType: 'PR',
        zkProof: {
          proofHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
          prNumber: 40 + i,
          mergeStatus: i < 2 ? 'Merged' : 'Open',
          authorHandle: '@builder-f',
          verification: i < 2 ? 'Verified' : 'Unverified',
          verifiedBlockNumber: i < 2 ? 29370000 + i : undefined,
        },
        aiVerdict: {
          badge: i < 2 ? 'Pass' : 'Review',
          explanation: i < 2 ? 'Approved.' : 'Awaiting submission.',
        },
        warningHistory: [],
        transactions: [],
      })),
    },
  ];

  const slashBump = pollTick * 127.43;
  const zkBump = pollTick * 3;

  const hero: DaoHeroStatsModel = {
    totalUsdcLocked: 4_250_809,
    activeGrants: 186,
    milestonesDueThisWeek: 42,
    totalReleasedThisMonth: 120_043,
    liveSlashCounterUsdc: 48_144.19 + slashBump,
    totalZkProofsVerified: 8_944 + zkBump,
  };

  return { hero, grants };
}

export function letterGradeFromScore(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 82) return 'A-';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function gradeTone(score: number): 'emerald' | 'amber' | 'orange' | 'red' {
  if (score >= 80) return 'emerald';
  if (score >= 70) return 'amber';
  if (score >= 50) return 'orange';
  return 'red';
}

/** Hours until deadline; negative if past */
export function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (60 * 60 * 1000);
}

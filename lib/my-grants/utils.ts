import type { DaoGrantCardModel, DaoMilestoneModel } from '@/demo/dao-dashboard';
import type {
  MyGrantFilterPill,
  MyGrantFilterTag,
  MyGrantFinalStatus,
  MyGrantMilestone,
  MyGrantMilestoneStatus,
  MyGrantRecord,
  MyGrantSortOption,
  MyGrantsSummary,
  MonthlyEarningsPoint,
  MyGrantEarningsRow,
} from '@/lib/my-grants/types';
import { USDC_DECIMALS } from '@/lib/usdc';
import { formatUnits, type Address } from 'viem';

const MILESTONE_PENDING = 0;
const MILESTONE_APPROVED_LIKE = new Set([3, 4, 5]);
const MILESTONE_SLASHED = 6;

export function formatUsdcAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatUsdcCompact(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return formatUsdcAmount(value);
}

function usdcFromWei(w: bigint): number {
  return Number(formatUnits(w, USDC_DECIMALS));
}

function proofTypeLabel(proofType: number | string): string {
  if (proofType === 0 || proofType === 'ZK') return 'ZK Proof';
  if (proofType === 1 || proofType === 'PR') return 'Github Commits';
  return 'Manual / On-chain';
}

function mapDemoMilestoneStatus(m: DaoMilestoneModel, streaming: boolean): MyGrantMilestoneStatus {
  if (m.status === 'approved') return 'approved';
  if (m.status === 'slashed') return 'slashed';
  if (m.status === 'warning_issued') return 'warning_issued';
  if (m.status === 'overdue' && streaming) return 'streaming';
  if (m.status === 'overdue') return 'overdue';
  if (streaming && m.status === 'pending') return 'streaming';
  return 'pending';
}

function deriveFinalStatus(
  milestones: MyGrantMilestone[],
  hasWarning: boolean,
  hasSlashed: boolean,
): MyGrantFinalStatus {
  const slashedCount = milestones.filter((m) => m.status === 'slashed').length;
  if (slashedCount === milestones.length && milestones.length > 0) return 'Fully Slashed';
  if (slashedCount > 0) return 'Partially Slashed';
  if (hasWarning || milestones.some((m) => m.status === 'warning_issued')) return 'Warning Issued';
  const allApproved =
    milestones.length > 0 && milestones.every((m) => m.status === 'approved');
  if (allApproved) return 'Completed';
  return 'Active';
}

function deriveFilterTags(
  finalStatus: MyGrantFinalStatus,
  streaming: boolean,
): MyGrantFilterTag[] {
  const tags: MyGrantFilterTag[] = [];
  if (finalStatus === 'Active' || finalStatus === 'Warning Issued') tags.push('active');
  if (finalStatus === 'Completed') tags.push('completed');
  if (finalStatus === 'Partially Slashed' || finalStatus === 'Fully Slashed') tags.push('slashed');
  if (finalStatus === 'Warning Issued') tags.push('warning_issued');
  if (streaming) tags.push('streaming');
  return tags;
}

export function mapDemoGrantToRecord(card: DaoGrantCardModel): MyGrantRecord {
  const milestones: MyGrantMilestone[] = card.milestones.map((m) => ({
    index: m.index,
    title: m.title,
    status: mapDemoMilestoneStatus(m, card.isStreamingActive),
    amountUsdc: m.amountUsdc,
    deadlineMs: new Date(m.deadlineIso).getTime(),
    proofTypeLabel: proofTypeLabel(m.proofType),
  }));

  const releasedUsdc = card.milestones
    .filter((m) => m.status === 'approved')
    .reduce((s, m) => s + m.amountUsdc, 0);
  const forfeitedUsdc = card.milestones
    .filter((m) => m.status === 'slashed')
    .reduce((s, m) => s + m.amountUsdc, 0);

  const finalStatus = deriveFinalStatus(milestones, card.hasWarning, card.hasSlashed);
  const filterTags = deriveFilterTags(finalStatus, card.isStreamingActive);

  const finalDeadlineMs = Math.max(
    ...card.milestones.map((m) => new Date(m.deadlineIso).getTime()),
    new Date(card.createdAtIso).getTime(),
  );

  const zkProofsSubmitted = card.milestones.filter(
    (m) => m.proofType === 'ZK' && m.status !== 'pending',
  ).length;

  return {
    key: `demo-${card.slug}`,
    grantId: card.displayId.replace(/^#/, ''),
    pathSegment: card.slug,
    title: card.milestones[0]?.title ?? `Grant ${card.displayId}`,
    daoName: 'Arbitrum Foundation DAO',
    committeeCount: 5,
    committeeAddresses: [],
    createdAtMs: new Date(card.createdAtIso).getTime(),
    finalDeadlineMs,
    totalUsdc: card.totalGrantUsdc,
    releasedUsdc,
    forfeitedUsdc,
    paymentMode: card.paymentMode,
    paymentLabel: card.paymentMode === 'streaming' ? 'Sablier Stream' : 'Lump-Sum Escrow',
    finalStatus,
    filterTags,
    milestonesCompleted: card.milestoneCompleted,
    milestonesTotal: card.milestoneTotal,
    zkProofsSubmitted,
    isStreamingActive: card.isStreamingActive,
    streamRateUsdcPerSec: card.streamRateUsdcPerSec,
    streamAccumulatedUsdcAtEpoch: card.streamAccumulatedUsdcAtEpoch,
    streamEpochMs: card.streamEpochMs,
    milestones,
    source: 'demo',
  };
}

type ChainMilestoneInput = {
  title: string;
  amount: bigint;
  deadline: bigint;
  proofType: number;
};

export function mapChainGrantToRecord(
  id: bigint,
  grant: {
    builder: Address;
    streaming: boolean;
    committee: Address[];
    createdAt: bigint;
    milestones: ChainMilestoneInput[];
  },
  statuses: number[],
): MyGrantRecord {
  const milestones: MyGrantMilestone[] = grant.milestones.map((m, i) => {
    const st = statuses[i] ?? MILESTONE_PENDING;
    let status: MyGrantMilestoneStatus = 'pending';
    if (MILESTONE_APPROVED_LIKE.has(st)) status = 'approved';
    else if (st === MILESTONE_SLASHED) status = 'slashed';
    else if (grant.streaming && st === MILESTONE_PENDING) status = 'streaming';

    return {
      index: i + 1,
      title: m.title || `Milestone ${i + 1}`,
      status,
      amountUsdc: usdcFromWei(m.amount),
      deadlineMs: Number(m.deadline) > 0 ? Number(m.deadline) * 1000 : Date.now(),
      proofTypeLabel: proofTypeLabel(m.proofType),
    };
  });

  const totalUsdc = milestones.reduce((s, m) => s + m.amountUsdc, 0);
  const releasedUsdc = milestones
    .filter((m) => m.status === 'approved')
    .reduce((s, m) => s + m.amountUsdc, 0);
  const forfeitedUsdc = milestones
    .filter((m) => m.status === 'slashed')
    .reduce((s, m) => s + m.amountUsdc, 0);

  const milestonesCompleted = milestones.filter((m) => m.status === 'approved').length;
  const hasSlashed = milestones.some((m) => m.status === 'slashed');
  const finalStatus = deriveFinalStatus(milestones, false, hasSlashed);
  const filterTags = deriveFilterTags(finalStatus, grant.streaming);

  const finalDeadlineMs = Math.max(
    ...milestones.map((m) => m.deadlineMs),
    Number(grant.createdAt) > 0 ? Number(grant.createdAt) * 1000 : Date.now(),
  );

  const zkProofsSubmitted = grant.milestones.filter(
    (m, i) => m.proofType === 0 && statuses[i] !== MILESTONE_PENDING,
  ).length;

  return {
    key: `chain-${id.toString()}`,
    grantId: `GRT-${id.toString()}`,
    pathSegment: id.toString(),
    title: grant.milestones[0]?.title ?? `Grant ${id.toString()}`,
    daoName: 'On-chain Committee',
    committeeCount: grant.committee.length,
    committeeAddresses: grant.committee.map((a) => a.toLowerCase()),
    createdAtMs: Number(grant.createdAt) > 0 ? Number(grant.createdAt) * 1000 : Date.now(),
    finalDeadlineMs,
    totalUsdc: Math.round(totalUsdc * 100) / 100,
    releasedUsdc: Math.round(releasedUsdc * 100) / 100,
    forfeitedUsdc: Math.round(forfeitedUsdc * 100) / 100,
    paymentMode: grant.streaming ? 'streaming' : 'lump_sum',
    paymentLabel: grant.streaming ? 'Sablier Stream' : 'Lump-Sum Escrow',
    finalStatus,
    filterTags,
    milestonesCompleted,
    milestonesTotal: milestones.length,
    zkProofsSubmitted,
    isStreamingActive: grant.streaming,
    streamRateUsdcPerSec: grant.streaming ? 0.0003 : 0,
    streamAccumulatedUsdcAtEpoch: grant.streaming ? releasedUsdc : 0,
    streamEpochMs: Date.now() - 45 * 60 * 1000,
    milestones,
    source: 'chain',
  };
}

export function computeSummary(grants: MyGrantRecord[]): MyGrantsSummary {
  return {
    totalGrants: grants.length,
    activeGrants: grants.filter((g) => g.filterTags.includes('active')).length,
    completedGrants: grants.filter((g) => g.finalStatus === 'Completed').length,
    totalUsdcEarned: Math.round(grants.reduce((s, g) => s + g.releasedUsdc, 0) * 100) / 100,
    totalUsdcForfeited: Math.round(grants.reduce((s, g) => s + g.forfeitedUsdc, 0) * 100) / 100,
  };
}

export function filterGrants(
  grants: MyGrantRecord[],
  pills: Set<MyGrantFilterPill>,
  query: string,
): MyGrantRecord[] {
  const q = query.trim().toLowerCase();
  return grants.filter((g) => {
    if (!pills.has('all') && pills.size > 0) {
      const match =
        (pills.has('active') && g.filterTags.includes('active')) ||
        (pills.has('completed') && g.filterTags.includes('completed')) ||
        (pills.has('slashed') && g.filterTags.includes('slashed')) ||
        (pills.has('warning_issued') && g.filterTags.includes('warning_issued')) ||
        (pills.has('streaming') && g.filterTags.includes('streaming'));
      if (!match) return false;
    }
    if (!q) return true;
    if (g.grantId.toLowerCase().includes(q)) return true;
    if (g.daoName.toLowerCase().includes(q)) return true;
    return g.committeeAddresses.some((a) => a.includes(q));
  });
}

export function sortGrants(grants: MyGrantRecord[], sort: MyGrantSortOption): MyGrantRecord[] {
  const copy = [...grants];
  switch (sort) {
    case 'oldest':
      return copy.sort((a, b) => a.createdAtMs - b.createdAtMs);
    case 'highest_value':
      return copy.sort((a, b) => b.totalUsdc - a.totalUsdc);
    case 'most_milestones':
      return copy.sort((a, b) => b.milestonesTotal - a.milestonesTotal);
    case 'newest':
    default:
      return copy.sort((a, b) => b.createdAtMs - a.createdAtMs);
  }
}

export function computeStreamTotal(grant: MyGrantRecord): number {
  if (!grant.isStreamingActive) return grant.streamAccumulatedUsdcAtEpoch;
  const elapsed = (Date.now() - grant.streamEpochMs) / 1000;
  return grant.streamAccumulatedUsdcAtEpoch + elapsed * grant.streamRateUsdcPerSec;
}

export function buildMonthlyEarnings(grants: MyGrantRecord[]): MonthlyEarningsPoint[] {
  const byMonth = new Map<string, number>();
  for (const g of grants) {
    for (const m of g.milestones) {
      if (m.status !== 'approved') continue;
      const d = new Date(m.deadlineMs);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + m.amountUsdc);
    }
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, earned]) => {
      const [y, mo] = monthKey.split('-');
      const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString(undefined, {
        month: 'short',
        year: '2-digit',
      });
      return { monthKey, label, earned: Math.round(earned * 100) / 100 };
    });
}

export function buildEarningsByGrant(grants: MyGrantRecord[]): MyGrantEarningsRow[] {
  return grants.map((g) => {
    const approved = g.milestones.filter((m) => m.status === 'approved').length;
    const nonPending = g.milestones.filter((m) => m.status !== 'pending').length;
    return {
      grantId: g.grantId,
      totalEarned: g.releasedUsdc,
      totalForfeited: g.forfeitedUsdc,
      netEarnings: Math.round((g.releasedUsdc - g.forfeitedUsdc) * 100) / 100,
      deliveryRatePercent:
        nonPending > 0 ? Math.round((approved / nonPending) * 1000) / 10 : null,
    };
  });
}

export function statusBadgeClass(status: MyGrantFinalStatus): string {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100';
    case 'Active':
      return 'bg-sky-50 text-sky-800 ring-1 ring-sky-100';
    case 'Warning Issued':
      return 'bg-amber-50 text-amber-900 ring-1 ring-amber-100';
    case 'Partially Slashed':
    case 'Fully Slashed':
      return 'bg-red-50 text-red-800 ring-1 ring-red-100';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function milestoneBadgeClass(status: MyGrantMilestoneStatus): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700';
    case 'streaming':
      return 'bg-sky-50 text-sky-800';
    case 'slashed':
      return 'bg-red-50 text-red-700';
    case 'warning_issued':
      return 'bg-amber-50 text-amber-800';
    case 'overdue':
      return 'bg-orange-50 text-orange-800';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

'use client';

import { getDaoDashboardSnapshot } from '@/demo/dao-dashboard';

/**
 * Treasury Command Center — typed shapes + a demo snapshot generator.
 *
 * Production wiring: replace `getTreasurySnapshot` with a single
 * `useReadContracts` batch over `GrantEscrow.getTreasuryHistory`,
 * `getProjectedCommitments`, and `getEscrowBreakdown`. Shapes here
 * mirror the contract structs declared in the PRD.
 */

export type TreasuryTimeRange = '7D' | '30D' | '90D' | '12M' | 'ALL';

export type TreasuryEventKind =
  | 'grant_created'
  | 'milestone_approved'
  | 'stream_started'
  | 'stream_cancelled'
  | 'milestone_slashed';

export type TreasuryActivityFilter = 'all' | 'locked' | 'released' | 'streaming' | 'slashed';

export type TreasuryEvent = {
  id: string;
  kind: TreasuryEventKind;
  /** Plain-English label, ready for screen readers + tables. */
  description: string;
  /** Signed amount (USDC). Positive when locked into escrow, negative when released. */
  amountUsdc: number;
  grantId: string;
  /** URL segment for `/dao/grants/[slug]` — must match `demo/dao-dashboard` catalogue. */
  pathSegment: string;
  /** ms epoch */
  timestampMs: number;
  txHash: `0x${string}`;
  txUrl: string;
};

export type EscrowRow = {
  grantId: string;
  /** URL segment for grant detail (`demo/dao-dashboard` slug). */
  pathSegment: string;
  builder: `0x${string}`;
  zkVerified: boolean;
  totalEscrowedUsdc: number;
  releasedUsdc: number;
  remainingUsdc: number;
  paymentMode: 'streaming' | 'lump_sum';
  /** Next pending milestone deadline (ms epoch); null if none */
  nextDeadlineMs: number | null;
  riskLevel: EscrowRisk;
  /** Computed flow rate when streaming (USDC/sec). */
  streamRateUsdcPerSec: number;
  streamAccumulatedUsdcAtEpoch: number;
  streamEpochMs: number;
  isStreaming: boolean;
};

export type EscrowRisk = 'healthy' | 'watch' | 'at_risk' | 'critical';

export type SlashRow = {
  id: string;
  grantId: string;
  builder: `0x${string}`;
  milestoneTitle: string;
  amountUsdc: number;
  slashedAtMs: number;
  warningIssuedAtMs: number;
  txHash: `0x${string}`;
  txUrl: string;
};

export type StreamRow = {
  grantId: string;
  builder: `0x${string}`;
  flowRateUsdcPerSec: number;
  totalStreamedUsdcAtEpoch: number;
  streamEpochMs: number;
  startedAtMs: number;
  nextDeadlineMs: number | null;
};

export type CashFlowPoint = {
  /** Bucket label as shown on the X axis (e.g. "Jan", "W2", "May 03"). */
  label: string;
  bucketMs: number;
  locked: number;
  released: number;
  recovered: number;
  grantCount: number;
};

export type ProjectedCommitments = {
  totalIfApprovedUsdc: number;
  thisMonthUsdc: number;
  nextMonthUsdc: number;
  /** Six monthly buckets ahead. */
  upcoming: { label: string; bucketMs: number; usdc: number }[];
};

export type SparkPoint = { x: number; y: number };

export type TreasuryHero = {
  totalUsdcLocked: number;
  totalReleasedAllTime: number;
  totalRecoveredViaSlashing: number;
  /** USDC/sec across all active flows (Superfluid). */
  currentlyStreamingFlowRate: number;
  totalGrantsCreated: number;
  averageGrantSizeUsdc: number;
  /** Per-card 30D sparkline series (relative units). */
  sparks: {
    locked: SparkPoint[];
    released: SparkPoint[];
    recovered: SparkPoint[];
    streaming: SparkPoint[];
    grants: SparkPoint[];
    avgSize: SparkPoint[];
  };
  /** Percent change vs start of 30D window — used for trend chips. */
  delta: {
    locked: number;
    released: number;
    recovered: number;
    streaming: number;
    grants: number;
    avgSize: number;
  };
};

export type TreasurySnapshot = {
  hero: TreasuryHero;
  cashFlow: Record<TreasuryTimeRange, CashFlowPoint[]>;
  escrow: EscrowRow[];
  streams: StreamRow[];
  slashes: SlashRow[];
  projections: ProjectedCommitments;
  /** Sorted newest-first. */
  activity: TreasuryEvent[];
};

const MS_DAY = 24 * 60 * 60 * 1000;

function arbiscanTx(hash: `0x${string}`): string {
  return `https://sepolia.arbiscan.io/tx/${hash}`;
}

function buildSpark(seed: number, drift: 'up' | 'down' | 'flat', points = 30): SparkPoint[] {
  // Deterministic pseudo-random walk for stable demo charts.
  let v = 50 + (seed % 17);
  const out: SparkPoint[] = [];
  for (let i = 0; i < points; i++) {
    const noise = ((seed * (i + 1)) % 13) - 6;
    const trend = drift === 'up' ? 0.9 : drift === 'down' ? -0.6 : 0;
    v = Math.max(2, v + noise * 0.4 + trend);
    out.push({ x: i, y: Number(v.toFixed(2)) });
  }
  return out;
}

function monthLabels(end: Date, count: number): { label: string; date: Date }[] {
  const out: { label: string; date: Date }[] = [];
  const cursor = new Date(end.getFullYear(), end.getMonth(), 1);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    out.push({
      label: d.toLocaleDateString(undefined, { month: 'short' }),
      date: d,
    });
  }
  return out;
}

function dailyLabels(end: Date, count: number): { label: string; date: Date }[] {
  const out: { label: string; date: Date }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * MS_DAY);
    out.push({
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      date: d,
    });
  }
  return out;
}

function weeklyLabels(end: Date, count: number): { label: string; date: Date }[] {
  const out: { label: string; date: Date }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 7 * MS_DAY);
    out.push({
      label: `W${count - i}`,
      date: d,
    });
  }
  return out;
}

function buildCashFlowSeries(
  range: TreasuryTimeRange,
  end: Date,
  seed: number,
): CashFlowPoint[] {
  const buckets = (() => {
    if (range === '7D') return dailyLabels(end, 7);
    if (range === '30D') return dailyLabels(end, 30);
    if (range === '90D') return weeklyLabels(end, 13);
    if (range === '12M') return monthLabels(end, 12);
    return monthLabels(end, 18);
  })();

  return buckets.map((b, i) => {
    const wave = Math.sin((i / buckets.length) * Math.PI * 2 + (seed % 7));
    const ramp = i / Math.max(1, buckets.length - 1);
    const lockedBase = 90_000 + 40_000 * ramp + 35_000 * Math.abs(wave);
    const releasedBase = 60_000 + 30_000 * ramp + 28_000 * Math.abs(Math.cos(i + seed));
    const recoveredBase = 4_000 + 12_000 * Math.abs(Math.sin(i / 2 + seed));
    const grantCount = 4 + Math.round(Math.abs(wave) * 6);
    return {
      label: b.label,
      bucketMs: b.date.getTime(),
      locked: Math.round(lockedBase),
      released: Math.round(releasedBase),
      recovered: Math.round(recoveredBase),
      grantCount,
    };
  });
}

function deriveEscrowFromGrants(): EscrowRow[] {
  const dao = getDaoDashboardSnapshot(0);
  const now = Date.now();
  const rows: EscrowRow[] = dao.grants.map((g) => {
    const released =
      g.milestones
        .filter((m) => m.status === 'approved')
        .reduce((s, m) => s + m.amountUsdc, 0) +
      (g.isStreamingActive ? g.streamAccumulatedUsdcAtEpoch : 0);
    const remaining = Math.max(0, g.totalGrantUsdc - released);
    const nextPending = g.milestones.find((m) => m.status === 'pending' || m.status === 'overdue');
    const nextDeadlineMs = nextPending ? new Date(nextPending.deadlineIso).getTime() : null;
    const overdue = !!g.milestones.find((m) => m.status === 'overdue');
    const slashPending = !!g.milestones.find(
      (m) => m.status === 'warning_issued' || m.status === 'slashed',
    );
    const dueSoon =
      nextDeadlineMs != null &&
      nextDeadlineMs - now > 0 &&
      nextDeadlineMs - now <= 7 * MS_DAY;
    let riskLevel: EscrowRisk = 'healthy';
    if (slashPending || g.hasSlashed || g.hasWarning) riskLevel = 'critical';
    else if (overdue) riskLevel = 'at_risk';
    else if (dueSoon) riskLevel = 'watch';

    return {
      grantId: g.displayId.replace('#', ''),
      pathSegment: g.slug,
      builder: g.builder,
      zkVerified: g.zkVerified,
      totalEscrowedUsdc: g.totalGrantUsdc,
      releasedUsdc: Math.round(released),
      remainingUsdc: Math.round(remaining),
      paymentMode: g.paymentMode,
      nextDeadlineMs,
      riskLevel,
      streamRateUsdcPerSec: g.streamRateUsdcPerSec,
      streamAccumulatedUsdcAtEpoch: g.streamAccumulatedUsdcAtEpoch,
      streamEpochMs: g.streamEpochMs,
      isStreaming: g.isStreamingActive,
    };
  });

  // Add a few additional synthetic rows so the table is dense + matches design.
  const synthetic: EscrowRow[] = [
    {
      grantId: 'GRT-8692',
      pathSegment: '8692',
      builder: '0x4A2bC9d8E5F6071c829AbCdef01234567890aB12',
      zkVerified: true,
      totalEscrowedUsdc: 50_000,
      releasedUsdc: 25_000,
      remainingUsdc: 25_000,
      paymentMode: 'lump_sum',
      nextDeadlineMs: now + 18 * MS_DAY,
      riskLevel: 'healthy',
      streamRateUsdcPerSec: 0,
      streamAccumulatedUsdcAtEpoch: 0,
      streamEpochMs: now,
      isStreaming: false,
    },
    {
      grantId: 'GRT-7731',
      pathSegment: '7731',
      builder: '0x9b0CcAa11dEef234bC56789af9012345678abc44',
      zkVerified: true,
      totalEscrowedUsdc: 120_000,
      releasedUsdc: 10_000,
      remainingUsdc: 110_000,
      paymentMode: 'streaming',
      nextDeadlineMs: now + 5 * MS_DAY,
      riskLevel: 'watch',
      streamRateUsdcPerSec: 0.005,
      streamAccumulatedUsdcAtEpoch: 10_452.33,
      streamEpochMs: now - 12 * 60 * 1000,
      isStreaming: true,
    },
    {
      grantId: 'GRT-6102',
      pathSegment: '6102',
      builder: '0x113cE1A22BAC987654321FED0123456789aA22Cc',
      zkVerified: false,
      totalEscrowedUsdc: 15_000,
      releasedUsdc: 15_000,
      remainingUsdc: 0,
      paymentMode: 'lump_sum',
      nextDeadlineMs: now - 2 * MS_DAY,
      riskLevel: 'critical',
      streamRateUsdcPerSec: 0,
      streamAccumulatedUsdcAtEpoch: 0,
      streamEpochMs: now,
      isStreaming: false,
    },
    {
      grantId: 'GRT-5400',
      pathSegment: '5400',
      builder: '0x71fa5C8B3a01dE8f9013C4dDEf8123456789A0bb',
      zkVerified: true,
      totalEscrowedUsdc: 38_000,
      releasedUsdc: 9_000,
      remainingUsdc: 29_000,
      paymentMode: 'streaming',
      nextDeadlineMs: now + 11 * MS_DAY,
      riskLevel: 'healthy',
      streamRateUsdcPerSec: 0.001,
      streamAccumulatedUsdcAtEpoch: 2_104.5,
      streamEpochMs: now - 6 * 60 * 1000,
      isStreaming: true,
    },
  ];

  return [...synthetic, ...rows];
}

function buildStreams(rows: EscrowRow[]): StreamRow[] {
  return rows
    .filter((r) => r.isStreaming && r.streamRateUsdcPerSec > 0)
    .map((r) => ({
      grantId: r.grantId,
      builder: r.builder,
      flowRateUsdcPerSec: r.streamRateUsdcPerSec,
      totalStreamedUsdcAtEpoch: r.streamAccumulatedUsdcAtEpoch,
      streamEpochMs: r.streamEpochMs,
      startedAtMs: r.streamEpochMs - 7 * MS_DAY,
      nextDeadlineMs: r.nextDeadlineMs,
    }));
}

function buildSlashes(): SlashRow[] {
  const now = Date.now();
  return [
    {
      id: 'slash-0842',
      grantId: 'GRT-0842',
      builder: '0x2F8a3C4D5E6F7a8B9C0D1E2F3a4B5C6D7E8F9a0B',
      milestoneTitle: 'Initial Delivery',
      amountUsdc: 45_000,
      slashedAtMs: new Date('2023-10-12T10:00:00Z').getTime(),
      warningIssuedAtMs: new Date('2023-10-08T10:00:00Z').getTime(),
      txHash: '0x6f7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e' as `0x${string}`,
      txUrl: arbiscanTx(
        '0x6f7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e' as `0x${string}`,
      ),
    },
    {
      id: 'slash-0711',
      grantId: 'GRT-0711',
      builder: '0xA1b2C3d4E5f6A7B8c9D0e1F2a3B4c5D6e7F8a9B0',
      milestoneTitle: 'Audit Remediation',
      amountUsdc: 12_500,
      slashedAtMs: new Date('2023-09-04T10:00:00Z').getTime(),
      warningIssuedAtMs: new Date('2023-08-31T10:00:00Z').getTime(),
      txHash: '0x7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f' as `0x${string}`,
      txUrl: arbiscanTx(
        '0x7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f' as `0x${string}`,
      ),
    },
    {
      id: 'slash-0623',
      grantId: 'GRT-0623',
      builder: '0xB2c3D4e5F6a7B8C9d0E1f2A3b4C5d6E7f8A9b0C1',
      milestoneTitle: 'Strategy Backtesting',
      amountUsdc: 28_000,
      slashedAtMs: now - 96 * MS_DAY,
      warningIssuedAtMs: now - 102 * MS_DAY,
      txHash: '0x3b7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5' as `0x${string}`,
      txUrl: arbiscanTx(
        '0x3b7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5' as `0x${string}`,
      ),
    },
    {
      id: 'slash-0511',
      grantId: 'GRT-0511',
      builder: '0x71C9a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9',
      milestoneTitle: 'Mainnet Launch',
      amountUsdc: 57_000,
      slashedAtMs: now - 142 * MS_DAY,
      warningIssuedAtMs: now - 149 * MS_DAY,
      txHash: '0x9c2fd9a2c6d4c4adf8b1d2a9b6b2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f7a8b9' as `0x${string}`,
      txUrl: arbiscanTx(
        '0x9c2fd9a2c6d4c4adf8b1d2a9b6b2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f7a8b9' as `0x${string}`,
      ),
    },
  ];
}

function buildProjections(): ProjectedCommitments {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const upcoming: { label: string; bucketMs: number; usdc: number }[] = [];
  const seed = 9;
  for (let i = 0; i < 6; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const wave = Math.abs(Math.sin(i + seed));
    const usdc = Math.round(80_000 + wave * 70_000 + (i === 0 ? 124_500 : 0));
    upcoming.push({
      label: d.toLocaleDateString(undefined, { month: 'short' }),
      bucketMs: d.getTime(),
      usdc,
    });
  }
  return {
    totalIfApprovedUsdc: upcoming.reduce((s, p) => s + p.usdc, 0),
    thisMonthUsdc: 124_500,
    nextMonthUsdc: 89_200,
    upcoming,
  };
}

function buildActivity(): TreasuryEvent[] {
  const now = Date.now();
  const txA = '0x9c2fd9a2c6d4c4adf8b1d2a9b6b2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f7a8b9' as `0x${string}`;
  const txB = '0x3b7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5' as `0x${string}`;
  const txC = '0x6f7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e' as `0x${string}`;
  const txD = '0x2d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f7a8b99c2fd9a2' as `0x${string}`;
  const txE = '0x0e90c9d1b2a3c4d5e6f7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e' as `0x${string}`;
  const txF = '0x7a8b99c2fd9a22d9a10c6e4b3a9f8d1c2b14e2e4a6f4e0e90c9d1b2a3c4d5e6f' as `0x${string}`;
  const txG = '0x1357135713571357135713571357135713571357135713571357135713571357' as `0x${string}`;
  const txH = '0xabcdeffedcba00112233445566778899aabbccddeeff00112233445566778899' as `0x${string}`;

  const seed: TreasuryEvent[] = [
    {
      id: 'act-0001',
      kind: 'milestone_approved',
      description: 'Milestone Released',
      amountUsdc: 25_000,
      grantId: 'GRT-8692',
      pathSegment: '8692',
      timestampMs: now - 2 * 60 * 1000,
      txHash: txA,
      txUrl: arbiscanTx(txA),
    },
    {
      id: 'act-0002',
      kind: 'grant_created',
      description: 'Funds Escrowed',
      amountUsdc: -15_000,
      grantId: 'GRT-5400',
      pathSegment: '5400',
      timestampMs: now - 60 * 60 * 1000,
      txHash: txB,
      txUrl: arbiscanTx(txB),
    },
    {
      id: 'act-0003',
      kind: 'milestone_slashed',
      description: 'Funds Slashed',
      amountUsdc: 45_000,
      grantId: 'GRT-4201',
      pathSegment: '4201',
      timestampMs: now - 23 * 60 * 60 * 1000,
      txHash: txC,
      txUrl: arbiscanTx(txC),
    },
    {
      id: 'act-0004',
      kind: 'stream_started',
      description: 'Stream Started',
      amountUsdc: 0,
      grantId: 'GRT-7731',
      pathSegment: '7731',
      timestampMs: now - 2 * 24 * 60 * 60 * 1000,
      txHash: txD,
      txUrl: arbiscanTx(txD),
    },
    {
      id: 'act-0005',
      kind: 'stream_cancelled',
      description: 'Stream Cancelled',
      amountUsdc: 0,
      grantId: 'GRT-3300',
      pathSegment: '3300',
      timestampMs: now - 4 * 24 * 60 * 60 * 1000,
      txHash: txE,
      txUrl: arbiscanTx(txE),
    },
    {
      id: 'act-0006',
      kind: 'grant_created',
      description: 'Grant Created',
      amountUsdc: -50_000,
      grantId: 'GRT-8692',
      pathSegment: '8692',
      timestampMs: now - 9 * 24 * 60 * 60 * 1000,
      txHash: txF,
      txUrl: arbiscanTx(txF),
    },
    {
      id: 'act-0007',
      kind: 'milestone_approved',
      description: 'Milestone Released',
      amountUsdc: 10_000,
      grantId: 'GRT-7731',
      pathSegment: '7731',
      timestampMs: now - 14 * 24 * 60 * 60 * 1000,
      txHash: txG,
      txUrl: arbiscanTx(txG),
    },
    {
      id: 'act-0008',
      kind: 'milestone_slashed',
      description: 'Funds Slashed',
      amountUsdc: 12_500,
      grantId: 'GRT-4201',
      pathSegment: '4201',
      timestampMs: now - 32 * 24 * 60 * 60 * 1000,
      txHash: txH,
      txUrl: arbiscanTx(txH),
    },
    {
      id: 'act-0009',
      kind: 'grant_created',
      description: 'Grant Created',
      amountUsdc: -120_000,
      grantId: 'GRT-7731',
      pathSegment: '7731',
      timestampMs: now - 45 * 24 * 60 * 60 * 1000,
      txHash: txA,
      txUrl: arbiscanTx(txA),
    },
    {
      id: 'act-0010',
      kind: 'milestone_approved',
      description: 'Milestone Released',
      amountUsdc: 8_500,
      grantId: 'GRT-6102',
      pathSegment: '6102',
      timestampMs: now - 78 * 24 * 60 * 60 * 1000,
      txHash: txB,
      txUrl: arbiscanTx(txB),
    },
    {
      id: 'act-0011',
      kind: 'stream_started',
      description: 'Stream Started',
      amountUsdc: 0,
      grantId: 'GRT-5400',
      pathSegment: '5400',
      timestampMs: now - 96 * 24 * 60 * 60 * 1000,
      txHash: txC,
      txUrl: arbiscanTx(txC),
    },
  ];
  return seed.sort((a, b) => b.timestampMs - a.timestampMs);
}

function buildHero(escrow: EscrowRow[], slashes: SlashRow[], streams: StreamRow[]): TreasuryHero {
  const totalLocked = 2_450_000;
  const totalReleased = 8_120_450;
  const recovered = slashes.reduce((s, x) => s + x.amountUsdc, 0) + 60_000; // + earlier history baked in
  const flowRate = streams.reduce((s, x) => s + x.flowRateUsdcPerSec, 0) || 0.7584;
  const totalGrants = 124;
  const avgSize = 45_200;
  return {
    totalUsdcLocked: totalLocked,
    totalReleasedAllTime: totalReleased,
    totalRecoveredViaSlashing: recovered,
    currentlyStreamingFlowRate: flowRate,
    totalGrantsCreated: totalGrants,
    averageGrantSizeUsdc: avgSize,
    sparks: {
      locked: buildSpark(11, 'up'),
      released: buildSpark(23, 'up'),
      recovered: buildSpark(7, 'flat'),
      streaming: buildSpark(31, 'up'),
      grants: buildSpark(13, 'up'),
      avgSize: buildSpark(19, 'down'),
    },
    delta: {
      locked: 4.2,
      released: 0,
      recovered: -1.5,
      streaming: 0,
      grants: 12,
      avgSize: 0,
    },
  };
}

export function getTreasurySnapshot(): TreasurySnapshot {
  const now = new Date();
  const escrow = deriveEscrowFromGrants();
  const streams = buildStreams(escrow);
  const slashes = buildSlashes();
  const activity = buildActivity();
  const projections = buildProjections();
  const hero = buildHero(escrow, slashes, streams);

  const cashFlow: Record<TreasuryTimeRange, CashFlowPoint[]> = {
    '7D': buildCashFlowSeries('7D', now, 1),
    '30D': buildCashFlowSeries('30D', now, 2),
    '90D': buildCashFlowSeries('90D', now, 3),
    '12M': buildCashFlowSeries('12M', now, 4),
    'ALL': buildCashFlowSeries('ALL', now, 5),
  };

  return { hero, cashFlow, escrow, streams, slashes, projections, activity };
}

/* ─── Helpers shared by the page sections ─────────────────────────────── */

export function rangeToWindowMs(range: TreasuryTimeRange): number | null {
  if (range === '7D') return 7 * MS_DAY;
  if (range === '30D') return 30 * MS_DAY;
  if (range === '90D') return 90 * MS_DAY;
  if (range === '12M') return 365 * MS_DAY;
  return null; // ALL
}

export function filterEventsByRange<T extends { timestampMs: number }>(
  events: T[],
  range: TreasuryTimeRange,
): T[] {
  const window = rangeToWindowMs(range);
  if (window == null) return events;
  const cutoff = Date.now() - window;
  return events.filter((e) => e.timestampMs >= cutoff);
}

export function formatUsd(amount: number, opts?: { compact?: boolean; sign?: boolean }): string {
  const compact = opts?.compact ?? false;
  const sign = opts?.sign ?? false;
  const abs = Math.abs(amount);
  let body: string;
  if (compact && abs >= 1_000_000) body = `$${(abs / 1_000_000).toFixed(2)}M`;
  else if (compact && abs >= 1_000) body = `$${Math.round(abs / 1_000)}K`;
  else
    body = `$${abs.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  if (!sign) return amount < 0 ? `-${body}` : body;
  if (amount > 0) return `+${body}`;
  if (amount < 0) return `-${body}`;
  return body;
}

export function truncateAddress(addr: string): string {
  if (!addr) return '';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 2) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatDateShort(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function daysBetween(aMs: number, bMs: number): number {
  return Math.max(0, Math.round((aMs - bMs) / MS_DAY));
}

export function streamedTotal(s: StreamRow): number {
  const elapsedSec = (Date.now() - s.streamEpochMs) / 1000;
  return s.totalStreamedUsdcAtEpoch + Math.max(0, elapsedSec) * s.flowRateUsdcPerSec;
}

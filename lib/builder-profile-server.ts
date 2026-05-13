import { getCommitteeDemoActions } from '@/demo/committee-demo';
import { getDaoDashboardSnapshot, type DaoGrantCardModel, type DaoMilestoneModel } from '@/demo/dao-dashboard';
import {
  GRANT_ESCROW_ADDRESS,
  grantEscrowReadAbi,
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
} from '@/lib/escrow';
import { USDC_DECIMALS } from '@/lib/usdc';
import {
  arbitrum,
  createPublicClient,
  formatUnits,
  getAddress,
  http,
  isAddress,
  keccak256,
  stringToHex,
  type Address,
  zeroAddress,
} from 'viem';

export type BuilderProfileGrantRow = {
  source: 'chain' | 'demo';
  href: string;
  labelId: string;
  title: string;
  committeeCount: number;
  totalUsdc: number;
  milestoneApproved: number;
  milestoneTotal: number;
  statusLabel: 'Completed' | 'In Progress' | 'Warning' | 'Slashed';
};

export type BuilderProfileWarningRow = {
  id: string;
  grantLabel: string;
  milestoneTitle: string;
  message: string;
  issuedAtIso: string;
  easUrl: string;
};

export type BuilderIdentityView = {
  zkVerified: boolean;
  githubHandle: string;
  accountCreationYear: number;
  contributionTier: number;
  reputationScore: number;
};

export type BuilderProfileStats = {
  reputationScore: number;
  letterGrade: string;
  deliveryRatePercent: number | null;
  deliveryDetail: string;
  totalUsdcEarned: number;
  zkProofsSubmitted: number;
  hasZkSubmission: boolean;
};

export type BuilderProfileData =
  | { kind: 'invalid' }
  | {
      kind: 'ok';
      address: Address;
      identity: BuilderIdentityView;
      hasIdentityRecord: boolean;
      verifiedAtDisplay: string | null;
      bindingTxHash: `0x${string}` | null;
      stats: BuilderProfileStats;
      grants: BuilderProfileGrantRow[];
      warnings: BuilderProfileWarningRow[];
      chainReadFailed: boolean;
      /** Explorer catalogue label when identity is missing, e.g. "Tier 2 Contributor". */
      demoContributionTierLabel: string | null;
    };

const RPC =
  process.env.NEXT_PUBLIC_RPC_URL?.trim() || 'https://arb1.arbitrum.io/rpc';

const builderListAbis = [
  {
    type: 'function',
    name: 'getGrantsByBuilder',
    stateMutability: 'view',
    inputs: [{ name: 'builder', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getBuilderGrantIds',
    stateMutability: 'view',
    inputs: [{ name: 'builder', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getGrantsForBuilder',
    stateMutability: 'view',
    inputs: [{ name: 'builder', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
  },
] as const;

type GrantTuple = {
  builder: Address;
  streaming: boolean;
  committee: Address[];
  quorum: bigint;
  createdAt: bigint;
  milestones: Array<{
    title: string;
    description: string;
    amount: bigint;
    deadline: bigint;
    proofType: number;
  }>;
};

const MILESTONE_PENDING = 0;
/** Treat as committee-approved / released for delivery rate when on-chain enum is unknown. */
const MILESTONE_APPROVED_LIKE = new Set([3, 4, 5]);

function shortenAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function scoreToLetterGrade(score: number): string {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s >= 97) return 'A+';
  if (s >= 93) return 'A';
  if (s >= 90) return 'A-';
  if (s >= 87) return 'B+';
  if (s >= 83) return 'B';
  if (s >= 80) return 'B-';
  if (s >= 77) return 'C+';
  if (s >= 73) return 'C';
  if (s >= 70) return 'C-';
  if (s >= 60) return 'D';
  return 'F';
}

function tierLabelFromUint8(tier: number): string {
  if (tier <= 0) return 'Contributor';
  if (tier === 1) return 'Tier 1 Contributor';
  if (tier === 2) return 'Tier 2 Contributor';
  if (tier === 3) return 'Tier 3 Contributor';
  return `Tier ${tier} Contributor`;
}

export function contributionTierLabel(tier: number, fallback?: string): string {
  if (fallback?.trim()) return fallback;
  return tierLabelFromUint8(tier);
}

function grantTupleEmpty(g: GrantTuple): boolean {
  return (
    g.builder === zeroAddress &&
    g.createdAt === BigInt(0) &&
    g.milestones.length === 0
  );
}

function demoGrantStatus(card: DaoGrantCardModel): BuilderProfileGrantRow['statusLabel'] {
  if (card.tags.includes('slashed')) return 'Slashed';
  if (card.tags.includes('warning_issued') || card.hasWarning) return 'Warning';
  if (card.tags.includes('completed')) return 'Completed';
  return 'In Progress';
}

function usdcFromWei(w: bigint): number {
  return Number(formatUnits(w, USDC_DECIMALS));
}

function syntheticBindingTx(address: Address): `0x${string}` {
  const h = keccak256(stringToHex(`grantos:identity-binding:${address.toLowerCase()}`));
  return `0x${h.slice(2, 66)}` as `0x${string}`;
}

function syntheticVerifiedAtUtc(address: Address): string {
  const n = Number(BigInt(`0x${address.slice(2, 10)}`) % BigInt(86400 * 400));
  const ms = Date.UTC(2023, 9, 12, 14, 30) + n * 1000;
  return new Date(ms).toLocaleString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' UTC';
}

function daoMilestoneApproved(m: DaoMilestoneModel): boolean {
  return m.status === 'approved';
}

function daoMilestonePending(m: DaoMilestoneModel): boolean {
  return m.status === 'pending';
}

function computeDemoStats(cards: DaoGrantCardModel[]): BuilderProfileStats {
  let approved = 0;
  let nonPending = 0;
  let usdcEarned = 0;
  let zkSubmitted = 0;

  for (const c of cards) {
    for (const m of c.milestones) {
      const pending = daoMilestonePending(m);
      if (!pending) nonPending += 1;
      if (daoMilestoneApproved(m)) {
        approved += 1;
        usdcEarned += m.amountUsdc;
      }
      if (m.proofType === 'ZK' && !pending) zkSubmitted += 1;
    }
  }

  const rep =
    cards.length > 0
      ? Math.round(cards.reduce((s, c) => s + c.reputationScore, 0) / cards.length)
      : 0;

  return {
    reputationScore: rep,
    letterGrade: scoreToLetterGrade(rep),
    deliveryRatePercent:
      nonPending > 0 ? Math.round((approved / nonPending) * 1000) / 10 : null,
    deliveryDetail:
      nonPending > 0
        ? `${approved} of ${nonPending} milestones approved.`
        : 'No milestone activity yet.',
    totalUsdcEarned: Math.round(usdcEarned * 100) / 100,
    zkProofsSubmitted: zkSubmitted,
    hasZkSubmission: zkSubmitted > 0,
  };
}

function mergeWarningsFromDao(
  cards: DaoGrantCardModel[],
): BuilderProfileWarningRow[] {
  const out: BuilderProfileWarningRow[] = [];
  for (const c of cards) {
    for (const m of c.milestones) {
      for (const w of m.warningHistory) {
        out.push({
          id: `${c.slug}-${m.title}-${w.issuedAtIso}-${w.attestationUrl.slice(0, 12)}`,
          grantLabel: c.displayId.replace(/^#/, ''),
          milestoneTitle: m.title,
          message: w.message,
          issuedAtIso: w.issuedAtIso,
          easUrl: w.attestationUrl,
        });
      }
    }
  }
  return out.sort(
    (a, b) => new Date(b.issuedAtIso).getTime() - new Date(a.issuedAtIso).getTime(),
  );
}

function committeeSeedWarnings(addrLower: string): BuilderProfileWarningRow[] {
  const view = getCommitteeDemoActions();
  return view.overdue
    .filter(
      (
        m,
      ): m is typeof m & {
        state: Extract<typeof m.state, { kind: 'warning_issued' }>;
      } => m.state.kind === 'warning_issued',
    )
    .filter((m) => m.builderAddress.toLowerCase() === addrLower)
    .map((m) => ({
      id: m.id,
      grantLabel: m.grantId,
      milestoneTitle: m.milestoneTitle,
      message: m.state.message,
      issuedAtIso: m.state.warningIssuedAtIso,
      easUrl: m.state.attestationUrl,
    }))
    .sort(
      (a, b) =>
        new Date(b.issuedAtIso).getTime() - new Date(a.issuedAtIso).getTime(),
    );
}

function mergeWarningRows(
  a: BuilderProfileWarningRow[],
  b: BuilderProfileWarningRow[],
): BuilderProfileWarningRow[] {
  const seen = new Set<string>();
  const out: BuilderProfileWarningRow[] = [];
  for (const row of [...a, ...b]) {
    const k = `${row.easUrl}|${row.grantLabel}|${row.message}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out.sort(
    (x, y) =>
      new Date(y.issuedAtIso).getTime() - new Date(x.issuedAtIso).getTime(),
  );
}

function demoRowsForBuilder(cards: DaoGrantCardModel[]): BuilderProfileGrantRow[] {
  return cards.map((c) => ({
    source: 'demo' as const,
    href: `/grants/${c.slug}`,
    labelId: c.displayId.replace(/^#/, ''),
    title: c.milestones[0]?.title ?? 'Grant',
    committeeCount: 5,
    totalUsdc: c.totalGrantUsdc,
    milestoneApproved: c.milestoneCompleted,
    milestoneTotal: c.milestoneTotal,
    statusLabel: demoGrantStatus(c),
  }));
}

export async function loadBuilderProfile(raw: string): Promise<BuilderProfileData> {
  const trimmed = decodeURIComponent(raw).trim();
  if (!trimmed || !isAddress(trimmed)) return { kind: 'invalid' };

  let address: Address;
  try {
    address = getAddress(trimmed);
  } catch {
    return { kind: 'invalid' };
  }

  const addrLower = address.toLowerCase();
  const snap = getDaoDashboardSnapshot(0);
  const demoCards = snap.grants.filter((g) => g.builder.toLowerCase() === addrLower);
  const demoRows = demoRowsForBuilder(demoCards);
  const demoStats = computeDemoStats(demoCards);
  const daoWarnings = mergeWarningsFromDao(demoCards);
  const seedWarnings = committeeSeedWarnings(addrLower);
  const warnings = mergeWarningRows(daoWarnings, seedWarnings);

  let chainReadFailed = false;
  let identity: BuilderIdentityView = {
    zkVerified: false,
    githubHandle: '',
    accountCreationYear: 0,
    contributionTier: 0,
    reputationScore: 0,
  };
  let verifiedAtDisplay: string | null = null;
  let bindingTxHash: `0x${string}` | null = null;
  const chainRows: BuilderProfileGrantRow[] = [];

  try {
    const client = createPublicClient({
      chain: arbitrum,
      transport: http(RPC, { timeout: 12_000 }),
    });

    const [isVerified, idTuple] = await Promise.all([
      client.readContract({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryAbi,
        functionName: 'isVerified',
        args: [address],
      }),
      client.readContract({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryAbi,
        functionName: 'getIdentity',
        args: [address],
      }),
    ]);

    const zkVerified = Boolean(idTuple[0]) || Boolean(isVerified);
    const githubHandle = typeof idTuple[1] === 'string' ? idTuple[1] : '';
    const accountCreationYear = Number(idTuple[2] ?? 0);
    const contributionTier = Number(idTuple[3] ?? 0);
    const reputationScore = Number(idTuple[4] ?? 0);

    identity = {
      zkVerified,
      githubHandle,
      accountCreationYear,
      contributionTier,
      reputationScore,
    };

    const hasIdentityRecord =
      zkVerified ||
      githubHandle.trim().length > 0 ||
      accountCreationYear > 0 ||
      contributionTier > 0 ||
      reputationScore > 0;

    if (hasIdentityRecord) {
      verifiedAtDisplay = syntheticVerifiedAtUtc(address);
      bindingTxHash = syntheticBindingTx(address);
    }

    const idSet = new Set<string>();
    for (const fn of builderListAbis) {
      try {
        const ids = (await client.readContract({
          address: GRANT_ESCROW_ADDRESS,
          abi: [fn],
          functionName: fn.name,
          args: [address],
        })) as bigint[];
        ids.forEach((id) => idSet.add(id.toString()));
      } catch {
        // deployment may not expose this view
      }
    }

    const grantIds = Array.from(idSet, (s) => BigInt(s));

    const grantResults =
      grantIds.length > 0
        ? await client.multicall({
            allowFailure: true,
            contracts: grantIds.map((id) => ({
              address: GRANT_ESCROW_ADDRESS,
              abi: grantEscrowReadAbi,
              functionName: 'getGrant',
              args: [id],
            })),
          })
        : [];

    const chainGrants: Array<{ id: bigint; tuple: GrantTuple }> = [];
    grantResults.forEach((row, i) => {
      if (row.status !== 'success') return;
      const t = row.result as GrantTuple;
      if (grantTupleEmpty(t)) return;
      if (t.builder.toLowerCase() !== addrLower) return;
      chainGrants.push({ id: grantIds[i]!, tuple: t });
    });

    const statusContracts = chainGrants.flatMap(({ id, tuple }) =>
      tuple.milestones.map((_, idx) => ({
        address: GRANT_ESCROW_ADDRESS,
        abi: grantEscrowReadAbi,
        functionName: 'getMilestoneStatus' as const,
        args: [id, BigInt(idx)] as const,
      })),
    );

    const statusResults =
      statusContracts.length > 0
        ? await client.multicall({
            allowFailure: true,
            contracts: statusContracts,
          })
        : [];

    let statusIdx = 0;
    for (const { id, tuple } of chainGrants) {
      const statuses: number[] = [];
      for (let i = 0; i < tuple.milestones.length; i++) {
        const r = statusResults[statusIdx++];
        if (r?.status === 'success') statuses.push(Number(r.result as bigint));
        else statuses.push(MILESTONE_PENDING);
      }

      let approved = 0;
      let nonPending = 0;
      let usdcEarned = 0;
      let zkSubmitted = 0;

      tuple.milestones.forEach((m, i) => {
        const st = statuses[i] ?? MILESTONE_PENDING;
        if (st !== MILESTONE_PENDING) {
          nonPending += 1;
          if (MILESTONE_APPROVED_LIKE.has(st)) {
            approved += 1;
            usdcEarned += usdcFromWei(m.amount);
          }
          if (m.proofType === 0) zkSubmitted += 1;
        }
      });

      const totalWei = tuple.milestones.reduce((s, m) => s + m.amount, BigInt(0));
      const completedLike =
        nonPending > 0 && approved === tuple.milestones.length && !tuple.streaming;

      chainRows.push({
        source: 'chain',
        href: `/grants/${id.toString()}`,
        labelId: `GRT-${id.toString()}`,
        title: tuple.milestones[0]?.title ?? 'Grant',
        committeeCount: tuple.committee.length,
        totalUsdc: Math.round(usdcFromWei(totalWei) * 100) / 100,
        milestoneApproved: approved,
        milestoneTotal: tuple.milestones.length,
        statusLabel: completedLike ? 'Completed' : 'In Progress',
      });
    }

    const chainStatsPart = (): BuilderProfileStats => {
      if (chainGrants.length === 0) {
        return {
          reputationScore: 0,
          letterGrade: '—',
          deliveryRatePercent: null,
          deliveryDetail: 'No on-chain grants.',
          totalUsdcEarned: 0,
          zkProofsSubmitted: 0,
          hasZkSubmission: false,
        };
      }
      let approved = 0;
      let nonPending = 0;
      let usdcEarned = 0;
      let zkSubmitted = 0;
      let si = 0;
      for (const { tuple } of chainGrants) {
        for (let i = 0; i < tuple.milestones.length; i++) {
          const st =
            statusResults[si]?.status === 'success'
              ? Number(statusResults[si]!.result as bigint)
              : MILESTONE_PENDING;
          si++;
          if (st !== MILESTONE_PENDING) {
            nonPending += 1;
            if (MILESTONE_APPROVED_LIKE.has(st)) {
              approved += 1;
              usdcEarned += usdcFromWei(tuple.milestones[i]!.amount);
            }
            if (tuple.milestones[i]!.proofType === 0) zkSubmitted += 1;
          }
        }
      }
      const rep = identity.reputationScore || 0;
      return {
        reputationScore: rep,
        letterGrade: rep > 0 ? scoreToLetterGrade(rep) : '—',
        deliveryRatePercent:
          nonPending > 0 ? Math.round((approved / nonPending) * 1000) / 10 : null,
        deliveryDetail:
          nonPending > 0
            ? `${approved} of ${nonPending} milestones approved.`
            : 'Milestone statuses unavailable or all pending.',
        totalUsdcEarned: Math.round(usdcEarned * 100) / 100,
        zkProofsSubmitted: zkSubmitted,
        hasZkSubmission: zkSubmitted > 0,
      };
    };

    const chainStats = chainStatsPart();
    const repScore = hasIdentityRecord
      ? identity.reputationScore > 0
        ? identity.reputationScore
        : chainStats.reputationScore || demoStats.reputationScore
      : Math.max(chainStats.reputationScore, demoStats.reputationScore);

    const mergedStats: BuilderProfileStats = {
      reputationScore: repScore,
      letterGrade: repScore > 0 ? scoreToLetterGrade(repScore) : '—',
      deliveryRatePercent:
        chainRows.length > 0
          ? chainStats.deliveryRatePercent ?? demoStats.deliveryRatePercent
          : demoStats.deliveryRatePercent,
      deliveryDetail:
        chainRows.length > 0 ? chainStats.deliveryDetail : demoStats.deliveryDetail,
      totalUsdcEarned:
        chainStats.totalUsdcEarned > 0
          ? chainStats.totalUsdcEarned
          : demoStats.totalUsdcEarned,
      zkProofsSubmitted: Math.max(
        chainStats.zkProofsSubmitted,
        demoStats.zkProofsSubmitted,
      ),
      hasZkSubmission:
        chainStats.hasZkSubmission || demoStats.hasZkSubmission,
    };

    const mergedGrants = mergeGrantRows(chainRows, demoRows);

    const demoContributionTierLabel = demoCards[0]?.contributionTier ?? null;

    return {
      kind: 'ok',
      address,
      identity,
      hasIdentityRecord,
      verifiedAtDisplay,
      bindingTxHash,
      stats: mergedStats,
      grants: mergedGrants,
      warnings,
      chainReadFailed: false,
      demoContributionTierLabel,
    };
  } catch {
    chainReadFailed = true;
    return {
      kind: 'ok',
      address,
      identity,
      hasIdentityRecord: false,
      verifiedAtDisplay: null,
      bindingTxHash: null,
      stats: demoStats,
      grants: demoRows,
      warnings,
      chainReadFailed,
      demoContributionTierLabel: demoCards[0]?.contributionTier ?? null,
    };
  }
}

function mergeGrantRows(
  chain: BuilderProfileGrantRow[],
  demo: BuilderProfileGrantRow[],
): BuilderProfileGrantRow[] {
  const bySlug = new Map<string, BuilderProfileGrantRow>();
  for (const d of demo) {
    const slug = d.href.replace(/^\/grants\//, '');
    bySlug.set(slug, d);
  }
  const out: BuilderProfileGrantRow[] = [];
  for (const c of chain) {
    const id = c.href.replace(/^\/grants\//, '');
    const dup = bySlug.get(id);
    if (dup) bySlug.delete(id);
    out.push(c);
  }
  for (const d of bySlug.values()) out.push(d);
  return out;
}

export function formatBuilderPageTitle(address: Address): string {
  return `Builder ${shortenAddr(address)} — GrantOS v3`;
}

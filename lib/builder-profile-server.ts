import { getCommitteeDemoActions } from '@/demo/committee-demo';
import { getDaoDashboardSnapshot, type DaoGrantCardModel, type DaoMilestoneModel } from '@/demo/dao-dashboard';
import {
  CONTRACTS_READY,
  GRANT_FACTORY_ADDRESS,
  GRANT_ESCROW_ADDRESS,
  grantFactoryAbi,
  grantEscrowReadAbi,
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
} from '@/lib/escrow';
import { safeFactoryGrantCount } from '@/lib/grant-factory-read';
import { isUiDemoMode } from '@/demo';
import { parseProfileAddress } from '@/lib/profile-address';
import { demoPathSegmentForChainIndex } from '@/lib/public-explorer-grant';
import { USDC_DECIMALS } from '@/lib/usdc';
import { arbitrumSepolia } from 'viem/chains';
import {
  createPublicClient,
  formatUnits,
  getAddress,
  http,
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
  process.env.NEXT_PUBLIC_RPC_URL?.trim() || 'https://sepolia-rollup.arbitrum.io/rpc';

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
  committee: readonly Address[];
  quorum: bigint;
  createdAt: bigint;
  milestones: readonly {
    title: string;
    description: string;
    amount: bigint;
    deadline: bigint;
    proofType: number;
    state: number;
  }[];
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

function syntheticVerifiedAtUtc(address: Address): string | null {
  return null;
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

function demoCardsForBuilder(address: Address): DaoGrantCardModel[] {
  const addrLower = address.toLowerCase();
  const snap = getDaoDashboardSnapshot(0);
  return snap.grants.filter((g) => g.builder.toLowerCase() === addrLower);
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

const RPCS = [
  process.env.NEXT_PUBLIC_RPC_URL?.trim(),
  'https://sepolia-rollup.arbitrum.io/rpc',
  'https://arbitrum-sepolia.publicnode.com',
  'https://arbitrum-sepolia.blockpi.network/v1/rpc/public',
].filter(Boolean) as string[];

async function getClientWithFallback() {
  for (const url of RPCS) {
    try {
      const client = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(url, { timeout: 10_000 }),
      });
      // Smoke test
      await client.getBlockNumber();
      return client;
    } catch (e) {
      console.error(`RPC ${url} failed, trying next...`);
    }
  }
  return null;
}

export { builderProfilePath, parseProfileAddress } from '@/lib/profile-address';

export async function loadBuilderProfile(raw: string): Promise<BuilderProfileData> {
  const address = parseProfileAddress(raw);
  if (!address) {
    return { kind: 'invalid' };
  }
  const addrLower = address.toLowerCase();

  const demoCards = demoCardsForBuilder(address);
  const demoRows = demoRowsForBuilder(demoCards);
  const demoStats = computeDemoStats(demoCards);
  const daoWarnings = mergeWarningsFromDao(demoCards);
  const seedWarnings = committeeSeedWarnings(addrLower);
  const warnings = mergeWarningRows(daoWarnings, seedWarnings);

  let identity: BuilderIdentityView = {
    zkVerified: false,
    githubHandle: '',
    accountCreationYear: 0,
    contributionTier: 0,
    reputationScore: 0,
  };
  let hasIdentityRecord = false;
  let verifiedAtDisplay: string | null = null;
  let bindingTxHash: `0x${string}` | null = null;
  const chainRows: BuilderProfileGrantRow[] = [];
  let chainReadFailed = false;

  const client = await getClientWithFallback();

  if (!client) {
    console.error('All RPCs failed for builder profile');
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
      chainReadFailed: true,
      demoContributionTierLabel: demoCards[0]?.contributionTier ?? null,
    };
  }

  try {
    // 1. Fetch identity
    const [isVerified, idTuple] = await Promise.all([
      client.readContract({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryAbi,
        functionName: 'isVerified',
        args: [address],
      }).catch(() => false),
      client.readContract({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryAbi,
        functionName: 'getIdentity',
        args: [address],
      }).catch(() => null),
    ]);

    if (idTuple || isVerified) {
      if (idTuple) {
        const idObj = idTuple as any;
        const zkVerified = Boolean(idObj.isVerified ?? idObj[0]) || Boolean(isVerified);
        const githubHandle = (idObj.githubHandle ?? idObj[4] ?? '').toString();
        const accountCreationYear = Number(idObj.createdYear ?? idObj[3] ?? 0);
        const contributionTier = Number(idObj.tier ?? idObj[1] ?? 0);

        let reputationScore = 0;
        try {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
          const repRes = await fetch(`${backendUrl}/api/v1/grants/builder/${address}/reputation`);
          if (repRes.ok) {
            const repData = await repRes.json();
            reputationScore = repData.score || 0;
          }
        } catch (e) {
          console.warn('Failed to fetch reputation from backend in loadBuilderProfile:', e);
        }

        identity = {
          zkVerified,
          githubHandle,
          accountCreationYear,
          contributionTier,
          reputationScore,
        };

        hasIdentityRecord =
          zkVerified ||
          githubHandle.trim().length > 0 ||
          accountCreationYear > 0 ||
          contributionTier > 0;
      } else {
        identity.zkVerified = true;
        hasIdentityRecord = true;
      }

      if (hasIdentityRecord) {
        bindingTxHash = syntheticBindingTx(address);
      }
    }

    // 2. Fetch grants (skip factory scan when contracts are placeholders)
    let escrowAddresses: Address[] = [];
    if (CONTRACTS_READY) {
      const grantCount = safeFactoryGrantCount(
        await client
          .readContract({
            address: GRANT_FACTORY_ADDRESS,
            abi: grantFactoryAbi,
            functionName: 'grantCount',
          })
          .catch(() => null),
      );

      escrowAddresses =
        grantCount > 0
          ? (
              await client.multicall({
                contracts: Array.from({ length: grantCount }, (_, i) => ({
                  address: GRANT_FACTORY_ADDRESS,
                  abi: grantFactoryAbi,
                  functionName: 'grants' as const,
                  args: [BigInt(i)] as const,
                })),
              })
            )
              .map((r) => r.result as Address)
              .filter((a) => !!a && a !== zeroAddress)
          : [];
    }

    if (escrowAddresses.length > 0) {
      const grantResults = await client.multicall({
        allowFailure: true,
        contracts: escrowAddresses.map((addr) => ({
          address: addr,
          abi: grantEscrowReadAbi,
          functionName: 'getGrant',
        })),
      });

      const chainGrants: Array<{ addr: Address; tuple: GrantTuple }> = [];
      grantResults.forEach((row, i) => {
        if (row.status !== 'success') return;
        const t = row.result as unknown as GrantTuple;
        if (grantTupleEmpty(t)) return;
        if (t.builder.toLowerCase() !== addrLower) return;
        chainGrants.push({ addr: escrowAddresses[i]!, tuple: t });
      });

      if (chainGrants.length > 0) {
        const statusContracts = chainGrants.flatMap(({ addr, tuple }) =>
          tuple.milestones.map((_, idx) => ({
            address: addr,
            abi: grantEscrowReadAbi,
            functionName: 'getMilestoneStatus' as const,
            args: [BigInt(idx)] as const,
          })),
        );

        const statusResults = await client.multicall({
          allowFailure: true,
          contracts: statusContracts,
        });

        let statusIdx = 0;
        let totalApproved = 0;
        let totalNonPending = 0;
        let totalUsdcEarned = 0;
        let totalZkSubmitted = 0;

        for (const { addr, tuple } of chainGrants) {
          let grantApproved = 0;
          let grantNonPending = 0;
          let grantUsdcEarned = 0;
          let grantZkSubmitted = 0;

          tuple.milestones.forEach((m, i) => {
            const r = statusResults[statusIdx++];
            const st = r?.status === 'success' ? Number(r.result) : MILESTONE_PENDING;
            
            if (st !== MILESTONE_PENDING) {
              grantNonPending += 1;
              if (MILESTONE_APPROVED_LIKE.has(st)) {
                grantApproved += 1;
                grantUsdcEarned += usdcFromWei(m.amount);
              }
              if (m.proofType === 0) grantZkSubmitted += 1;
            }
          });

          totalApproved += grantApproved;
          totalNonPending += grantNonPending;
          totalUsdcEarned += grantUsdcEarned;
          totalZkSubmitted += grantZkSubmitted;

          const totalWei = tuple.milestones.reduce((s, m) => s + m.amount, BigInt(0));
          const completedLike = grantNonPending > 0 && grantApproved === tuple.milestones.length && !tuple.streaming;

          const grantPathId = isUiDemoMode()
            ? demoPathSegmentForChainIndex(BigInt(chainRows.length), tuple.builder)
            : addr;

          chainRows.push({
            source: 'chain',
            href: `/grants/${grantPathId}`,
            labelId: `GRT-${addr.slice(2, 8)}`,
            title: tuple.milestones[0]?.title ?? 'Grant',
            committeeCount: tuple.committee.length,
            totalUsdc: Math.round(usdcFromWei(totalWei) * 100) / 100,
            milestoneApproved: grantApproved,
            milestoneTotal: tuple.milestones.length,
            statusLabel: completedLike ? 'Completed' : 'In Progress',
          });
        }

        const mergedStats: BuilderProfileStats = {
          reputationScore: identity.reputationScore || 0,
          letterGrade: identity.reputationScore > 0 ? scoreToLetterGrade(identity.reputationScore) : '—',
          deliveryRatePercent: totalNonPending > 0 ? Math.round((totalApproved / totalNonPending) * 1000) / 10 : null,
          deliveryDetail: totalNonPending > 0 ? `${totalApproved} of ${totalNonPending} milestones approved.` : 'No milestones reached status.',
          totalUsdcEarned: Math.round(totalUsdcEarned * 100) / 100,
          zkProofsSubmitted: totalZkSubmitted,
          hasZkSubmission: totalZkSubmitted > 0,
        };

        return {
          kind: 'ok',
          address,
          identity,
          hasIdentityRecord,
          verifiedAtDisplay: null,
          bindingTxHash,
          stats: mergedStats,
          grants: mergeGrantRows(chainRows, demoRows),
          warnings,
          chainReadFailed: false,
          demoContributionTierLabel: demoCards[0]?.contributionTier ?? null,
        };
      }
    }

    // No chain grants found but identity might be real
    return {
      kind: 'ok',
      address,
      identity,
      hasIdentityRecord,
      verifiedAtDisplay: null,
      bindingTxHash,
      stats: demoStats,
      grants: demoRows,
      warnings,
      chainReadFailed: false,
      demoContributionTierLabel: demoCards[0]?.contributionTier ?? null,
    };
  } catch (e) {
    console.error('Chain read error:', e);
    chainReadFailed = true;
  }

  return {
    kind: 'ok',
    address,
    identity,
    hasIdentityRecord,
    verifiedAtDisplay: null,
    bindingTxHash: null,
    stats: demoStats,
    grants: demoRows,
    warnings,
    chainReadFailed: true,
    demoContributionTierLabel: demoCards[0]?.contributionTier ?? null,
  };
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

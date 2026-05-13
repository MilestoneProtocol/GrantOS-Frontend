import { getDaoDashboardSnapshot, type DaoGrantCardModel } from '@/demo/dao-dashboard';
import { USDC_DECIMALS } from '@/lib/usdc';
import { getAddress, keccak256, parseUnits, stringToHex, type Address } from 'viem';

/** Same tuple shape as `GrantEscrow.getGrant` for UI consumption. */
export type PublicGrantTuple = {
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

function demoCommittee(slug: string, size: number): Address[] {
  return Array.from({ length: size }, (_, i) => {
    const h = keccak256(stringToHex(`grantos-public-explorer-committee-${slug}-${i}`));
    return getAddress(`0x${h.slice(2, 42)}` as `0x${string}`);
  });
}

function proofTypeFromDao(t: DaoGrantCardModel['milestones'][0]['proofType']): number {
  if (t === 'ZK') return 0;
  if (t === 'PR') return 1;
  return 2;
}

/**
 * Find a grant card from the public explorer demo ledger (`demo/dao-dashboard.ts`)
 * by URL segment: numeric slug, `#GRT-8692`, `GRT-2026-8692`, etc.
 */
export function findExplorerDemoGrant(routeIdRaw: string): DaoGrantCardModel | null {
  const s = decodeURIComponent(routeIdRaw).trim();
  if (!s) return null;
  const snap = getDaoDashboardSnapshot(0);

  const bySlug = snap.grants.find((g) => g.slug === s);
  if (bySlug) return bySlug;

  const grit = /^#?GRT-\d+-(\d+)$/i.exec(s);
  if (grit?.[1]) {
    const num = grit[1];
    return snap.grants.find((g) => g.slug === num) ?? null;
  }

  const tail = /^#?GRT-(\d+)$/i.exec(s);
  if (tail?.[1]) {
    const num = tail[1];
    return snap.grants.find((g) => g.slug === num) ?? null;
  }

  return null;
}

export function explorerDemoCardToGrantTuple(card: DaoGrantCardModel): PublicGrantTuple {
  const committee = demoCommittee(card.slug, 5);
  const createdAt = BigInt(Math.floor(new Date(card.createdAtIso).getTime() / 1000));

  const milestones = card.milestones.map((m) => ({
    title: m.title,
    description: m.description,
    amount: parseUnits(String(m.amountUsdc), USDC_DECIMALS),
    deadline: BigInt(Math.floor(new Date(m.deadlineIso).getTime() / 1000)),
    proofType: proofTypeFromDao(m.proofType),
  }));

  return {
    builder: card.builder,
    streaming: card.paymentMode === 'streaming' || card.isStreamingActive,
    committee,
    quorum: BigInt(3),
    createdAt,
    milestones,
  };
}

/** Stable bigint id for UI keys when route uses explorer slug (digits only). */
export function explorerSlugAsGrantId(slug: string): bigint {
  if (/^\d+$/.test(slug)) {
    try {
      return BigInt(slug);
    } catch {
      return BigInt(0);
    }
  }
  const h = keccak256(stringToHex(`grantos-explorer-slug-${slug}`));
  return BigInt(h);
}

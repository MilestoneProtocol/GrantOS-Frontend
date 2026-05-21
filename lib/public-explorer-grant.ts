import type { Address } from 'viem';
import { keccak256, stringToHex } from 'viem';

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

/** Strip legacy suffixes from borrowed catalogue ids (`8692-b0`). */
export function normalizeGrantRouteId(routeIdRaw: string): string {
  return decodeURIComponent(routeIdRaw).trim().replace(/-b\d+$/i, '');
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

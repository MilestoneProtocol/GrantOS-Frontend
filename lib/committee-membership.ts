'use client';

import { isUiDemoMode } from '@/demo';
import { GRANT_ESCROW_ADDRESS, committeeMembershipAbis } from '@/lib/escrow';
import { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';

export type CommitteeMembership =
  | { state: 'idle'; isMember: false; grantIds: bigint[] }
  | { state: 'loading'; isMember: false; grantIds: bigint[] }
  | { state: 'ready'; isMember: boolean; grantIds: bigint[] };

/**
 * Resolve which grants the connected wallet is a committee member on.
 *
 * Tries multiple known view-function names (`getCommitteeGrantIds`,
 * `getGrantsByCommittee`, `getCommitteeGrants`) and unions the results so this
 * works across deployments without coupling the UI to a single ABI shape.
 *
 * Returns `state: 'idle'` until a wallet is connected. In UI demo mode
 * (`NEXT_PUBLIC_GRANTOS_UI_DEMO=true`) we synthesise a single committee grant
 * so the dashboard is reachable without a deployed contract.
 */
export function useCommitteeMembership(): CommitteeMembership {
  const { address } = useAccount();

  const readA = useReadContract({
    address: GRANT_ESCROW_ADDRESS,
    abi: committeeMembershipAbis.getCommitteeGrantIds,
    functionName: 'getCommitteeGrantIds',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const readB = useReadContract({
    address: GRANT_ESCROW_ADDRESS,
    abi: committeeMembershipAbis.getGrantsByCommittee,
    functionName: 'getGrantsByCommittee',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const readC = useReadContract({
    address: GRANT_ESCROW_ADDRESS,
    abi: committeeMembershipAbis.getCommitteeGrants,
    functionName: 'getCommitteeGrants',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  return useMemo<CommitteeMembership>(() => {
    if (!address) {
      return { state: 'idle', isMember: false, grantIds: [] };
    }

    const stillLoading =
      readA.isLoading || readB.isLoading || readC.isLoading || readA.isFetching || readB.isFetching || readC.isFetching;

    const allErrored =
      Boolean(readA.error) && Boolean(readB.error) && Boolean(readC.error);

    const pick = (value: unknown): bigint[] =>
      Array.isArray(value) ? (value as bigint[]) : [];

    const merged = new Set<string>();
    for (const v of [readA.data, readB.data, readC.data]) {
      for (const id of pick(v)) merged.add(id.toString());
    }
    const grantIds = Array.from(merged, (s) => BigInt(s));

    if (stillLoading && grantIds.length === 0) {
      return { state: 'loading', isMember: false, grantIds: [] };
    }

    // Demo bypass: pretend the connected wallet is on a committee so the dashboard
    // can be designed without a deployed escrow ABI.
    if (isUiDemoMode()) {
      return { state: 'ready', isMember: true, grantIds };
    }

    // If every read errored (likely no deployment / wrong ABI), treat as not-a-member
    // rather than hanging the loader forever.
    if (allErrored && grantIds.length === 0) {
      return { state: 'ready', isMember: false, grantIds: [] };
    }

    return { state: 'ready', isMember: grantIds.length > 0, grantIds };
  }, [
    address,
    readA.data,
    readA.error,
    readA.isFetching,
    readA.isLoading,
    readB.data,
    readB.error,
    readB.isFetching,
    readB.isLoading,
    readC.data,
    readC.error,
    readC.isFetching,
    readC.isLoading,
  ]);
}

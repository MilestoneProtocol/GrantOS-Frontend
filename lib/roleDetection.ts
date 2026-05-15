'use client';

import {
  GRANT_ESCROW_ADDRESS,
  IDENTITY_REGISTRY_ADDRESS,
  committeeMembershipAbis,
  identityRegistryAbi,
} from '@/lib/escrow';
import { useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';

export type DetectedRoles = {
  loading: boolean;
  address?: `0x${string}`;
  isVerified: boolean;
  builderGrantIds: bigint[];
  committeeGrantIds: bigint[];
  isBuilder: boolean;
  isCommittee: boolean;
  isDaoAdmin: boolean;
  isNewWallet: boolean;
  /**
   * True when the connected wallet has both builder + committee history, so onboarding
   * should present a role selection UI instead of redirecting.
   */
  hasMultipleRoles: boolean;
};

const builderGrantsAbis = {
  getGrantsByBuilder: [
    {
      type: 'function',
      name: 'getGrantsByBuilder',
      stateMutability: 'view',
      inputs: [{ name: 'builder', type: 'address' }],
      outputs: [{ type: 'uint256[]' }],
    },
  ] as const,
  getBuilderGrantIds: [
    {
      type: 'function',
      name: 'getBuilderGrantIds',
      stateMutability: 'view',
      inputs: [{ name: 'builder', type: 'address' }],
      outputs: [{ type: 'uint256[]' }],
    },
  ] as const,
  getGrantsForBuilder: [
    {
      type: 'function',
      name: 'getGrantsForBuilder',
      stateMutability: 'view',
      inputs: [{ name: 'builder', type: 'address' }],
      outputs: [{ type: 'uint256[]' }],
    },
  ] as const,
};

function pickIds(value: unknown): bigint[] {
  return Array.isArray(value) ? (value as bigint[]) : [];
}

function mergeUniqueBigints(values: bigint[][]): bigint[] {
  const merged = new Set<string>();
  for (const arr of values) for (const id of arr) merged.add(id.toString());
  return Array.from(merged, (s) => BigInt(s));
}

export function useRoleDetection(): DetectedRoles {
  const { address, status } = useAccount();
  const enabled = Boolean(address);

  // PRD: run role-detection reads in parallel before rendering protected UI.
  const reads = useReadContracts({
    contracts: enabled
      ? ([
          {
            address: IDENTITY_REGISTRY_ADDRESS,
            abi: identityRegistryAbi,
            functionName: 'isVerified',
            args: [address!],
          },
          {
            address: GRANT_ESCROW_ADDRESS,
            abi: builderGrantsAbis.getGrantsByBuilder,
            functionName: 'getGrantsByBuilder',
            args: [address!],
          },
          {
            address: GRANT_ESCROW_ADDRESS,
            abi: builderGrantsAbis.getBuilderGrantIds,
            functionName: 'getBuilderGrantIds',
            args: [address!],
          },
          {
            address: GRANT_ESCROW_ADDRESS,
            abi: builderGrantsAbis.getGrantsForBuilder,
            functionName: 'getGrantsForBuilder',
            args: [address!],
          },
          {
            address: GRANT_ESCROW_ADDRESS,
            abi: committeeMembershipAbis.getCommitteeGrantIds,
            functionName: 'getCommitteeGrantIds',
            args: [address!],
          },
          {
            address: GRANT_ESCROW_ADDRESS,
            abi: committeeMembershipAbis.getGrantsByCommittee,
            functionName: 'getGrantsByCommittee',
            args: [address!],
          },
          {
            address: GRANT_ESCROW_ADDRESS,
            abi: committeeMembershipAbis.getCommitteeGrants,
            functionName: 'getCommitteeGrants',
            args: [address!],
          },
        ] as const)
      : [],
    query: { enabled },
  });

  return useMemo((): DetectedRoles => {
    const walletResolved = status !== 'connecting' && status !== 'reconnecting';
    if (!address || !walletResolved) {
      return {
        loading: false,
        address: address as `0x${string}` | undefined,
        isVerified: false,
        builderGrantIds: [],
        committeeGrantIds: [],
        isBuilder: false,
        isCommittee: false,
        isDaoAdmin: false,
        isNewWallet: false,
        hasMultipleRoles: false,
      };
    }

    const pending = reads.isLoading || reads.isFetching;
    const data = reads.data ?? [];

    const verifiedRow = data[0] as { status: string; result?: boolean } | undefined;
    const isVerified =
      verifiedRow?.status === 'success' ? Boolean(verifiedRow.result) : false;

    const builderIds = mergeUniqueBigints([
      pickIds((data[1] as any)?.result ?? (data[1] as any)),
      pickIds((data[2] as any)?.result ?? (data[2] as any)),
      pickIds((data[3] as any)?.result ?? (data[3] as any)),
    ]);

    const committeeIds = mergeUniqueBigints([
      pickIds((data[4] as any)?.result ?? (data[4] as any)),
      pickIds((data[5] as any)?.result ?? (data[5] as any)),
      pickIds((data[6] as any)?.result ?? (data[6] as any)),
    ]);

    const isBuilder = builderIds.length > 0;
    const isCommittee = committeeIds.length > 0;
    const isDaoAdmin = committeeIds.length >= 3;
    const isNewWallet = !isVerified && !isBuilder && !isCommittee;
    const hasMultipleRoles = isBuilder && isCommittee;

    return {
      loading: pending,
      address: address as `0x${string}`,
      isVerified,
      builderGrantIds: builderIds,
      committeeGrantIds: committeeIds,
      isBuilder,
      isCommittee,
      isDaoAdmin,
      isNewWallet,
      hasMultipleRoles,
    };
  }, [address, reads.data, reads.isFetching, reads.isLoading, status]);
}


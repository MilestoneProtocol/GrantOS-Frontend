'use client';

import {
  GRANT_FACTORY_ADDRESS,
  GRANT_ESCROW_ADDRESS,
  IDENTITY_REGISTRY_ADDRESS,
  committeeMembershipAbis,
  identityRegistryAbi,
  grantEscrowAbi,
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

  // 1. Get the total number of grants from the factory
  const countRead = useReadContracts({
    contracts: [
      {
        address: GRANT_FACTORY_ADDRESS,
        abi: [
          {
            type: 'function',
            name: 'grantCount',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'uint256' }],
          },
        ] as const,
        functionName: 'grantCount',
      },
    ],
  });
  const grantCount = (countRead.data?.[0]?.result as bigint) ?? BigInt(0);

  // 1. Get all escrow addresses from the factory
  const factoryIndices = useMemo(() => {
    const count = Number(grantCount);
    return Array.from({ length: count }, (_, i) => BigInt(i));
  }, [grantCount]);

  const escrowReads = useReadContracts({
    contracts: factoryIndices.map((index) => ({
      address: GRANT_FACTORY_ADDRESS,
      abi: [
        {
          type: 'function',
          name: 'grants',
          stateMutability: 'view',
          inputs: [{ name: '', type: 'uint256' }],
          outputs: [{ name: '', type: 'address' }],
        },
      ] as const,
      functionName: 'grants',
      args: [index],
    })),
    query: { enabled: factoryIndices.length > 0 },
  });

  const escrowAddresses = useMemo(() => {
    return (escrowReads.data ?? [])
      .map((r) => r.result as `0x${string}` | undefined)
      .filter((a): a is `0x${string}` => !!a);
  }, [escrowReads.data]);

  // 2. Query each escrow for roles
  const roleReads = useReadContracts({
    contracts: (enabled && escrowAddresses.length > 0
      ? [
          {
            address: IDENTITY_REGISTRY_ADDRESS,
            abi: identityRegistryAbi,
            functionName: 'isVerified',
            args: [address!],
          },
          ...escrowAddresses.flatMap(addr => [
            {
              address: addr,
              abi: grantEscrowAbi,
              functionName: 'builder',
            },
            {
              address: addr,
              abi: grantEscrowAbi,
              functionName: 'isCommitteeMember',
              args: [address!],
            },
            {
              address: addr,
              abi: grantEscrowAbi,
              functionName: 'grantId',
            }
          ])
        ]
      : []) as any,
    query: { enabled: enabled && (escrowAddresses.length > 0 || factoryIndices.length === 0) },
  });

  const reads = roleReads; // for backward compatibility with the rest of the hook

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

    const builderIds: bigint[] = [];
    const committeeIds: bigint[] = [];

    // Skip the first result (isVerified)
    const roleResults = data.slice(1);
    // results come in triplets: [builder, isCommitteeMember, grantId]
    for (let i = 0; i < roleResults.length; i += 3) {
      const builderRes = roleResults[i] as { status: string; result?: string } | undefined;
      const committeeRes = roleResults[i + 1] as { status: string; result?: boolean } | undefined;
      const grantIdRes = roleResults[i + 2] as { status: string; result?: bigint } | undefined;

      if (grantIdRes?.status === 'success' && grantIdRes.result !== undefined) {
        const gid = grantIdRes.result;
        
        if (builderRes?.status === 'success' && builderRes.result?.toLowerCase() === address.toLowerCase()) {
          builderIds.push(gid);
        }
        
        if (committeeRes?.status === 'success' && committeeRes.result) {
          committeeIds.push(gid);
        }
      }
    }

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


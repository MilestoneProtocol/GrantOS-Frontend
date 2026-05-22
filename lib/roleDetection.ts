'use client';

import {
  CONTRACTS_READY,
  GRANT_FACTORY_ADDRESS,
  grantEscrowAbi,
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
} from '@/lib/escrow';
import { factoryIndexRange, safeFactoryGrantCount } from '@/lib/grant-factory-read';
import { useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';

export type DetectedRoles = {
  loading: boolean;
  address?: `0x${string}`;
  isVerified: boolean;
  builderGrantIds: bigint[];
  committeeGrantIds: bigint[];
  grantorGrantIds: bigint[];
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

const grantCountAbi = [
  {
    type: 'function',
    name: 'grantCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const factoryGrantsAbi = [
  {
    type: 'function',
    name: 'grants',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

export function useRoleDetection(): DetectedRoles {
  const { address, status } = useAccount();
  const enabled = Boolean(address) && CONTRACTS_READY;

  const countRead = useReadContracts({
    contracts: enabled
      ? [
          {
            address: GRANT_FACTORY_ADDRESS,
            abi: grantCountAbi,
            functionName: 'grantCount',
          },
        ]
      : [],
    query: { enabled },
  });

  const grantCount = safeFactoryGrantCount(
    countRead.data?.[0]?.result as bigint | undefined,
  );

  const factoryIndices = useMemo(
    () => factoryIndexRange(grantCount),
    [grantCount],
  );

  const escrowReads = useReadContracts({
    contracts: factoryIndices.map((index) => ({
      address: GRANT_FACTORY_ADDRESS,
      abi: factoryGrantsAbi,
      functionName: 'grants',
      args: [index],
    })),
    query: { enabled: enabled && factoryIndices.length > 0 },
  });

  const escrowAddresses = useMemo(() => {
    return (escrowReads.data ?? [])
      .map((r) => r.result as `0x${string}` | undefined)
      .filter((a): a is `0x${string}` => Boolean(a && a !== '0x0000000000000000000000000000000000000000'));
  }, [escrowReads.data]);

  const roleContracts = useMemo(() => {
    if (!enabled || !address) return [];
    const base = [
      {
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryAbi,
        functionName: 'isVerified' as const,
        args: [address] as const,
      },
    ];
    const perEscrow = escrowAddresses.flatMap((addr) => [
      {
        address: addr,
        abi: grantEscrowAbi,
        functionName: 'builder' as const,
      },
      {
        address: addr,
        abi: grantEscrowAbi,
        functionName: 'isCommitteeMember' as const,
        args: [address] as const,
      },
      {
        address: addr,
        abi: grantEscrowAbi,
        functionName: 'grantId' as const,
      },
      {
        address: addr,
        abi: grantEscrowAbi,
        functionName: 'grantor' as const,
      },
    ]);
    return [...base, ...perEscrow];
  }, [address, enabled, escrowAddresses]);

  const factoryReady =
    !enabled || (!countRead.isLoading && !countRead.isFetching);
  const escrowReady =
    !enabled || factoryIndices.length === 0 || (!escrowReads.isLoading && !escrowReads.isFetching);

  const roleReads = useReadContracts({
    contracts: roleContracts,
    query: { enabled: enabled && factoryReady && escrowReady && roleContracts.length > 0 },
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
        grantorGrantIds: [],
        isBuilder: false,
        isCommittee: false,
        isDaoAdmin: false,
        isNewWallet: false,
        hasMultipleRoles: false,
      };
    }

    const pending =
      !factoryReady || !escrowReady || roleReads.isLoading || roleReads.isFetching;

    const data = roleReads.data ?? [];
    const verifiedRow = data[0] as { status: string; result?: boolean } | undefined;
    const isVerified =
      verifiedRow?.status === 'success' ? Boolean(verifiedRow.result) : false;

    const builderIds: bigint[] = [];
    const committeeIds: bigint[] = [];
    const grantorIds: bigint[] = [];
    const roleResults = data.slice(1);

    for (let i = 0; i < roleResults.length; i += 4) {
      const builderRes = roleResults[i] as { status: string; result?: string } | undefined;
      const committeeRes = roleResults[i + 1] as { status: string; result?: boolean } | undefined;
      const grantIdRes = roleResults[i + 2] as { status: string; result?: bigint } | undefined;
      const grantorRes = roleResults[i + 3] as { status: string; result?: string } | undefined;

      if (grantIdRes?.status === 'success' && grantIdRes.result !== undefined) {
        const gid = grantIdRes.result;
        if (
          builderRes?.status === 'success' &&
          builderRes.result?.toLowerCase() === address.toLowerCase()
        ) {
          builderIds.push(gid);
        }
        if (committeeRes?.status === 'success' && committeeRes.result) {
          committeeIds.push(gid);
        }
        if (
          grantorRes?.status === 'success' &&
          grantorRes.result?.toLowerCase() === address.toLowerCase()
        ) {
          grantorIds.push(gid);
        }
      }
    }

    const isBuilder = builderIds.length > 0;
    const isCommittee = committeeIds.length > 0;
    const isDaoAdmin = grantorIds.length > 0 || committeeIds.length >= 3;
    const isNewWallet = !isVerified && !isBuilder && !isCommittee && !isDaoAdmin;
    const hasMultipleRoles = isBuilder && isCommittee;

    return {
      loading: pending,
      address: address as `0x${string}`,
      isVerified,
      builderGrantIds: builderIds,
      committeeGrantIds: committeeIds,
      grantorGrantIds: grantorIds,
      isBuilder,
      isCommittee,
      isDaoAdmin,
      isNewWallet,
      hasMultipleRoles,
    };
  }, [
    address,
    escrowReady,
    factoryReady,
    roleReads.data,
    roleReads.isFetching,
    roleReads.isLoading,
    status,
  ]);
}

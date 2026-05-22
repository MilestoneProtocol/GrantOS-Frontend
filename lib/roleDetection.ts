'use client';

import { getPublicApiV1Base } from '@/lib/api-config';
import {
  CONTRACTS_READY,
  GRANT_FACTORY_ADDRESS,
  grantEscrowAbi,
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
} from '@/lib/escrow';
import { factoryIndexRange, safeFactoryGrantCount } from '@/lib/grant-factory-read';
import { useDaoAdminHintStore } from '@/store/daoAdminHintStore';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { parseAbiItem } from 'viem';
import { useAccount, usePublicClient, useReadContracts } from 'wagmi';

const grantCreatedEvent = parseAbiItem(
  'event GrantCreated(uint256 indexed grantId, address indexed escrow, address indexed grantor, address grantee, uint256 totalAmount)',
);

export type DetectedRoles = {
  loading: boolean;
  /**
   * True when any of the role-detection queries is currently fetching, including
   * background refetches. Use this to delay protected-route bounces while the
   * count → escrow addresses → role reads cascade is still settling (e.g. right
   * after a `createGrant` tx).
   */
  isFetching: boolean;
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
   * True when the connected wallet can validly enter more than one protected app shell, so onboarding
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
  const publicClient = usePublicClient();
  const enabled = Boolean(address) && CONTRACTS_READY;
  const hintedDaoAdmin = useDaoAdminHintStore((s) =>
    address ? s.daoAdminAddresses.includes(address.toLowerCase()) : false,
  );

  // Event-log-based grantor check. More reliable than the per-escrow `grantor()`
  // view because `GrantCreated` is indexed by grantor on the factory — one query
  // tells us whether this wallet has ever created a grant, regardless of how many
  // escrows exist or how fast the multi-stage chain reads settle.
  const grantorLogQuery = useQuery({
    queryKey: ['role-detection:grantor-logs', address, GRANT_FACTORY_ADDRESS],
    queryFn: async () => {
      if (!publicClient || !address) return false;
      try {
        const logs = await publicClient.getLogs({
          address: GRANT_FACTORY_ADDRESS,
          event: grantCreatedEvent,
          args: { grantor: address },
          fromBlock: 'earliest',
          toBlock: 'latest',
        });
        return logs.length > 0;
      } catch (err) {
        // Some RPCs cap log ranges. Fall back to a recent window so we still
        // catch wallets that created grants in the last few thousand blocks.
        console.error('role-detection grantor log query failed, retrying narrow:', err);
        try {
          const latest = await publicClient.getBlockNumber();
          const fromBlock = latest > 50_000n ? latest - 50_000n : 0n;
          const logs = await publicClient.getLogs({
            address: GRANT_FACTORY_ADDRESS,
            event: grantCreatedEvent,
            args: { grantor: address },
            fromBlock,
            toBlock: latest,
          });
          return logs.length > 0;
        } catch {
          return false;
        }
      }
    },
    enabled: enabled && Boolean(publicClient),
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  const isGrantorByLog = Boolean(grantorLogQuery.data);

  // Backend-based committee membership check. The backend is the source of
  // truth for committee data the moment ReviewConfirm POSTs it — independent
  // of RPC indexing or per-escrow on-chain reads, and works across any browser
  // or device. Used as an additive signal alongside the on-chain check.
  const committeeBackendQuery = useQuery({
    queryKey: ['role-detection:committee-backend', address],
    queryFn: async () => {
      if (!address) return false;
      try {
        const apiBase = getPublicApiV1Base();
        const res = await fetch(`${apiBase}/grants/committee?address=${address}`);
        if (!res.ok) return false;
        const data = (await res.json()) as unknown;
        return Array.isArray(data) && data.length > 0;
      } catch (err) {
        console.error('role-detection committee backend query failed:', err);
        return false;
      }
    },
    enabled: Boolean(address),
    staleTime: 10_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  const isCommitteeByBackend = Boolean(committeeBackendQuery.data);

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
    query: {
      enabled,
      // Cache freshness: short, so post-tx navigations refresh; not zero, so quick
      // re-mounts don't churn. Background refreshes happen via the interval below.
      staleTime: 5_000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchInterval: enabled ? 15_000 : false,
    },
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
    query: {
      enabled: enabled && factoryIndices.length > 0,
      staleTime: 5_000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchInterval: enabled ? 15_000 : false,
    },
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
    // Per-escrow reads. Use `getGrant()` (single tuple) to obtain both the
    // builder (grantee) AND the committee array in one call, then derive
    // membership client-side. Avoids depending on the per-address
    // `isCommitteeMember()` view, which can be unreliable on freshly-created
    // escrows. `grantId` and `grantor` stay as separate reads since they're
    // not part of the `getGrant` tuple.
    const perEscrow = escrowAddresses.flatMap((addr) => [
      {
        address: addr,
        abi: grantEscrowAbi,
        functionName: 'getGrant' as const,
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

  // Only count the FIRST load as "not ready"; background refetches keep the previously
  // resolved data and must not flip `loading` back on, otherwise the role-detect skeleton
  // flickers every refetch interval.
  const factoryReady = !enabled || !countRead.isLoading;
  const escrowReady =
    !enabled || factoryIndices.length === 0 || !escrowReads.isLoading;

  const roleReads = useReadContracts({
    contracts: roleContracts,
    query: {
      enabled: enabled && factoryReady && escrowReady && roleContracts.length > 0,
      staleTime: 5_000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchInterval: enabled ? 15_000 : false,
    },
  });

  return useMemo((): DetectedRoles => {
    const walletResolved = status !== 'connecting' && status !== 'reconnecting';

    if (!address || !walletResolved) {
      return {
        loading: false,
        isFetching: false,
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
      !factoryReady ||
      !escrowReady ||
      roleReads.isLoading ||
      grantorLogQuery.isLoading ||
      committeeBackendQuery.isLoading;
    const anyFetching =
      countRead.isFetching ||
      escrowReads.isFetching ||
      roleReads.isFetching ||
      grantorLogQuery.isFetching ||
      committeeBackendQuery.isFetching;

    const data = roleReads.data ?? [];
    const verifiedRow = data[0] as { status: string; result?: boolean } | undefined;
    const isVerified =
      verifiedRow?.status === 'success' ? Boolean(verifiedRow.result) : false;

    const builderIds: bigint[] = [];
    const committeeIds: bigint[] = [];
    const grantorIds: bigint[] = [];
    const roleResults = data.slice(1);
    const lowerAddr = address.toLowerCase();

    type GrantTuple = {
      builder: `0x${string}`;
      streaming: boolean;
      committee: readonly `0x${string}`[];
      quorum: bigint;
      createdAt: bigint;
      milestones: readonly unknown[];
    };

    for (let i = 0; i < roleResults.length; i += 3) {
      const grantRes = roleResults[i] as
        | { status: string; result?: GrantTuple }
        | undefined;
      const grantIdRes = roleResults[i + 1] as
        | { status: string; result?: bigint }
        | undefined;
      const grantorRes = roleResults[i + 2] as
        | { status: string; result?: string }
        | undefined;

      if (grantIdRes?.status === 'success' && grantIdRes.result !== undefined) {
        const gid = grantIdRes.result;

        if (grantRes?.status === 'success' && grantRes.result) {
          // Builder (grantee) check.
          if (grantRes.result.builder?.toLowerCase() === lowerAddr) {
            builderIds.push(gid);
          }
          // Committee check — client-side membership lookup against the
          // committee array returned by `getGrant`. More robust than the
          // per-address `isCommitteeMember` view.
          const onCommittee = grantRes.result.committee?.some(
            (m) => m.toLowerCase() === lowerAddr,
          );
          if (onCommittee) {
            committeeIds.push(gid);
          }
        }

        if (
          grantorRes?.status === 'success' &&
          grantorRes.result?.toLowerCase() === lowerAddr
        ) {
          grantorIds.push(gid);
        }
      }
    }

    const isBuilder = builderIds.length > 0;
    // Committee membership = any of:
    //   1. On-chain: `committee[]` from `getGrant()` includes this wallet on any escrow.
    //   2. Backend: `/grants/committee?address=…` returns grants for this wallet.
    //      Faster than on-chain reads and not affected by RPC indexing delays.
    const isCommittee = committeeIds.length > 0 || isCommitteeByBackend;
    // DAO admin = any of:
    //   1. Local hint: wallet just signed a createGrant in this browser.
    //   2. Event log: factory `GrantCreated` event emitted with this wallet as grantor
    //      (works across browsers/sessions, doesn't depend on per-escrow reads).
    //   3. On-chain `grantor()` view aggregated across all escrows.
    //   4. Legacy: wallet sits on 3+ committees.
    const isDaoAdmin =
      hintedDaoAdmin ||
      isGrantorByLog ||
      grantorIds.length > 0 ||
      committeeIds.length >= 3;
    const isNewWallet = !isVerified && !isBuilder && !isCommittee && !isDaoAdmin;
    // DAO admin subsumes committee — a grantor sitting on their own grant's committee
    // is still one surface (/dao), not two. Builder/verified is always a separate surface.
    const protectedRoleCount =
      Number(isBuilder || isVerified) +
      Number(isCommittee && !isDaoAdmin) +
      Number(isDaoAdmin);
    const hasMultipleRoles = protectedRoleCount > 1;

    return {
      loading: pending,
      isFetching: anyFetching,
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
    committeeBackendQuery.isFetching,
    committeeBackendQuery.isLoading,
    countRead.isFetching,
    escrowReads.isFetching,
    escrowReady,
    factoryReady,
    grantorLogQuery.isFetching,
    grantorLogQuery.isLoading,
    hintedDaoAdmin,
    isCommitteeByBackend,
    isGrantorByLog,
    roleReads.data,
    roleReads.isFetching,
    roleReads.isLoading,
    status,
  ]);
}

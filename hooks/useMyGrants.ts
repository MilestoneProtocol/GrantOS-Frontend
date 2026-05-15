'use client';

import { loadDemoMyGrants } from '@/lib/my-grants/demo-history';
import type { MyGrantRecord } from '@/lib/my-grants/types';
import { computeSummary, mapChainGrantToRecord } from '@/lib/my-grants/utils';
import { GRANT_ESCROW_ADDRESS, grantEscrowReadAbi } from '@/lib/escrow';
import { useMemo } from 'react';
import { type Address } from 'viem';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';

type GrantFromChain = {
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

export function useMyGrants() {
  const { address } = useAccount();
  const enabled = Boolean(address);

  const builderIdsReadA = useReadContract({
    address: GRANT_ESCROW_ADDRESS,
    abi: [{ type: 'function', name: 'getGrantsByBuilder', stateMutability: 'view', inputs: [{ name: 'builder', type: 'address' }], outputs: [{ type: 'uint256[]' }] }] as const,
    functionName: 'getGrantsByBuilder',
    args: address ? [address] : undefined,
    query: { enabled },
  });
  const builderIdsReadB = useReadContract({
    address: GRANT_ESCROW_ADDRESS,
    abi: [{ type: 'function', name: 'getBuilderGrantIds', stateMutability: 'view', inputs: [{ name: 'builder', type: 'address' }], outputs: [{ type: 'uint256[]' }] }] as const,
    functionName: 'getBuilderGrantIds',
    args: address ? [address] : undefined,
    query: { enabled },
  });
  const builderIdsReadC = useReadContract({
    address: GRANT_ESCROW_ADDRESS,
    abi: [{ type: 'function', name: 'getGrantsForBuilder', stateMutability: 'view', inputs: [{ name: 'builder', type: 'address' }], outputs: [{ type: 'uint256[]' }] }] as const,
    functionName: 'getGrantsForBuilder',
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const builderGrantIds = useMemo(() => {
    const pick = (v: unknown): bigint[] => (Array.isArray(v) ? (v as bigint[]) : []);
    const a = pick(builderIdsReadA.data);
    if (a.length > 0) return a;
    const b = pick(builderIdsReadB.data);
    if (b.length > 0) return b;
    return pick(builderIdsReadC.data);
  }, [builderIdsReadA.data, builderIdsReadB.data, builderIdsReadC.data]);

  const grantsRead = useReadContracts({
    contracts: builderGrantIds.map((id) => ({
      address: GRANT_ESCROW_ADDRESS,
      abi: grantEscrowReadAbi,
      functionName: 'getGrant',
      args: [id],
    })),
    query: { enabled: builderGrantIds.length > 0 },
  });

  const statusContracts = useMemo(() => {
    if (!grantsRead.data) return [];
    const out: Array<{
      address: typeof GRANT_ESCROW_ADDRESS;
      abi: typeof grantEscrowReadAbi;
      functionName: 'getMilestoneStatus';
      args: readonly [bigint, bigint];
    }> = [];
    grantsRead.data.forEach((entry, gi) => {
      const row = entry as { status: string; result?: GrantFromChain };
      if (row.status !== 'success' || !row.result) return;
      const id = builderGrantIds[gi];
      if (id === undefined) return;
      for (let i = 0; i < row.result.milestones.length; i++) {
        out.push({
          address: GRANT_ESCROW_ADDRESS,
          abi: grantEscrowReadAbi,
          functionName: 'getMilestoneStatus',
          args: [id, BigInt(i)],
        });
      }
    });
    return out;
  }, [builderGrantIds, grantsRead.data]);

  const statusRead = useReadContracts({
    contracts: statusContracts,
    query: { enabled: statusContracts.length > 0 },
  });

  const loading =
    builderIdsReadA.isLoading ||
    builderIdsReadB.isLoading ||
    builderIdsReadC.isLoading ||
    (builderGrantIds.length > 0 && grantsRead.isLoading) ||
    (statusContracts.length > 0 && statusRead.isLoading);

  const grants = useMemo((): MyGrantRecord[] => {
    if (!address) return [];

    const byKey = new Map<string, MyGrantRecord>();

    if (grantsRead.data) {
      let statusIdx = 0;
      grantsRead.data.forEach((entry, gi) => {
        const row = entry as { status: string; result?: GrantFromChain };
        if (row.status !== 'success' || !row.result) return;
        if (row.result.builder.toLowerCase() !== address.toLowerCase()) return;
        const id = builderGrantIds[gi];
        if (id === undefined) return;
        const statuses: number[] = [];
        for (let i = 0; i < row.result.milestones.length; i++) {
          const r = statusRead.data?.[statusIdx];
          statusIdx += 1;
          statuses.push(r?.status === 'success' ? Number(r.result) : 0);
        }
        const record = mapChainGrantToRecord(id, row.result, statuses);
        byKey.set(record.key, record);
      });
    }

    for (const demo of loadDemoMyGrants(address)) {
      if (!byKey.has(demo.key)) byKey.set(demo.key, demo);
    }

    return Array.from(byKey.values());
  }, [address, builderGrantIds, grantsRead.data, statusRead.data]);

  const summary = useMemo(() => computeSummary(grants), [grants]);
  const activeGrantCount = summary.activeGrants;

  return {
    address,
    grants,
    summary,
    activeGrantCount,
    loading,
    isEmpty: !loading && grants.length === 0,
  };
}

/** Lightweight count for sidebar badge without duplicating full page logic elsewhere. */
export function useBuilderActiveGrantCount(): number {
  const { activeGrantCount, loading } = useMyGrants();
  return loading ? 0 : activeGrantCount;
}

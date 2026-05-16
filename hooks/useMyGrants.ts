'use client';

import { loadDemoMyGrants } from '@/lib/my-grants/demo-history';
import type { MyGrantRecord } from '@/lib/my-grants/types';
import { computeSummary, mapChainGrantToRecord } from '@/lib/my-grants/utils';
import { GRANT_FACTORY_ADDRESS, grantFactoryAbi, GRANT_ESCROW_ADDRESS, grantEscrowReadAbi } from '@/lib/escrow';
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

  const { data: countData, isLoading: isCountLoading } = useReadContract({
    address: GRANT_FACTORY_ADDRESS,
    abi: grantFactoryAbi,
    functionName: 'grantCount',
  });

  const grantCount = Number(countData || BigInt(0));

  const factoryGrantContracts = useMemo(() => {
    return Array.from({ length: grantCount }, (_, i) => ({
      address: GRANT_FACTORY_ADDRESS,
      abi: grantFactoryAbi,
      functionName: 'grants',
      args: [BigInt(i)],
    }));
  }, [grantCount]);

  const { data: escrowAddressesData, isLoading: isAddressesLoading } = useReadContracts({
    contracts: factoryGrantContracts,
    query: { enabled: grantCount > 0 },
  });

  const escrowAddresses = useMemo(() => {
    if (!escrowAddressesData) return [];
    return escrowAddressesData.map((r: any) =>
      r.status === 'success' && r.result ? r.result : '0x0000000000000000000000000000000000000000',
    );
  }, [escrowAddressesData]);

  const grantContracts = useMemo(() => {
    return escrowAddresses.map((addr) => ({
      address: addr as Address,
      abi: grantEscrowReadAbi,
      functionName: 'getGrant',
    }));
  }, [escrowAddresses]);

  const grantsRead = useReadContracts({
    contracts: grantContracts,
    query: { enabled: grantContracts.length > 0 },
  });

  const statusContracts = useMemo(() => {
    if (!grantsRead.data) return [];
    const out: Array<{
      address: Address;
      abi: typeof grantEscrowReadAbi;
      functionName: 'getMilestoneStatus';
      args: readonly [bigint];
    }> = [];
    grantsRead.data.forEach((entry, gi) => {
      const row = entry as { status: string; result?: GrantFromChain };
      if (row.status !== 'success' || !row.result) return;
      const addr = escrowAddresses[gi];
      if (!addr || addr === '0x0000000000000000000000000000000000000000') return;
      for (let i = 0; i < row.result.milestones.length; i++) {
        out.push({
          address: addr as Address,
          abi: grantEscrowReadAbi,
          functionName: 'getMilestoneStatus',
          args: [BigInt(i)],
        });
      }
    });
    return out;
  }, [escrowAddresses, grantsRead.data]);

  const statusRead = useReadContracts({
    contracts: statusContracts,
    query: { enabled: statusContracts.length > 0 },
  });

  const loading =
    isCountLoading ||
    isAddressesLoading ||
    (grantContracts.length > 0 && grantsRead.isLoading) ||
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
        const id = BigInt(gi);
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
  }, [address, grantsRead.data, statusRead.data]);

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

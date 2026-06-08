'use client';

import {
  CONTRACTS_READY,
  escrowLifecycleEventsAbi,
  escrowMetaAbi,
  factoryGrantCreatedEventsAbi,
  GRANT_FACTORY_ADDRESS,
  grantFactoryAbi,
  sentinelWarningEventsAbi,
} from '@/lib/escrow';
import { useEffect, useMemo, useRef } from 'react';
import type { Address } from 'viem';
import { usePublicClient, useReadContract, useReadContracts } from 'wagmi';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/**
 * Invoke `onActivity` whenever any relevant on-chain grant event fires:
 *  - per-grant escrow lifecycle (submitted / vote / approved / rejected /
 *    slashed / cancelled),
 *  - `GrantCreated` from the factory,
 *  - `WarningIssued` from the shared SentinelEAS.
 *
 * Self-contained: resolves every grant's escrow address (and the sentinel)
 * from the factory internally, so callers only provide a refresh callback.
 * Grants are deployed one escrow per grant, so we can't watch a single shared
 * escrow — this attaches one imperative watcher per escrow. The resolution
 * reads share wagmi's query cache, so multiple callers don't multiply RPC load.
 */
export function useGrantActivityWatcher(
  onActivity: () => void,
  enabled: boolean,
) {
  const publicClient = usePublicClient();

  // Latest callback without forcing the watcher effect to re-subscribe.
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  const countRead = useReadContract({
    address: GRANT_FACTORY_ADDRESS,
    abi: grantFactoryAbi,
    functionName: 'grantCount',
    query: { enabled: enabled && CONTRACTS_READY },
  });
  const grantCount = Number((countRead.data as bigint | undefined) ?? 0n);

  const grantsContracts = useMemo(
    () =>
      Array.from({ length: grantCount }, (_, i) => ({
        address: GRANT_FACTORY_ADDRESS,
        abi: grantFactoryAbi,
        functionName: 'grants' as const,
        args: [BigInt(i)] as const,
      })),
    [grantCount],
  );

  const grantsRead = useReadContracts({
    contracts: grantsContracts,
    query: { enabled: enabled && CONTRACTS_READY && grantCount > 0 },
  });

  const escrowAddresses = useMemo(
    () =>
      (grantsRead.data ?? [])
        .map((r) => (r.status === 'success' ? (r.result as Address) : undefined))
        .filter((a): a is Address => Boolean(a && a !== ZERO_ADDRESS)),
    [grantsRead.data],
  );

  const firstEscrow = escrowAddresses[0];
  const sentinelRead = useReadContract({
    address: firstEscrow,
    abi: escrowMetaAbi,
    functionName: 'sentinel',
    query: { enabled: enabled && Boolean(firstEscrow) },
  });
  const sentinelAddress = sentinelRead.data as Address | undefined;

  // Stable dependency so identical escrow sets don't churn subscriptions.
  const escrowKey = escrowAddresses.join(',');

  useEffect(() => {
    if (!enabled || !publicClient) return;
    const fire = () => onActivityRef.current();
    const unwatchers: Array<() => void> = [];

    unwatchers.push(
      publicClient.watchContractEvent({
        address: GRANT_FACTORY_ADDRESS,
        abi: factoryGrantCreatedEventsAbi,
        eventName: 'GrantCreated',
        onLogs: fire,
      }),
    );

    for (const escrow of escrowKey ? (escrowKey.split(',') as Address[]) : []) {
      unwatchers.push(
        publicClient.watchContractEvent({
          address: escrow,
          abi: escrowLifecycleEventsAbi,
          onLogs: fire,
        }),
      );
    }

    if (sentinelAddress) {
      unwatchers.push(
        publicClient.watchContractEvent({
          address: sentinelAddress,
          abi: sentinelWarningEventsAbi,
          eventName: 'WarningIssued',
          onLogs: fire,
        }),
      );
    }

    return () => {
      for (const unwatch of unwatchers) unwatch();
    };
  }, [enabled, publicClient, escrowKey, sentinelAddress]);
}

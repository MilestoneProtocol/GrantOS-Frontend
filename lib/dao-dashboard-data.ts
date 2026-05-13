'use client';

import type { DaoDashboardSnapshot, DaoGrantCardModel } from '@/demo/dao-dashboard';
import { getDaoDashboardSnapshot } from '@/demo/dao-dashboard';
import { useCallback, useEffect, useMemo, useState } from 'react';

const POLL_MS = 30_000;

/**
 * DAO dashboard aggregate + grant rows. `pollTick` increments every 30s so
 * hero slash + ZK counters climb (upward tick animation). Production swaps
 * this for GrantEscrow / ReputationRegistry / indexer reads.
 */
export function useDaoDashboardData(): {
  snapshot: DaoDashboardSnapshot;
  pollTick: number;
  refetch: () => void;
} {
  const [pollTick, setPollTick] = useState(0);

  const refetch = useCallback(() => {
    setPollTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const id = window.setInterval(refetch, POLL_MS);
    return () => window.clearInterval(id);
  }, [refetch]);

  const snapshot = useMemo(
    () => getDaoDashboardSnapshot(pollTick),
    [pollTick],
  );

  return { snapshot, pollTick, refetch };
}

export function filterDaoGrants(
  grants: DaoGrantCardModel[],
  selectedFilters: Set<string>,
  searchQuery: string,
): DaoGrantCardModel[] {
  const q = searchQuery.trim().toLowerCase();
  const useFilter = selectedFilters.size > 0;

  return grants.filter((g) => {
    if (useFilter) {
      let match = false;
      for (const f of selectedFilters) {
        if (f === 'streaming' && g.tags.includes('streaming')) match = true;
        if (f === 'slashed' && g.hasSlashed) match = true;
        if (f === 'warning_issued' && g.hasWarning) match = true;
        if (f === 'active' && g.tags.includes('active')) match = true;
        if (f === 'completed' && g.tags.includes('completed')) match = true;
      }
      if (!match) return false;
    }
    if (!q) return true;
    const idMatch = g.displayId.toLowerCase().includes(q);
    const builderMatch = g.builder.toLowerCase().includes(q);
    return idMatch || builderMatch;
  });
}

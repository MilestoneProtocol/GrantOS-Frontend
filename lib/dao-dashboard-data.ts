'use client';

import type { DaoDashboardSnapshot, DaoGrantCardModel } from '@/demo/dao-dashboard';
import { useDaoDashboardStore } from '@/lib/dao-dashboard-store';
import { useCallback, useEffect, useState } from 'react';

const POLL_MS = 30_000;

/**
 * DAO dashboard aggregate + grant rows. Prefer `useDaoDashboardStore` on the DAO page;
 * this hook exposes the same snapshot with a poll tick for legacy callers.
 */
export function useDaoDashboardData(): {
  snapshot: DaoDashboardSnapshot;
  pollTick: number;
  refetch: () => void;
} {
  const snapshot = useDaoDashboardStore((s) => s.snapshot);
  const [pollTick, setPollTick] = useState(0);

  const refetch = useCallback(() => {
    setPollTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const id = window.setInterval(refetch, POLL_MS);
    return () => window.clearInterval(id);
  }, [refetch]);

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

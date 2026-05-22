'use client';

import type { DaoDashboardSnapshot, DaoGrantCardModel } from '@/demo/dao-dashboard';
import { create } from 'zustand';

/**
 * DAO dashboard store (Zustand).
 *
 * Pages hydrate this store from on-chain reads and backend APIs via `setSnapshot`.
 */

type DaoDashboardState = {
  snapshot: DaoDashboardSnapshot;
  pollTick: number;
  openGrant: DaoGrantCardModel | null;
  setOpenGrant: (grant: DaoGrantCardModel | null) => void;
  refresh: () => void;
  setSnapshot: (snapshot: DaoDashboardSnapshot) => void;
};

const EMPTY_SNAPSHOT: DaoDashboardSnapshot = {
  hero: {
    totalUsdcLocked: 0,
    activeGrants: 0,
    milestonesDueThisWeek: 0,
    totalReleasedThisMonth: 0,
    liveSlashCounterUsdc: 0,
    totalZkProofsVerified: 0,
  },
  grants: [],
};

export const useDaoDashboardStore = create<DaoDashboardState>((set) => ({
  snapshot: EMPTY_SNAPSHOT,
  pollTick: 0,
  openGrant: null,
  setOpenGrant: (grant) => set({ openGrant: grant }),
  refresh: () => {
    /* Refreshed by page-level chain/backend fetches calling setSnapshot. */
  },
  setSnapshot: (snapshot) => set({ snapshot }),
}));

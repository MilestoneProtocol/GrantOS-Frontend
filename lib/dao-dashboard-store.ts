'use client';

import type { DaoDashboardSnapshot, DaoGrantCardModel } from '@/demo/dao-dashboard';
import { getDaoDashboardSnapshot } from '@/demo/dao-dashboard';
import { create } from 'zustand';

/**
 * DAO dashboard store (Zustand).
 *
 * PRD: "All grant data is fetched once on page load via a single
 * useReadContracts batch call across all relevant GrantEscrow.sol read
 * functions. Store the result in Zustand. Polling refreshes the Zustand
 * store every 30 seconds."
 *
 * Implementation note
 * -------------------
 * The repo doesn't yet expose a full GrantEscrow read surface for DAO-wide
 * aggregates, so this store is demo-backed for now (uses
 * `getDaoDashboardSnapshot(pollTick)`). The shape and polling behavior match
 * the PRD; wiring the real `useReadContracts` multicall is a drop-in
 * replacement inside `refreshFromChain`.
 */

type DaoDashboardState = {
  snapshot: DaoDashboardSnapshot;
  /** increments on refresh; used by demo snapshot to bump monotonic counters */
  pollTick: number;
  /** currently selected grant (drawer) */
  openGrant: DaoGrantCardModel | null;
  setOpenGrant: (grant: DaoGrantCardModel | null) => void;
  /** refresh snapshot (demo or onchain) */
  refresh: () => void;
  /** overwrite snapshot (future: from onchain batch result) */
  setSnapshot: (snapshot: DaoDashboardSnapshot) => void;
};

const initialSnapshot = getDaoDashboardSnapshot(0);

export const useDaoDashboardStore = create<DaoDashboardState>((set, get) => ({
  snapshot: initialSnapshot,
  pollTick: 0,
  openGrant: null,
  setOpenGrant: (grant) => set({ openGrant: grant }),
  refresh: () => {
    const nextTick = get().pollTick + 1;
    set({
      pollTick: nextTick,
      snapshot: getDaoDashboardSnapshot(nextTick),
    });
  },
  setSnapshot: (snapshot) => set({ snapshot }),
}));


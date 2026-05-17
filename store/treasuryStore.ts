'use client';

import {
  getTreasurySnapshot,
  type TreasuryActivityFilter,
  type TreasurySnapshot,
  type TreasuryTimeRange,
} from '@/lib/treasury';
import { create } from 'zustand';

/**
 * Treasury Command Center store.
 *
 * Single source of truth for the global time range (drives every chart on
 * the page) and the activity feed filter pills. The snapshot itself is
 * regenerated on a 30s poll — production wiring swaps `getTreasurySnapshot`
 * for a `useReadContracts` batch over the new `GrantEscrow` views.
 */

type ChartMode = 'bar' | 'line';

type TreasuryState = {
  snapshot: TreasurySnapshot;
  range: TreasuryTimeRange;
  chartMode: ChartMode;
  activityFilter: TreasuryActivityFilter;
  pollTick: number;
  setRange: (r: TreasuryTimeRange) => void;
  setChartMode: (m: ChartMode) => void;
  setActivityFilter: (f: TreasuryActivityFilter) => void;
  refresh: () => void;
};

const initialSnapshot = getTreasurySnapshot();

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  snapshot: initialSnapshot,
  range: '30D',
  chartMode: 'bar',
  activityFilter: 'all',
  pollTick: 0,
  setRange: (range) => set({ range }),
  setChartMode: (chartMode) => set({ chartMode }),
  setActivityFilter: (activityFilter) => set({ activityFilter }),
  refresh: () => {
    set({
      pollTick: get().pollTick + 1,
      snapshot: getTreasurySnapshot(),
    });
  },
}));

'use client';

import {
  getTreasurySnapshot,
  type TreasuryActivityFilter,
  type TreasurySnapshot,
  type TreasuryTimeRange,
} from '@/lib/treasury';
import { isUiDemoMode } from '@/demo';
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
  setSnapshot: (snapshot: TreasurySnapshot) => void;
  refresh: () => void;
};

const initialSnapshot: TreasurySnapshot = isUiDemoMode()
  ? getTreasurySnapshot()
  : {
      hero: {
        totalUsdcLocked: 0,
        totalReleasedAllTime: 0,
        totalRecoveredViaSlashing: 0,
        currentlyStreamingFlowRate: 0,
        totalGrantsCreated: 0,
        averageGrantSizeUsdc: 0,
        sparks: {
          locked: [],
          released: [],
          recovered: [],
          streaming: [],
          grants: [],
          avgSize: [],
        },
        delta: {
          locked: 0,
          released: 0,
          recovered: 0,
          streaming: 0,
          grants: 0,
          avgSize: 0,
        },
      },
      cashFlow: {
        '7D': [],
        '30D': [],
        '90D': [],
        '12M': [],
        'ALL': [],
      },
      escrow: [],
      streams: [],
      slashes: [],
      projections: {
        totalIfApprovedUsdc: 0,
        thisMonthUsdc: 0,
        nextMonthUsdc: 0,
        upcoming: [],
      },
      activity: [],
    };

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  snapshot: initialSnapshot,
  range: '30D',
  chartMode: 'bar',
  activityFilter: 'all',
  pollTick: 0,
  setRange: (range) => set({ range }),
  setChartMode: (chartMode) => set({ chartMode }),
  setActivityFilter: (activityFilter) => set({ activityFilter }),
  setSnapshot: (snapshot) => set({ snapshot }),
  refresh: () => {
    if (isUiDemoMode()) {
      set({
        pollTick: get().pollTick + 1,
        snapshot: getTreasurySnapshot(),
      });
    }
  },
}));

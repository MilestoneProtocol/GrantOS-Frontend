'use client';

import {
  generateDaoAlerts,
  type DaoAlert,
  type DaoAlertsInput,
} from '@/lib/alerts';
import {
  daoReputationCriticalNotification,
  daoTreasuryAlertNotification,
} from '@/lib/notifications';
import type { DaoDashboardSnapshot } from '@/demo/dao-dashboard';
import { useNotificationStore } from '@/store/notificationStore';
import { create } from 'zustand';
import type { Address } from 'viem';

type AlertsState = {
  alerts: DaoAlert[];
  collapsed: boolean;
  /** ids seen on last refresh — used to fire notifications only for new alerts */
  knownAlertIds: Set<string>;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  refresh: (input: DaoAlertsInput) => void;
  refreshFromSnapshot: (snapshot: DaoDashboardSnapshot) => void;
};

function syncAlertNotifications(
  prevIds: Set<string>,
  next: DaoAlert[],
  snapshot: DaoDashboardSnapshot,
) {
  const addNotification = useNotificationStore.getState().addNotification;

  for (const alert of next) {
    if (prevIds.has(alert.id)) continue;

    if (
      alert.category === 'builder_reputation_critical' &&
      alert.action.kind === 'link' &&
      alert.action.href.startsWith('/builders/')
    ) {
      const builder = alert.action.href.replace(/^\/builders\//, '') as Address;
      addNotification(daoReputationCriticalNotification(builder));
    }

    if (alert.category === 'treasury_threshold') {
      const lockedUsdc = BigInt(Math.round(snapshot.hero.totalUsdcLocked)) * BigInt(1_000_000);
      addNotification(
        daoTreasuryAlertNotification(lockedUsdc, snapshot.hero.activeGrants),
      );
    }
  }
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  collapsed: false,
  knownAlertIds: new Set(),
  setCollapsed: (collapsed) => set({ collapsed }),
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
  refresh: (input) => {
    const prevIds = get().knownAlertIds;
    const alerts = generateDaoAlerts(input);
    syncAlertNotifications(prevIds, alerts, input.snapshot);
    set({
      alerts,
      knownAlertIds: new Set(alerts.map((a) => a.id)),
    });
  },
  refreshFromSnapshot: (snapshot) => {
    get().refresh({ snapshot });
  },
}));

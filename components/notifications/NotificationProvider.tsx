'use client';

import { useBackendNotifications } from '@/lib/backendNotifications';
import { useNotificationListeners } from '@/lib/notifications';
import type { ReactNode } from 'react';

/**
 * Mounts once inside Web3Provider to wire notifications into the store from
 * two complementary sources:
 *  - `useNotificationListeners` — on-chain polling (deadlines, overdue, reputation).
 *  - `useBackendNotifications` — server-pushed events the client can't derive
 *    on-chain (milestone submitted → committee, approve/reject → builder).
 */
export default function NotificationProvider({ children }: { children: ReactNode }) {
  useNotificationListeners();
  useBackendNotifications();
  return children;
}

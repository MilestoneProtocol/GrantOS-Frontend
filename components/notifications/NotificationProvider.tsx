'use client';

import { useNotificationListeners } from '@/lib/notifications';
import type { ReactNode } from 'react';

/**
 * Mounts once inside Web3Provider to wire GrantEscrow event listeners
 * and deadline polling into the notification store.
 */
export default function NotificationProvider({ children }: { children: ReactNode }) {
  useNotificationListeners();
  return children;
}

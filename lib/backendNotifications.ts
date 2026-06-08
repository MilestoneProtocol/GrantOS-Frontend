'use client';

import { getPublicApiV1Base, getPublicBackendOrigin } from '@/lib/api-config';
import {
  useNotificationStore,
  type AppNotification,
} from '@/store/notificationStore';
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAccount } from 'wagmi';

/**
 * Server-pushed notifications.
 *
 * These are the events that can't be derived from on-chain polling on the
 * client — most importantly "a builder submitted a milestone — review now"
 * for committee members, plus milestone approve/reject for builders. The
 * backend creates them in `GrantEventService` and pushes over a Socket.IO
 * `/notifications` namespace; we also seed history over REST on mount.
 *
 * This runs alongside `useNotificationListeners` (on-chain deadline/overdue/
 * reputation polling). The two cover disjoint event types and both feed the
 * same store, deduped by `dedupeKey`.
 */

type BackendNotification = {
  id: string;
  recipientAddress: string;
  type: string;
  role: string;
  category: string;
  title: string;
  message: string;
  source: string;
  href: string;
  read: boolean;
  dedupeKey: string | null;
  createdAt: string;
};

function toStoreNotification(
  n: BackendNotification,
): Omit<AppNotification, 'read'> {
  return {
    id: n.id,
    type: n.type as AppNotification['type'],
    role: n.role as AppNotification['role'],
    category: n.category as AppNotification['category'],
    title: n.title,
    message: n.message,
    source: n.source,
    href: n.href,
    timestamp: new Date(n.createdAt).getTime() || Date.now(),
    dedupeKey: n.dedupeKey ?? undefined,
  };
}

export function useBackendNotifications() {
  const { address } = useAccount();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    // 1. Seed history from REST so already-delivered notifications show up
    //    even if the socket connects late (or not at all).
    const seed = async () => {
      try {
        const apiBase = getPublicApiV1Base();
        const res = await fetch(
          `${apiBase}/notifications?address=${address}`,
        );
        if (!res.ok || cancelled) return;
        const list = (await res.json()) as BackendNotification[];
        if (cancelled || !Array.isArray(list)) return;
        // Backend returns newest-first; replay oldest-first so the store's
        // prepend leaves the newest on top. Honor the server `read` flag.
        for (const n of [...list].reverse()) {
          addNotification(toStoreNotification(n));
          if (n.read) markAsRead(n.id);
        }
      } catch (err) {
        console.error('Failed to seed backend notifications:', err);
      }
    };
    void seed();

    // 2. Live push via Socket.IO. `dedupeKey` keeps this from double-adding
    //    anything the REST seed already inserted.
    let socket: Socket | null = null;
    try {
      socket = io(`${getPublicBackendOrigin()}/notifications`, {
        query: { address },
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });
      socket.on('notification', (n: BackendNotification) => {
        if (cancelled) return;
        addNotification(toStoreNotification(n));
      });
      socket.on('connect_error', (err) => {
        console.warn('Notification socket connect_error:', err.message);
      });
    } catch (err) {
      console.error('Failed to connect notification socket:', err);
    }

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [address, addNotification, markAsRead]);
}

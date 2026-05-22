'use client';

import { isNotificationTypeEnabled, useSettingsStore } from '@/store/settingsStore';
import { create } from 'zustand';

export type NotificationRole = 'builder' | 'committee' | 'dao';

export type NotificationCategory = 'milestone' | 'deadline' | 'approval' | 'warning' | 'treasury' | 'system';

export type NotificationType =
  | 'grant_created'
  | 'milestone_approved'
  | 'milestone_rejected'
  | 'warning_issued'
  | 'milestone_slashed'
  | 'deadline_approaching'
  | 'milestone_submitted'
  | 'milestone_overdue'
  | 'vote_cast'
  | 'quorum_reached'
  | 'slash_executed'
  | 'grant_created_dao'
  | 'reputation_critical'
  | 'treasury_alert';

export type AppNotification = {
  id: string;
  type: NotificationType;
  role: NotificationRole;
  category: NotificationCategory;
  title: string;
  message: string;
  source: string;
  href: string;
  timestamp: number;
  read: boolean;
  dedupeKey?: string;
};

export type NotificationFilter = 'all' | 'unread' | NotificationCategory;

type NotificationState = {
  notifications: AppNotification[];
  unreadCount: number;
  activeRole: NotificationRole;
  badgePulse: boolean;
  walletAddress: `0x${string}` | null;
  setActiveRole: (role: NotificationRole) => void;
  setWalletAddress: (address: `0x${string}` | null) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'read'> & { id?: string }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearRead: () => void;
  clearAll: () => void;
  reset: () => void;
  acknowledgeBadgePulse: () => void;
};

function computeUnread(notifications: AppNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}

function recomputeUnread(set: (partial: Partial<NotificationState>) => void, notifications: AppNotification[]) {
  set({ notifications, unreadCount: computeUnread(notifications) });
}

const initialState = {
  notifications: [] as AppNotification[],
  unreadCount: 0,
  activeRole: 'builder' as NotificationRole,
  badgePulse: false,
  walletAddress: null as `0x${string}` | null,
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  ...initialState,

  setActiveRole: (role) => set({ activeRole: role }),

  setWalletAddress: (address) => set({ walletAddress: address }),

  addNotification: (incoming) => {
    const { notifications, activeRole, walletAddress } = get();
    const prefs = useSettingsStore.getState().notificationPreferences;
    if (!isNotificationTypeEnabled(incoming.type, prefs)) {
      return;
    }
    if (incoming.dedupeKey && notifications.some((n) => n.dedupeKey === incoming.dedupeKey)) {
      return;
    }

    const id =
      incoming.id ??
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

    const next: AppNotification = {
      ...incoming,
      id,
      read: false,
    };

    const merged = [next, ...notifications].slice(0, 200);
    const unreadCount = computeUnread(merged);
    const shouldPulse = incoming.role === activeRole;

    set({
      notifications: merged,
      unreadCount,
      badgePulse: shouldPulse ? true : get().badgePulse,
      walletAddress: walletAddress ?? null,
    });
  },

  markAsRead: (id) => {
    const notifications = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    recomputeUnread(set, notifications);
  },

  markAllAsRead: () => {
    const { notifications, activeRole } = get();
    const next = notifications.map((n) =>
      n.role === activeRole ? { ...n, read: true } : n,
    );
    recomputeUnread(set, next);
  },

  clearRead: () => {
    const { notifications, activeRole } = get();
    const next = notifications.filter((n) => n.role !== activeRole || !n.read);
    recomputeUnread(set, next);
  },

  clearAll: () => {
    const { notifications, activeRole } = get();
    const next = notifications.filter((n) => n.role !== activeRole);
    recomputeUnread(set, next);
  },

  reset: () => set({ ...initialState }),

  acknowledgeBadgePulse: () => set({ badgePulse: false }),
}));

export function selectNotificationsForRole(
  notifications: AppNotification[],
  role: NotificationRole,
): AppNotification[] {
  return notifications.filter((n) => n.role === role);
}

export function selectUnreadForRole(notifications: AppNotification[], role: NotificationRole): number {
  return notifications.filter((n) => n.role === role && !n.read).length;
}

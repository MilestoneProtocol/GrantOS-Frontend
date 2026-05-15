'use client';

import type { NotificationType } from '@/store/notificationStore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type UsdcDisplayMode = 'rounded' | 'full';
export type TimestampFormatMode = 'relative' | 'absolute';

export type BuilderNotificationPrefs = {
  grantCreated: boolean;
  milestoneApproved: boolean;
  milestoneRejected: boolean;
  warningIssued: boolean;
  deadlineApproaching: boolean;
};

export type CommitteeNotificationPrefs = {
  milestoneSubmitted: boolean;
  milestoneOverdue: boolean;
  voteCast: boolean;
  quorumReached: boolean;
};

export type DaoNotificationPrefs = {
  slashExecuted: boolean;
  grantCreated: boolean;
  reputationCritical: boolean;
  treasuryThreshold: boolean;
  treasuryThresholdUsdc: number;
};

export type NotificationPreferences = {
  builder: BuilderNotificationPrefs;
  committee: CommitteeNotificationPrefs;
  dao: DaoNotificationPrefs;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  builder: {
    grantCreated: true,
    milestoneApproved: true,
    milestoneRejected: true,
    warningIssued: true,
    deadlineApproaching: true,
  },
  committee: {
    milestoneSubmitted: true,
    milestoneOverdue: true,
    voteCast: true,
    quorumReached: true,
  },
  dao: {
    slashExecuted: true,
    grantCreated: true,
    reputationCritical: true,
    treasuryThreshold: true,
    treasuryThresholdUsdc: 500_000,
  },
};

export const SETTINGS_STORAGE_KEY = 'grantos-settings-v1';

type SettingsState = {
  theme: ThemeMode;
  usdcDisplay: UsdcDisplayMode;
  timestampFormat: TimestampFormatMode;
  notificationPreferences: NotificationPreferences;
  settingsOpen: boolean;
  setTheme: (theme: ThemeMode) => void;
  setUsdcDisplay: (mode: UsdcDisplayMode) => void;
  setTimestampFormat: (mode: TimestampFormatMode) => void;
  setNotificationPreferences: (prefs: NotificationPreferences) => void;
  updateBuilderPref: <K extends keyof BuilderNotificationPrefs>(
    key: K,
    value: BuilderNotificationPrefs[K],
  ) => void;
  updateCommitteePref: <K extends keyof CommitteeNotificationPrefs>(
    key: K,
    value: CommitteeNotificationPrefs[K],
  ) => void;
  updateDaoPref: <K extends keyof DaoNotificationPrefs>(key: K, value: DaoNotificationPrefs[K]) => void;
  resetNotificationPreferences: () => void;
  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;
};

export type SettingsTab = 'profile' | 'notifications' | 'display' | 'network';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      usdcDisplay: 'rounded',
      timestampFormat: 'relative',
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      settingsOpen: false,
      settingsTab: 'display',

      setTheme: (theme) => set({ theme }),
      setUsdcDisplay: (usdcDisplay) => set({ usdcDisplay }),
      setTimestampFormat: (timestampFormat) => set({ timestampFormat }),
      setNotificationPreferences: (notificationPreferences) => set({ notificationPreferences }),

      updateBuilderPref: (key, value) =>
        set({
          notificationPreferences: {
            ...get().notificationPreferences,
            builder: { ...get().notificationPreferences.builder, [key]: value },
          },
        }),

      updateCommitteePref: (key, value) =>
        set({
          notificationPreferences: {
            ...get().notificationPreferences,
            committee: { ...get().notificationPreferences.committee, [key]: value },
          },
        }),

      updateDaoPref: (key, value) =>
        set({
          notificationPreferences: {
            ...get().notificationPreferences,
            dao: { ...get().notificationPreferences.dao, [key]: value },
          },
        }),

      resetNotificationPreferences: () =>
        set({ notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES }),

      openSettings: (tab) =>
        set({
          settingsOpen: true,
          ...(tab ? { settingsTab: tab } : {}),
        }),

      closeSettings: () => set({ settingsOpen: false }),

      setSettingsTab: (settingsTab) => set({ settingsTab }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        usdcDisplay: state.usdcDisplay,
        timestampFormat: state.timestampFormat,
        notificationPreferences: state.notificationPreferences,
      }),
    },
  ),
);

const NOTIFICATION_TYPE_PREF: Record<
  NotificationType,
  { role: 'builder' | 'committee' | 'dao'; key: string }
> = {
  grant_created: { role: 'builder', key: 'grantCreated' },
  milestone_approved: { role: 'builder', key: 'milestoneApproved' },
  milestone_rejected: { role: 'builder', key: 'milestoneRejected' },
  warning_issued: { role: 'builder', key: 'warningIssued' },
  deadline_approaching: { role: 'builder', key: 'deadlineApproaching' },
  milestone_slashed: { role: 'builder', key: 'warningIssued' },
  milestone_submitted: { role: 'committee', key: 'milestoneSubmitted' },
  milestone_overdue: { role: 'committee', key: 'milestoneOverdue' },
  vote_cast: { role: 'committee', key: 'voteCast' },
  quorum_reached: { role: 'committee', key: 'quorumReached' },
  slash_executed: { role: 'dao', key: 'slashExecuted' },
  grant_created_dao: { role: 'dao', key: 'grantCreated' },
  reputation_critical: { role: 'dao', key: 'reputationCritical' },
  treasury_alert: { role: 'dao', key: 'treasuryThreshold' },
};

export function isNotificationTypeEnabled(
  type: NotificationType,
  prefs: NotificationPreferences,
): boolean {
  const map = NOTIFICATION_TYPE_PREF[type];
  const bucket = prefs[map.role] as Record<string, boolean | number>;
  return Boolean(bucket[map.key]);
}

export function resolveIsDarkTheme(theme: ThemeMode): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyThemeClass(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark = resolveIsDarkTheme(theme);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

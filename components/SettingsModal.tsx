'use client';

import NetworkTab from '@/app/settings/tabs/NetworkTab';
import NotificationsTab from '@/app/settings/tabs/NotificationsTab';
import ProfileTab from '@/app/settings/tabs/ProfileTab';
import { useSettingsStore, type SettingsTab } from '@/store/settingsStore';
import { X } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'network', label: 'Network' },
];

function TabPanel({ tab }: { tab: SettingsTab }) {
  switch (tab) {
    case 'profile':
      return <ProfileTab />;
    case 'notifications':
      return <NotificationsTab />;
    case 'network':
      return <NetworkTab />;
    default:
      return null;
  }
}

export default function SettingsModal() {
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);
  const settingsTab = useSettingsStore((s) => s.settingsTab);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const setSettingsTab = useSettingsStore((s) => s.setSettingsTab);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings();
    },
    [closeSettings],
  );

  useEffect(() => {
    if (settingsTab === 'display') setSettingsTab('profile');
  }, [settingsTab, setSettingsTab]);

  useEffect(() => {
    if (!settingsOpen) return;
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [onKeyDown, settingsOpen]);

  if (!settingsOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close settings"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-settings-backdrop"
        onClick={closeSettings}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-settings-modal dark:border-slate-700 dark:bg-slate-900 sm:max-h-[min(80vh,720px)] sm:max-w-2xl sm:rounded-2xl md:max-w-3xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-6">
          <h2 id="settings-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Settings
          </h2>
          <button
            type="button"
            onClick={closeSettings}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-100 px-2 dark:border-slate-800 sm:px-4">
          <nav
            aria-label="Settings sections"
            className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {TABS.map(({ id, label }) => {
              const active = settingsTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSettingsTab(id)}
                  className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition sm:px-4 ${
                    active
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <TabPanel tab={settingsTab} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

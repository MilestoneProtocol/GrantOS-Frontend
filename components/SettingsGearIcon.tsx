'use client';

import { useSettingsStore } from '@/store/settingsStore';
import { Settings } from 'lucide-react';

type SettingsGearIconProps = {
  /** Compact icon-only for tablet rail. */
  variant?: 'full' | 'rail';
  className?: string;
};

export default function SettingsGearIcon({ variant = 'full', className = '' }: SettingsGearIconProps) {
  const openSettings = useSettingsStore((s) => s.openSettings);
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);

  const isRail = variant === 'rail';

  return (
    <button
      type="button"
      onClick={() => openSettings()}
      aria-label="Open settings"
      aria-expanded={settingsOpen}
      className={`group flex items-center justify-center rounded-xl border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${
        settingsOpen
          ? 'border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
          : ''
      } ${isRail ? 'h-10 w-10' : 'w-full gap-2.5 px-3 py-2.5'} ${className}`}
    >
      <Settings
        className={`shrink-0 transition group-hover:rotate-45 ${isRail ? 'h-4 w-4' : 'h-4 w-4'}`}
        strokeWidth={2}
        aria-hidden
      />
      {!isRail ? <span className="text-sm font-medium">Settings</span> : null}
    </button>
  );
}

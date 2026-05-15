'use client';

import { applyThemeClass, type ThemeMode, useSettingsStore } from '@/store/settingsStore';
import { Check, Monitor, Moon, Sun } from 'lucide-react';

const OPTIONS: {
  id: ThemeMode;
  label: string;
  sublabel?: string;
  icon: typeof Sun;
  preview: 'light' | 'dark' | 'split';
}[] = [
  { id: 'light', label: 'Light', sublabel: 'Default', icon: Sun, preview: 'light' },
  { id: 'dark', label: 'Dark', icon: Moon, preview: 'dark' },
  { id: 'system', label: 'System', sublabel: 'Follows OS', icon: Monitor, preview: 'split' },
];

function ThemePreview({ variant }: { variant: 'light' | 'dark' | 'split' }) {
  if (variant === 'split') {
    return (
      <div className="flex h-20 w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
        <div className="flex flex-1 flex-col gap-1.5 bg-slate-50 p-2">
          <div className="h-2 w-8 rounded bg-slate-200" />
          <div className="h-2 w-full rounded bg-slate-100" />
          <div className="h-2 w-3/4 rounded bg-slate-100" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 bg-slate-900 p-2">
          <div className="h-2 w-8 rounded bg-slate-600" />
          <div className="h-2 w-full rounded bg-slate-700" />
          <div className="h-2 w-3/4 rounded bg-slate-700" />
        </div>
      </div>
    );
  }

  const isDark = variant === 'dark';
  return (
    <div
      className={`flex h-20 w-full flex-col gap-1.5 rounded-lg border p-2 ${
        isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className={`h-2 w-8 rounded ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
      <div className={`h-2 w-full rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
      <div className={`h-2 w-3/4 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
      <div className={`mt-auto h-2 w-1/2 rounded ${isDark ? 'bg-blue-500/60' : 'bg-blue-200'}`} />
    </div>
  );
}

export default function ThemeSelector() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const select = (mode: ThemeMode) => {
    setTheme(mode);
    applyThemeClass(mode);
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {OPTIONS.map(({ id, label, sublabel, icon: Icon, preview }) => {
        const selected = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => select(id)}
            className={`relative flex flex-col rounded-xl border-2 p-3 text-left transition ${
              selected
                ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600/20 dark:border-blue-500 dark:bg-blue-950/30'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'
            }`}
          >
            {selected ? (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </span>
            ) : null}
            <ThemePreview variant={preview} />
            <span className="mt-3 flex items-center gap-2">
              <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" strokeWidth={2} aria-hidden />
              <span>
                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</span>
                {sublabel ? (
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{sublabel}</span>
                ) : null}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

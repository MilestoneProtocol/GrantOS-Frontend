'use client';

import type { TreasuryTimeRange } from '@/lib/treasury';
import { Bell } from 'lucide-react';
import { useTreasuryStore } from '@/store/treasuryStore';

const RANGES: { id: TreasuryTimeRange; label: string }[] = [
  { id: '7D', label: '7D' },
  { id: '30D', label: '30D' },
  { id: '90D', label: '90D' },
  { id: '12M', label: '12M' },
  { id: 'ALL', label: 'All' },
];

/**
 * Horizontal pill selector for the global time range. A bell icon on the
 * end mirrors the design header strip; clicking the bell scrolls to the
 * Treasury Activity feed since that surface is where new events surface.
 */
export default function TimeRangeSelector() {
  const range = useTreasuryStore((s) => s.range);
  const setRange = useTreasuryStore((s) => s.setRange);

  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label="Time range"
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm"
      >
        {RANGES.map((r) => {
          const active = range === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                active
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <a
        href="#treasury-activity"
        aria-label="Jump to treasury activity"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-700"
      >
        <Bell className="h-4 w-4" aria-hidden />
      </a>
    </div>
  );
}

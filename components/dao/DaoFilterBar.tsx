'use client';

import { AlertTriangle, Gavel, Search, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

export type DaoFilterId =
  | 'all'
  | 'active'
  | 'completed'
  | 'slashed'
  | 'warning_issued'
  | 'streaming';

const FILTER_IDS: { id: DaoFilterId; label: string; icon?: LucideIcon }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'slashed', label: 'Slashed', icon: Gavel },
  { id: 'warning_issued', label: 'Warning Issued', icon: AlertTriangle },
  { id: 'streaming', label: 'Streaming', icon: Waves },
];

type DaoFilterBarProps = {
  search: string;
  onSearchChange: (v: string) => void;
  selected: Set<string>;
  onToggle: (id: DaoFilterId) => void;
  visibleCount: number;
  totalCount: number;
};

/**
 * Multi-select filter pills + search. `all` clears other selections.
 * OR semantics: a grant matches if it satisfies any selected non-all filter.
 */
export default function DaoFilterBar({
  search,
  onSearchChange,
  selected,
  onToggle,
  visibleCount,
  totalCount,
}: DaoFilterBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {FILTER_IDS.map(({ id, label, icon: Icon }) => {
          const isAll = id === 'all';
          const isOn = isAll ? selected.size === 0 : selected.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isOn
                  ? id === 'slashed'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : id === 'warning_issued'
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : id === 'streaming'
                        ? 'border-sky-400 bg-sky-50 text-sky-900'
                        : 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
              }`}
            >
              {Icon && id === 'warning_issued' ? (
                <Icon className="h-3.5 w-3.5 text-amber-600" strokeWidth={2.4} aria-hidden />
              ) : Icon ? (
                <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              ) : null}
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Search grants</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Grant ID or builder address…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </label>
        <p className="whitespace-nowrap text-center text-xs font-medium text-slate-500 sm:text-right">
          Showing{' '}
          <span className="font-bold text-slate-800">{visibleCount}</span> of{' '}
          <span className="font-bold text-slate-800">{totalCount}</span> grants
        </p>
      </div>
    </div>
  );
}

export function useDaoFilters() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const onToggle = useCallback((id: DaoFilterId) => {
    if (id === 'all') {
      setSelected(new Set());
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return useMemo(
    () => ({ search, setSearch, selected, onToggle }),
    [search, selected, onToggle],
  );
}

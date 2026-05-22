'use client';

import type { MyGrantFilterPill, MyGrantSortOption } from '@/lib/my-grants/types';
import { LayoutGrid, List, Search } from 'lucide-react';

const FILTER_PILLS: { id: MyGrantFilterPill; label: string; dot?: boolean }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'slashed', label: 'Slashed' },
  { id: 'warning_issued', label: 'Warning Issued' },
  { id: 'streaming', label: 'Streaming', dot: true },
];

type ViewMode = 'list' | 'timeline';

type MyGrantsFilterBarProps = {
  filters: Set<MyGrantFilterPill>;
  onToggleFilter: (pill: MyGrantFilterPill) => void;
  sort: MyGrantSortOption;
  onSortChange: (sort: MyGrantSortOption) => void;
  search: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showTimelineToggle: boolean;
};

export default function MyGrantsFilterBar({
  filters,
  onToggleFilter,
  sort,
  onSortChange,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  showTimelineToggle,
}: MyGrantsFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_PILLS.map((pill) => {
            const active =
              pill.id === 'all' ? filters.has('all') : filters.has(pill.id);
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onToggleFilter(pill.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {pill.dot ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                ) : null}
                {pill.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search ID or DAO…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as MyGrantSortOption)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-violet-400"
            aria-label="Sort grants"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest_value">Highest Value</option>
            <option value="most_milestones">Most Milestones</option>
          </select>
          {showTimelineToggle ? (
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                aria-pressed={viewMode === 'list'}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                <List className="h-4 w-4" />
                List
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('timeline')}
                aria-pressed={viewMode === 'timeline'}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  viewMode === 'timeline' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Timeline
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

'use client';

import MyGrantsEarningsSection from '@/components/builder/my-grants/MyGrantsEarningsSection';
import MyGrantsFilterBar from '@/components/builder/my-grants/MyGrantsFilterBar';
import MyGrantsGrantList from '@/components/builder/my-grants/MyGrantsGrantList';
import MyGrantsSummaryBar from '@/components/builder/my-grants/MyGrantsSummaryBar';
import MyGrantsTimeline from '@/components/builder/my-grants/MyGrantsTimeline';
import { useMyGrants } from '@/hooks/useMyGrants';
import type { MyGrantFilterPill, MyGrantSortOption } from '@/lib/my-grants/types';
import { filterGrants, sortGrants } from '@/lib/my-grants/utils';
import { FileQuestion } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

function MyGrantsEmptyState() {
  return (
    <section className="flex min-h-[45vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
      <FileQuestion className="h-14 w-14 text-slate-300" strokeWidth={1.25} />
      <h2 className="mt-4 text-2xl font-bold text-slate-900">No grants yet</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
        Your grant history will appear here once a DAO creates a grant for your wallet.
      </p>
    </section>
  );
}

export default function MyGrantsPageContent() {
  const { grants, summary, loading, isEmpty } = useMyGrants();
  const [filters, setFilters] = useState<Set<MyGrantFilterPill>>(new Set(['all']));
  const [sort, setSort] = useState<MyGrantSortOption>('newest');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!isDesktop && viewMode === 'timeline') setViewMode('list');
  }, [isDesktop, viewMode]);

  const toggleFilter = (pill: MyGrantFilterPill) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (pill === 'all') return new Set(['all']);
      next.delete('all');
      if (next.has(pill)) next.delete(pill);
      else next.add(pill);
      if (next.size === 0) return new Set(['all']);
      return next;
    });
  };

  const filtered = useMemo(
    () => sortGrants(filterGrants(grants, filters, search), sort),
    [grants, filters, search, sort],
  );

  if (isEmpty) {
    return <MyGrantsEmptyState />;
  }

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem]">
          My Grants
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete historical record of all grants received, active, or terminal.
        </p>
      </header>

      <MyGrantsSummaryBar summary={summary} loading={loading} />

      <MyGrantsFilterBar
        filters={filters}
        onToggleFilter={toggleFilter}
        sort={sort}
        onSortChange={setSort}
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showTimelineToggle={isDesktop}
      />

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
          Loading grant history…
        </div>
      ) : viewMode === 'timeline' && isDesktop ? (
        <MyGrantsTimeline grants={filtered} />
      ) : (
        <MyGrantsGrantList grants={filtered} />
      )}

      <MyGrantsEarningsSection grants={grants} />
    </div>
  );
}

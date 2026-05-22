'use client';

import CommitteeGrantCard from '@/components/committee/dashboard/CommitteeGrantCard';
import type { CommitteeDemoGrant } from '@/demo/committee-demo';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

type ActiveGrantsSectionProps = {
  grants: CommitteeDemoGrant[];
  isLoading?: boolean;
};

type GrantFilter = 'recent' | 'all';

/**
 * Renders the "Active Grants" section header (with Recent / All segmented toggle
 * and a Filter button) and the responsive grid of grant cards underneath.
 */
export default function ActiveGrantsSection({
  grants,
  isLoading = false,
}: ActiveGrantsSectionProps) {
  const [filter, setFilter] = useState<GrantFilter>('recent');

  const visible =
    filter === 'recent' ? grants.filter((g) => g.status === 'in_progress') : grants;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight text-slate-900">Active Grants</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            <FilterToggleButton
              active={filter === 'recent'}
              onClick={() => setFilter('recent')}
            >
              Recent
            </FilterToggleButton>
            <FilterToggleButton
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All
            </FilterToggleButton>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Filter
            <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((grant) => (
              <CommitteeGrantCard key={grant.id} grant={grant} />
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">
                {grants.length === 0
                  ? 'No grants yet'
                  : 'No grants in this view'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {grants.length === 0
                  ? 'You will see grants here once a grantor adds your wallet to a grant committee.'
                  : (
                      <>
                        Try switching to the{' '}
                        <span className="font-semibold">All</span> tab to see
                        archived grants.
                      </>
                    )}
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function FilterToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

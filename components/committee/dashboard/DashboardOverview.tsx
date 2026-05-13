'use client';

import { CheckCircle2, Coins, FileText, Info, LayoutGrid, X } from 'lucide-react';
import { useState } from 'react';

type DashboardOverviewProps = {
  totalActiveGrants: number;
  usdcUnderControl: number;
  pendingReviews: number;
  /** Hide the "All Caught Up" banner when there is actually something to review. */
  showAllCaughtUpBanner?: boolean;
};

function formatToday() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: undefined,
    day: 'numeric',
    month: 'long',
  });
}

function formatUsd(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Top section of the committee dashboard: title row, dismissible "All Caught Up"
 * banner (only in the empty state), and the three summary stat cards.
 */
export default function DashboardOverview({
  totalActiveGrants,
  usdcUnderControl,
  pendingReviews,
  showAllCaughtUpBanner = true,
}: DashboardOverviewProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const today = formatToday();

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor grant progress and pending reviews.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-500">Today, {today}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Export Report
          </button>
        </div>
      </div>

      {showAllCaughtUpBanner && !bannerDismissed ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Info className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-blue-900">All Caught Up</p>
            <p className="mt-0.5 text-xs leading-relaxed text-blue-800">
              No milestones awaiting your review right now. You can browse active grants
              below, but there are no pending voting actions required at this time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1 text-blue-700 transition hover:bg-blue-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<LayoutGrid className="h-4 w-4" />}
          iconWrapClass="bg-violet-100 text-violet-600"
          label="Total Active Grants"
          value={totalActiveGrants.toString()}
        />
        <StatCard
          icon={<Coins className="h-4 w-4" />}
          iconWrapClass="bg-emerald-100 text-emerald-600"
          label="USDC Under Control"
          value={`$ ${formatUsd(usdcUnderControl)}`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          iconWrapClass="bg-slate-900 text-white"
          label="Pending Reviews"
          value={pendingReviews.toString()}
          trailing={
            pendingReviews === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                All clear
              </span>
            ) : null
          }
        />
      </div>
    </section>
  );
}

function StatCard({
  icon,
  iconWrapClass,
  label,
  value,
  trailing,
}: {
  icon: React.ReactNode;
  iconWrapClass: string;
  label: string;
  value: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconWrapClass}`}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
            {trailing}
          </div>
        </div>
      </div>
    </div>
  );
}

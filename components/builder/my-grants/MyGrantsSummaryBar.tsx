'use client';

import type { MyGrantsSummary } from '@/lib/my-grants/types';
import { formatUsdcCompact } from '@/lib/my-grants/utils';
import { AlertTriangle, Box, CheckCircle2, DollarSign, Loader2 } from 'lucide-react';

type MyGrantsSummaryBarProps = {
  summary: MyGrantsSummary;
  loading?: boolean;
};

function StatCard({
  label,
  value,
  sub,
  icon,
  valueClassName,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <article className="flex min-w-[140px] flex-1 flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <span className="shrink-0 text-slate-400" aria-hidden>
          {icon}
        </span>
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${valueClassName ?? 'text-slate-900'}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </article>
  );
}

export default function MyGrantsSummaryBar({ summary, loading }: MyGrantsSummaryBarProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-10 text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading lifetime stats…
      </div>
    );
  }

  return (
    <section
      aria-label="Lifetime grant statistics"
      className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4"
    >
      <StatCard
        label="Total Grants"
        value={String(summary.totalGrants)}
        sub="All-time count"
        icon={<Box className="h-4 w-4 text-violet-500" />}
      />
      <StatCard
        label="Active Grants"
        value={String(summary.activeGrants)}
        sub="At least 1 active milestone"
        icon={<Loader2 className="h-4 w-4 text-sky-500" />}
      />
      <StatCard
        label="Completed"
        value={String(summary.completedGrants)}
        sub="All milestones approved"
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
      />
      <StatCard
        label="Total USDC Earned"
        value={`$${formatUsdcCompact(summary.totalUsdcEarned)}`}
        sub="Sum of released payments"
        icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
      />
      <StatCard
        label="Total Forfeited"
        value={`$${formatUsdcCompact(summary.totalUsdcForfeited)}`}
        sub="Sum of slashed amounts"
        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        valueClassName="text-red-600"
      />
    </section>
  );
}

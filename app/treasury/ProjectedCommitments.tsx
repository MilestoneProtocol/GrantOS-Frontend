'use client';

import type { ProjectedCommitments as ProjectedCommitmentsModel } from '@/lib/treasury';
import { formatUsd } from '@/lib/treasury';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Props = {
  data: ProjectedCommitmentsModel;
};

/**
 * Forward-looking liability view. Two stat tiles for the closest months,
 * then a six-month projected outflow area chart.
 */
export default function ProjectedCommitments({ data }: Props) {
  return (
    <section
      aria-label="Projected commitments"
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <header>
        <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
          Projected Commitments
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Assuming all milestones approved
        </p>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile label="Due This Month" value={formatUsd(data.thisMonthUsdc)} />
        <StatTile label="Due Next Month" value={formatUsd(data.nextMonthUsdc)} />
      </div>

      <div className="mt-2 -mx-1 flex-1">
        <div className="h-44 w-full sm:h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.upcoming}
              margin={{ top: 12, right: 12, left: -8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v: number) => formatUsd(v, { compact: true })}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(245, 158, 11, 0.45)', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.[0]) return null;
                  const v = Number(payload[0].value);
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-amber-600">
                        {formatUsd(v)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="usdc"
                stroke="#d97706"
                strokeWidth={2.2}
                fill="url(#projectionFill)"
                dot={{ r: 2, fill: '#d97706' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Projections assume all active milestones are approved. Actual releases depend on
        committee votes.
      </p>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
    </article>
  );
}

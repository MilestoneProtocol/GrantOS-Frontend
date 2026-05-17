'use client';

import type { DaoHeroStatsModel } from '@/demo/dao-dashboard';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DaoTreasuryOverviewProps = {
  hero: DaoHeroStatsModel;
};

type ChartPoint = { label: string; value: number };

function buildSeries(locked: number, range: '30' | '90'): ChartPoint[] {
  const end = locked;
  const start = locked * 0.28;
  if (range === '30') {
    const labels = ['W1', 'W2', 'W3', 'W4'];
    return labels.map((label, i) => ({
      label,
      value: start + ((end - start) * i) / (labels.length - 1),
    }));
  }
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return labels.map((label, i) => ({
    label,
    value: start + ((end - start) * i) / (labels.length - 1),
  }));
}

function formatAxisUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

function formatTooltipUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * Treasury overview panel on `/dao` — macro metrics + interactive trend chart.
 */
export default function DaoTreasuryOverview({ hero }: DaoTreasuryOverviewProps) {
  const [range, setRange] = useState<'30' | '90'>('90');

  const chartData = useMemo(
    () => buildSeries(hero.totalUsdcLocked, range),
    [hero.totalUsdcLocked, range],
  );

  const yMax = useMemo(() => {
    const peak = Math.max(...chartData.map((d) => d.value), 1);
    const step = peak <= 2_000_000 ? 500_000 : 1_000_000;
    return Math.ceil(peak / step) * step;
  }, [chartData]);

  const disbursedYtd = hero.totalReleasedThisMonth * 9.2;

  return (
    <section
      id="dao-treasury-panel"
      aria-label="Treasury overview"
      className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Treasury Overview</h2>
        <div
          role="group"
          aria-label="Time range"
          className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
        >
          {(['30', '90'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                range === key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {key} Days
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Total Locked (USDC)"
          value={formatUsdMillions(hero.totalUsdcLocked)}
          sub={
            <span className="text-xs font-semibold text-emerald-600">+12.5% this month</span>
          }
        />
        <MetricCard
          label="Active Grants"
          value={hero.activeGrants.toLocaleString('en-US')}
          sub={<span className="text-xs text-slate-500">Across 8 categories</span>}
        />
        <MetricCard
          label="Disbursed (YTD)"
          value={formatUsdMillions(disbursedYtd)}
          sub={
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden />
              {Math.round(hero.milestonesDueThisWeek * 1.07)} milestones completed
            </span>
          }
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800/20 bg-[#0c1222] shadow-inner">
        <div className="h-52 w-full sm:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 16, right: 12, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id="daoTreasuryArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.55} />
                  <stop offset="55%" stopColor="#7c3aed" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#4c1d95" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="daoTreasuryStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(148, 163, 184, 0.12)"
                strokeDasharray="4 6"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                dy={8}
              />
              <YAxis
                domain={[0, yMax]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={formatAxisUsd}
                width={48}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(167, 139, 250, 0.35)', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.[0]) return null;
                  const v = Number(payload[0].value);
                  return (
                    <div className="rounded-lg border border-violet-500/30 bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-violet-200">
                        {formatTooltipUsd(v)} locked
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#daoTreasuryStroke)"
                strokeWidth={2.5}
                fill="url(#daoTreasuryArea)"
                dot={{
                  r: 3,
                  fill: '#c4b5fd',
                  stroke: '#1e1b4b',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 5,
                  fill: '#ede9fe',
                  stroke: '#7c3aed',
                  strokeWidth: 2,
                }}
                isAnimationActive
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      <div className="mt-1">{sub}</div>
    </article>
  );
}

function formatUsdMillions(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

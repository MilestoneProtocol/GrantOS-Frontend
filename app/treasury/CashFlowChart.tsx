'use client';

import type { CashFlowPoint } from '@/lib/treasury';
import { formatUsd } from '@/lib/treasury';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { useTreasuryStore } from '@/store/treasuryStore';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Props = {
  data: CashFlowPoint[];
};

const BAR_COLOURS = {
  locked: '#3b82f6',
  released: '#10b981',
  recovered: '#ef4444',
} as const;

/**
 * Grouped bar / line chart of escrow inflows, releases, and slash recoveries.
 * Mode toggle is wired through the treasury store so it persists across
 * remounts (e.g. after a poll refresh swaps the snapshot).
 */
export default function CashFlowChart({ data }: Props) {
  const mode = useTreasuryStore((s) => s.chartMode);
  const setMode = useTreasuryStore((s) => s.setChartMode);

  return (
    <section
      aria-label="Cash flow"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            Cash Flow
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Monthly inflows and outflows</p>
        </div>
        <div
          role="group"
          aria-label="Chart type"
          className="inline-flex shrink-0 self-start rounded-lg border border-slate-200 bg-slate-50 p-0.5"
        >
          <button
            type="button"
            onClick={() => setMode('bar')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'bar'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            aria-pressed={mode === 'bar'}
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            Bar
          </button>
          <button
            type="button"
            onClick={() => setMode('line')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'line'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            aria-pressed={mode === 'line'}
          >
            <LineChartIcon className="h-3.5 w-3.5" aria-hidden />
            Line
          </button>
        </div>
      </header>

      <div className="mt-4 h-64 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'bar' ? (
            <BarChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v: number) => formatUsd(v, { compact: true })}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                content={<CashFlowTooltip />}
              />
              <Legend
                verticalAlign="top"
                align="left"
                height={28}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingBottom: 8, fontSize: 12, color: '#475569' }}
              />
              <Bar dataKey="locked" name="Locked" fill={BAR_COLOURS.locked} radius={[2, 2, 0, 0]} />
              <Bar
                dataKey="released"
                name="Released"
                fill={BAR_COLOURS.released}
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="recovered"
                name="Recovered"
                fill={BAR_COLOURS.recovered}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v: number) => formatUsd(v, { compact: true })}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(148, 163, 184, 0.45)', strokeWidth: 1 }}
                content={<CashFlowTooltip />}
              />
              <Legend
                verticalAlign="top"
                align="left"
                height={28}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingBottom: 8, fontSize: 12, color: '#475569' }}
              />
              <Line
                type="monotone"
                dataKey="locked"
                name="Locked"
                stroke={BAR_COLOURS.locked}
                strokeWidth={2.4}
                dot={{ r: 3, fill: BAR_COLOURS.locked }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="released"
                name="Released"
                stroke={BAR_COLOURS.released}
                strokeWidth={2.4}
                dot={{ r: 3, fill: BAR_COLOURS.released }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="recovered"
                name="Recovered"
                stroke={BAR_COLOURS.recovered}
                strokeWidth={2.4}
                dot={{ r: 3, fill: BAR_COLOURS.recovered }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

type CashFlowTooltipPayload = {
  dataKey: string;
  name: string;
  value: number;
  color: string;
  payload?: CashFlowPoint;
};

function CashFlowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: CashFlowTooltipPayload[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const first = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <ul className="mt-1.5 space-y-0.5 text-xs">
        {payload.map((p) => (
          <li
            key={p.dataKey}
            className="flex items-center gap-2 tabular-nums text-slate-700"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
              aria-hidden
            />
            <span className="font-medium capitalize">{p.name}</span>
            <span className="ml-auto font-semibold text-slate-900">
              {formatUsd(p.value, { compact: false })}
            </span>
          </li>
        ))}
      </ul>
      {first ? (
        <p className="mt-1.5 text-[11px] text-slate-500">
          {first.grantCount} grants in this bucket
        </p>
      ) : null}
    </div>
  );
}

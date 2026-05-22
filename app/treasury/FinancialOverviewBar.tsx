'use client';

import type { SparkPoint, TreasuryHero } from '@/lib/treasury';
import { formatUsd } from '@/lib/treasury';
import { Activity, Coins, Layers, Lock, ShieldAlert, Wallet, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

type Tone = 'sky' | 'emerald' | 'rose' | 'violet' | 'amber' | 'slate';

type CardSpec = {
  key: string;
  label: string;
  value: string;
  trend?: { delta: number; suffix?: string } | { text: string };
  sparkline: SparkPoint[];
  tone: Tone;
  icon: LucideIcon;
  /** Optional live ticker badge in the top-right corner. */
  liveDot?: boolean;
  /** Override sub-line copy beneath the value/trend chip. */
  subline?: string;
};

const TONE_STYLE: Record<
  Tone,
  { stroke: string; fill: string; iconBg: string; iconFg: string; ring: string }
> = {
  sky: {
    stroke: '#0284c7',
    fill: '#7dd3fc',
    iconBg: 'bg-sky-50',
    iconFg: 'text-sky-600',
    ring: 'ring-sky-200',
  },
  emerald: {
    stroke: '#059669',
    fill: '#6ee7b7',
    iconBg: 'bg-emerald-50',
    iconFg: 'text-emerald-600',
    ring: 'ring-emerald-200',
  },
  rose: {
    stroke: '#e11d48',
    fill: '#fda4af',
    iconBg: 'bg-rose-50',
    iconFg: 'text-rose-600',
    ring: 'ring-rose-200',
  },
  violet: {
    stroke: '#7c3aed',
    fill: '#c4b5fd',
    iconBg: 'bg-violet-50',
    iconFg: 'text-violet-600',
    ring: 'ring-violet-200',
  },
  amber: {
    stroke: '#d97706',
    fill: '#fcd34d',
    iconBg: 'bg-amber-50',
    iconFg: 'text-amber-600',
    ring: 'ring-amber-200',
  },
  slate: {
    stroke: '#475569',
    fill: '#cbd5e1',
    iconBg: 'bg-slate-100',
    iconFg: 'text-slate-600',
    ring: 'ring-slate-200',
  },
};

type Props = {
  hero: TreasuryHero;
};

/**
 * Six-card overview bar at the top of the Treasury Command Center. The
 * "Currently Streaming" card is highlighted and shows a live USDC/sec
 * ticker that increments every 100ms.
 */
export default function FinancialOverviewBar({ hero }: Props) {
  // Live USDC/sec ticker — wiggles gently around the latest snapshot rate
  // without cascading re-renders when the parent snapshot updates.
  const baseRateRef = useRef(hero.currentlyStreamingFlowRate);
  const [streamRate, setStreamRate] = useState(hero.currentlyStreamingFlowRate);

  useEffect(() => {
    baseRateRef.current = hero.currentlyStreamingFlowRate;
  }, [hero.currentlyStreamingFlowRate]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const base = baseRateRef.current;
      const wobble = (Math.random() - 0.5) * base * 0.0005;
      setStreamRate(Number((base + wobble).toFixed(4)));
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  const cards: CardSpec[] = [
    {
      key: 'locked',
      label: 'Total USDC Locked',
      value: formatUsd(hero.totalUsdcLocked),
      trend: { delta: hero.delta.locked, suffix: '%' },
      sparkline: hero.sparks.locked,
      tone: 'sky',
      icon: Lock,
    },
    {
      key: 'released',
      label: 'Total Released',
      value: formatUsd(hero.totalReleasedAllTime),
      trend: { text: 'All time' },
      sparkline: hero.sparks.released,
      tone: 'emerald',
      icon: Coins,
    },
    {
      key: 'recovered',
      label: 'Recovered via Slash',
      value: formatUsd(hero.totalRecoveredViaSlashing),
      trend: { delta: hero.delta.recovered, suffix: '%' },
      sparkline: hero.sparks.recovered,
      tone: 'rose',
      icon: ShieldAlert,
    },
    {
      key: 'streaming',
      label: 'Currently Streaming',
      value: streamRate.toFixed(4),
      trend: { text: 'USDC / sec' },
      sparkline: hero.sparks.streaming,
      tone: 'violet',
      icon: Activity,
      liveDot: true,
    },
    {
      key: 'grants',
      label: 'Active Grants',
      value: hero.totalGrantsCreated.toLocaleString('en-US'),
      trend: { delta: hero.delta.grants, suffix: '' },
      sparkline: hero.sparks.grants,
      tone: 'amber',
      icon: Layers,
    },
    {
      key: 'avgSize',
      label: 'Avg Grant Size',
      value: formatUsd(hero.averageGrantSizeUsdc),
      trend: { text: 'Last 30 days' },
      sparkline: hero.sparks.avgSize,
      tone: 'slate',
      icon: Wallet,
    },
  ];

  return (
    <section
      aria-label="Financial overview"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      {cards.map((card) => (
        <MetricCard key={card.key} card={card} highlighted={card.key === 'streaming'} />
      ))}
    </section>
  );
}

function MetricCard({ card, highlighted }: { card: CardSpec; highlighted: boolean }) {
  const t = TONE_STYLE[card.tone];
  const Icon = card.icon;
  return (
    <article
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow ${
        highlighted ? 'border-sky-300 ring-1 ring-sky-200' : 'border-slate-200'
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${t.iconBg}`}
            aria-hidden
          >
            <Icon className={`h-3.5 w-3.5 ${t.iconFg}`} strokeWidth={2.2} />
          </span>
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {card.label}
          </p>
        </div>
        {card.liveDot ? (
          <span className="relative inline-flex h-2 w-2" aria-label="Live">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
          </span>
        ) : null}
      </header>

      <p
        className={`mt-3 truncate text-[22px] font-bold tabular-nums tracking-tight text-slate-900 ${
          card.key === 'streaming' ? 'font-mono' : ''
        }`}
      >
        {card.value}
      </p>

      <div className="mt-1 flex items-center justify-between gap-2">
        <TrendChip trend={card.trend} />
        <div className="ml-auto h-7 w-20 shrink-0 sm:w-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={card.sparkline}
              margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`spark-${card.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.fill} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={t.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="y"
                stroke={t.stroke}
                strokeWidth={1.5}
                fill={`url(#spark-${card.key})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </article>
  );
}

function TrendChip({ trend }: { trend?: CardSpec['trend'] }): ReactNode {
  if (!trend) return null;
  if ('text' in trend) {
    return (
      <span className="text-[11px] font-medium text-slate-500">{trend.text}</span>
    );
  }
  if (trend.delta === 0) {
    return <span className="text-[11px] font-medium text-slate-500">No change</span>;
  }
  const positive = trend.delta > 0;
  const icon = positive ? '▲' : '▼';
  const colour = positive ? 'text-emerald-600' : 'text-rose-600';
  const sign = positive ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${colour}`}>
      <span aria-hidden>{icon}</span>
      <span>
        {sign}
        {trend.delta}
        {trend.suffix ?? ''}
      </span>
    </span>
  );
}

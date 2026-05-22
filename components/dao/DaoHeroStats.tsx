'use client';

import type { DaoHeroStatsModel } from '@/demo/dao-dashboard';
import {
  Activity,
  Banknote,
  CalendarClock,
  Gavel,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type DaoHeroStatsProps = {
  hero: DaoHeroStatsModel;
};

const statConfig = [
  {
    key: 'totalUsdcLocked' as const,
    label: 'Total USDC Locked',
    icon: Banknote,
    format: 'usd' as const,
    tick: false,
  },
  {
    key: 'activeGrants' as const,
    label: 'Active Grants',
    icon: Activity,
    format: 'int' as const,
    tick: false,
  },
  {
    key: 'milestonesDueThisWeek' as const,
    label: 'Milestones Due This Week',
    icon: CalendarClock,
    format: 'int' as const,
    tick: false,
  },
  {
    key: 'totalReleasedThisMonth' as const,
    label: 'Released This Month',
    icon: TrendingUp,
    format: 'usd' as const,
    tick: false,
  },
  {
    key: 'liveSlashCounterUsdc' as const,
    label: 'Live Slash Counter',
    icon: Gavel,
    format: 'usd2' as const,
    tick: true,
  },
  {
    key: 'totalZkProofsVerified' as const,
    label: 'ZK Proofs Verified',
    icon: ShieldCheck,
    format: 'int' as const,
    tick: true,
  },
];

/**
 * Six-up hero metrics row. Slash + ZK cells animate upward briefly when their
 * numeric value increases (30s poll bump from the demo data layer).
 */
export default function DaoHeroStats({ hero }: DaoHeroStatsProps) {
  const prevSlash = useRef(hero.liveSlashCounterUsdc);
  const prevZk = useRef(hero.totalZkProofsVerified);
  const [slashBump, setSlashBump] = useState(false);
  const [zkBump, setZkBump] = useState(false);

  useEffect(() => {
    if (hero.liveSlashCounterUsdc > prevSlash.current) {
      setSlashBump(true);
      const t = window.setTimeout(() => setSlashBump(false), 900);
      prevSlash.current = hero.liveSlashCounterUsdc;
      return () => window.clearTimeout(t);
    }
    prevSlash.current = hero.liveSlashCounterUsdc;
  }, [hero.liveSlashCounterUsdc]);

  useEffect(() => {
    if (hero.totalZkProofsVerified > prevZk.current) {
      setZkBump(true);
      const t = window.setTimeout(() => setZkBump(false), 900);
      prevZk.current = hero.totalZkProofsVerified;
      return () => window.clearTimeout(t);
    }
    prevZk.current = hero.totalZkProofsVerified;
  }, [hero.totalZkProofsVerified]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {statConfig.map(({ key, label, icon: Icon, format, tick }) => {
        const raw = hero[key];
        const display =
          format === 'usd'
            ? formatUsd(raw as number)
            : format === 'usd2'
              ? formatUsd2(raw as number)
              : formatInt(raw as number);
        const bump =
          tick && key === 'liveSlashCounterUsdc'
            ? slashBump
            : tick && key === 'totalZkProofsVerified'
              ? zkBump
              : false;

        return (
          <article
            key={key}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
                {label}
              </p>
              <Icon className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
            </div>
            <p
              data-tick={bump ? 'true' : undefined}
              className="mt-2 text-xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-2xl data-[tick=true]:animate-[dao-metric-rise_0.85s_ease-out]"
            >
              {display}
            </p>
            {key === 'totalUsdcLocked' ? (
              <p className="mt-1 text-[10px] font-semibold text-emerald-600">+2.4% vs last week</p>
            ) : key === 'milestonesDueThisWeek' ? (
              <p className="mt-1 text-[10px] font-semibold text-amber-600">Due soon</p>
            ) : key === 'totalZkProofsVerified' ? (
              <p className="mt-1 text-[10px] font-semibold text-violet-600">Onchain</p>
            ) : key === 'liveSlashCounterUsdc' ? (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                All-time
              </span>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatUsd2(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatInt(n: number): string {
  return n.toLocaleString('en-US');
}

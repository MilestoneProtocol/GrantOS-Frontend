'use client';

import AlertCard from '@/components/dao/AlertCard';
import { highestAlertSeverity, type DaoAlert } from '@/lib/alerts';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type AlertsPanelProps = {
  alerts: DaoAlert[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

const badgeTone = {
  critical: 'bg-red-500',
  urgent: 'bg-orange-500',
  watch: 'bg-amber-500',
} as const;

export default function AlertsPanel({
  alerts,
  collapsed,
  onToggleCollapsed,
}: AlertsPanelProps) {
  const [entered, setEntered] = useState(false);
  const prevCount = useRef(0);

  useEffect(() => {
    if (alerts.length > 0 && prevCount.current === 0) {
      setEntered(true);
      const t = window.setTimeout(() => setEntered(false), 500);
      prevCount.current = alerts.length;
      return () => window.clearTimeout(t);
    }
    prevCount.current = alerts.length;
  }, [alerts.length]);

  if (alerts.length === 0) return null;

  const topSeverity = highestAlertSeverity(alerts);
  const badgeClass = topSeverity ? badgeTone[topSeverity] : 'bg-red-500';

  const scrollToTreasury = (targetId: string) => {
    const el = document.getElementById(targetId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      aria-label="DAO alerts"
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ${
        entered ? 'animate-[dao-alert-panel-in_0.45s_ease-out]' : ''
      }`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="text-base font-bold tracking-tight text-slate-900">Alerts</h2>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white ${badgeClass}`}
          >
            {alerts.length} item{alerts.length === 1 ? '' : 's'} need your attention
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          aria-label={collapsed ? 'Expand alerts' : 'Collapse alerts'}
        >
          <ChevronDown
            className={`h-4 w-4 transition ${collapsed ? '' : 'rotate-180'}`}
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </header>

      {!collapsed ? (
        <div className="space-y-3 p-4 sm:p-5">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onScrollTo={scrollToTreasury} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

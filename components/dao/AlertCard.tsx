'use client';

import type { DaoAlert } from '@/lib/alerts';
import { formatAlertDuration } from '@/lib/alerts';
import {
  AlertTriangle,
  Clock,
  UserMinus,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

const severityStyles = {
  critical: {
    border: 'border-l-red-500',
    surface: 'bg-red-50/80',
    iconWrap: 'bg-red-100 text-red-600',
    title: 'text-red-900',
  },
  urgent: {
    border: 'border-l-orange-500',
    surface: 'bg-orange-50/70',
    iconWrap: 'bg-orange-100 text-orange-600',
    title: 'text-orange-950',
  },
  watch: {
    border: 'border-l-amber-400',
    surface: 'bg-amber-50/70',
    iconWrap: 'bg-amber-100 text-amber-700',
    title: 'text-amber-950',
  },
} as const;

const categoryIcons: Record<DaoAlert['category'], LucideIcon> = {
  builder_reputation_critical: AlertTriangle,
  treasury_threshold: Wallet,
  committee_inactivity: Users,
  unwarned_overdue: Clock,
  committee_member_inactive: UserMinus,
};

type AlertCardProps = {
  alert: DaoAlert;
  onScrollTo?: (targetId: string) => void;
};

export default function AlertCard({ alert, onScrollTo }: AlertCardProps) {
  const styles = severityStyles[alert.severity];
  const Icon = categoryIcons[alert.category];
  const duration = formatAlertDuration(alert.conditionSinceMs);

  const actionNode =
    alert.action.kind === 'link' ? (
      <Link
        href={alert.action.href}
        className="shrink-0 text-sm font-semibold text-sky-600 transition hover:text-sky-700"
      >
        {alert.action.label}
      </Link>
    ) : (
      <button
        type="button"
        onClick={() => {
          if (alert.action.kind === 'scroll') {
            onScrollTo?.(alert.action.targetId);
          }
        }}
        className="shrink-0 text-sm font-semibold text-sky-600 transition hover:text-sky-700"
      >
        {alert.action.label}
      </button>
    );

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border border-slate-200 border-l-4 ${styles.border} ${styles.surface} p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:p-5`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.iconWrap}`}
        >
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3 className={`text-sm font-bold ${styles.title}`}>{alert.title}</h3>
            <span className="text-xs font-medium text-slate-500">{duration}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{alert.message}</p>
        </div>
      </div>
      <div className="flex justify-end sm:justify-center">{actionNode}</div>
    </article>
  );
}

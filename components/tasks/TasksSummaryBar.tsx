'use client';

import type { TasksSummary } from '@/lib/tasks/types';
import { AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react';

const CARDS = [
  {
    key: 'urgent' as const,
    label: 'Urgent',
    icon: AlertTriangle,
    tone: 'text-red-600 bg-red-50 border-red-100 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-400',
    iconTone: 'text-red-500',
  },
  {
    key: 'pending' as const,
    label: 'Pending',
    icon: Clock,
    tone: 'text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300',
    iconTone: 'text-amber-500',
  },
  {
    key: 'awaitingQuorum' as const,
    label: 'Awaiting Quorum',
    icon: Users,
    tone: 'text-blue-700 bg-blue-50 border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-300',
    iconTone: 'text-blue-500',
  },
  {
    key: 'completedToday' as const,
    label: 'Completed Today',
    icon: CheckCircle2,
    tone: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300',
    iconTone: 'text-emerald-500',
  },
];

export default function TasksSummaryBar({ summary }: { summary: TasksSummary }) {
  const values: Record<(typeof CARDS)[number]['key'], number> = {
    urgent: summary.urgent,
    pending: summary.pending,
    awaitingQuorum: summary.awaitingQuorum,
    completedToday: summary.completedToday,
  };

  return (
    <section
      aria-label="Task summary"
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
    >
      {CARDS.map(({ key, label, icon: Icon, tone, iconTone }) => (
        <article
          key={key}
          className={`rounded-2xl border px-4 py-3.5 shadow-sm ${tone}`}
        >
          <header className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${iconTone}`} strokeWidth={2} aria-hidden />
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
          </header>
          <p className="mt-2 text-2xl font-bold tabular-nums">{values[key]}</p>
        </article>
      ))}
    </section>
  );
}

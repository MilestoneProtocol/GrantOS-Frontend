'use client';

import { CheckCircle2 } from 'lucide-react';

export default function TasksEmptyState() {
  return (
    <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40 sm:py-20">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
        <CheckCircle2 className="h-8 w-8" strokeWidth={2} aria-hidden />
      </span>
      <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
        You&apos;re all caught up — no pending actions.
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
        New tasks appear here when builders submit milestones or deadlines are missed.
      </p>
    </section>
  );
}

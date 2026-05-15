'use client';

import { ArrowUpRight, BookMarked } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type GuidelinesNavButtonProps = {
  variant?: 'full' | 'rail';
  onNavigate?: () => void;
  className?: string;
};

export default function GuidelinesNavButton({
  variant = 'full',
  onNavigate,
  className = '',
}: GuidelinesNavButtonProps) {
  const pathname = usePathname();
  const active = pathname === '/guidelines' || pathname?.startsWith('/guidelines/');
  const isRail = variant === 'rail';

  if (isRail) {
    return (
      <Link
        href="/guidelines"
        onClick={onNavigate}
        aria-label="Guidelines"
        title="Guidelines — how GrantOS works"
        className={`group relative flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200/80 bg-linear-to-br from-amber-50 to-white text-amber-800 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-amber-900/50 dark:from-amber-950/40 dark:to-slate-900 dark:text-amber-200 ${
          active ? 'ring-2 ring-amber-400/40' : ''
        } ${className}`}
      >
        <BookMarked className="h-4 w-4" strokeWidth={2} aria-hidden />
      </Link>
    );
  }

  return (
    <Link
      href="/guidelines"
      onClick={onNavigate}
      className={`group relative block overflow-hidden rounded-xl border border-amber-200/90 bg-linear-to-br from-amber-50 via-white to-orange-50/40 p-3.5 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-amber-900/40 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 ${
        active ? 'ring-2 ring-amber-400/30' : ''
      } ${className}`}
    >
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-200/30 blur-2xl dark:bg-amber-500/10"
        aria-hidden
      />
      <span className="relative flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-white text-amber-700 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300">
          <BookMarked className="h-4 w-4" strokeWidth={2.2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="flex items-center gap-1">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Guidelines</span>
            <ArrowUpRight
              className="h-3.5 w-3.5 text-amber-600 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-amber-400"
              aria-hidden
            />
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">
            ZK badges, reputation, milestones &amp; roles
          </span>
        </span>
      </span>
    </Link>
  );
}

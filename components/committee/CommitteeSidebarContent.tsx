'use client';

import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Home,
  LayoutGrid,
  Users,
} from 'lucide-react';
import SidebarUtilityFooter from '@/components/sidebar/SidebarUtilityFooter';
import Link from 'next/link';

export type CommitteeNavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  matchPrefixes?: string[];
};

export const COMMITTEE_NAV_ITEMS: CommitteeNavItem[] = [
  { label: 'Dashboard', href: '/committee', icon: Home },
  { label: 'DAO', href: '/dao', icon: BarChart3, matchPrefixes: ['/dao'] },
  {
    label: 'Reviews',
    href: '/committee/reviews',
    icon: ClipboardList,
    matchPrefixes: ['/committee/reviews'],
  },
  { label: 'All Grants', href: '/committee/grants', icon: LayoutGrid },
  { label: 'Committee', href: '/committee/members', icon: Users },
  {
    label: 'Tasks',
    href: '/tasks',
    icon: CheckCircle2,
    matchPrefixes: ['/tasks'],
  },
];

type CommitteeSidebarContentProps = {
  pathname: string | null;
  reviewsBadge: number;
  tasksBadge?: number;
  variant?: 'full' | 'rail';
  onNavigate?: () => void;
};

function isItemActive(item: CommitteeNavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === item.href) return true;
  if (item.matchPrefixes?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return false;
}

export default function CommitteeSidebarContent({
  pathname,
  reviewsBadge,
  tasksBadge = 0,
  variant = 'full',
  onNavigate,
}: CommitteeSidebarContentProps) {
  const isRail = variant === 'rail';

  if (isRail) {
    return (
      <div className="flex h-full w-full flex-col">
        <nav aria-label="Committee navigation rail" className="flex flex-col items-center gap-1.5">
          {COMMITTEE_NAV_ITEMS.map(({ label, href, icon: Icon, matchPrefixes }) => {
            const active = isItemActive({ label, href, icon: Icon, matchPrefixes }, pathname);
            const showReviewsBadge = label === 'Reviews' && reviewsBadge > 0;
            const showTasksBadge = label === 'Tasks' && tasksBadge > 0;
            const showBadge = showReviewsBadge || showTasksBadge;
            const badgeValue = showTasksBadge ? tasksBadge : reviewsBadge;
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-label={label}
                title={label}
                className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                {showBadge ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                    {badgeValue > 9 ? '9+' : badgeValue}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <SidebarUtilityFooter
          variant="rail"
          onNavigate={onNavigate}
          className="mt-auto w-full px-1"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Committee navigation" className="flex-1">
        <ul className="space-y-1">
          {COMMITTEE_NAV_ITEMS.map(({ label, href, icon: Icon, matchPrefixes }) => {
            const active = isItemActive({ label, href, icon: Icon, matchPrefixes }, pathname);

            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                    active
                      ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-500'}`}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="truncate">{label}</span>
                  </span>
                  {label === 'Reviews' ? (
                    <span
                      className={`ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                        reviewsBadge > 0
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {reviewsBadge}
                    </span>
                  ) : null}
                  {label === 'Tasks' && tasksBadge > 0 ? (
                    <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {tasksBadge > 9 ? '9+' : tasksBadge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <SidebarUtilityFooter variant="full" onNavigate={onNavigate} className="mt-auto" />
    </div>
  );
}

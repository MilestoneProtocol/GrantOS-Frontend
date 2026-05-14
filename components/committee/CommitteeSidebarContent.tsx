'use client';

import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Home,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
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
  { label: 'Tasks', href: '/committee/tasks', icon: CheckCircle2 },
];

type CommitteeSidebarContentProps = {
  pathname: string | null;
  reviewsBadge: number;
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
  variant = 'full',
  onNavigate,
}: CommitteeSidebarContentProps) {
  const isRail = variant === 'rail';

  if (isRail) {
    return (
      <nav aria-label="Committee navigation rail" className="flex flex-col items-center gap-1.5">
        {COMMITTEE_NAV_ITEMS.map(({ label, href, icon: Icon, matchPrefixes }) => {
          const active = isItemActive({ label, href, icon: Icon, matchPrefixes }, pathname);
          const showBadge = label === 'Reviews' && reviewsBadge > 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-label={label}
              title={label}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              {showBadge ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                  {reviewsBadge > 9 ? '9+' : reviewsBadge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
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
                      ? 'bg-blue-50 font-semibold text-blue-700'
                      : 'font-medium text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`}
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
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {reviewsBadge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="pt-4">
        <div className="relative overflow-hidden rounded-xl border border-violet-100 bg-violet-50/70 p-4 text-center">
          <span className="absolute right-2 top-2 text-violet-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-600">
            <ShieldCheck className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <p className="mt-2 text-xs font-bold text-slate-900">Committee Member</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            You have voting rights for active grants.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            View Guidelines
          </button>
        </div>
      </div>
    </div>
  );
}

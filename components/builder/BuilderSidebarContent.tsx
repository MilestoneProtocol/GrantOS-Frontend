'use client';

import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  CircleAlert,
  Home,
  ShieldCheck,
  User,
} from 'lucide-react';
import Link from 'next/link';

export type BuilderSidebarNavActive = 'dashboard' | 'warnings' | 'none';

type BuilderSidebarContentProps = {
  navActive: BuilderSidebarNavActive;
  address?: `0x${string}`;
  zkVerified: boolean;
  warningCount: number;
  activeWarningCount: number;
  reputationScore: bigint;
  chainName: string;
  /** When in mobile drawer, every link click should close the drawer. */
  onNavigate?: () => void;
  /** Render compactly for the tablet icon-rail (sm screens). */
  variant?: 'full' | 'rail';
};

function letterGrade(reputation: bigint) {
  const score = Number(reputation);
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'D';
}

/**
 * Sidebar content shared by the desktop aside, the tablet icon-rail and the
 * mobile drawer. The `variant="rail"` mode collapses every entry into an
 * icon-only square with a tooltip-style label so tablet users keep a usable
 * sidebar without sacrificing horizontal space.
 */
export default function BuilderSidebarContent({
  navActive,
  address,
  zkVerified,
  warningCount,
  activeWarningCount,
  reputationScore,
  chainName,
  onNavigate,
  variant = 'full',
}: BuilderSidebarContentProps) {
  const isRail = variant === 'rail';

  const links: Array<{
    label: string;
    href: string;
    icon: typeof Home;
    activeKey?: BuilderSidebarNavActive;
    badge?: number;
    badgeTone?: 'red' | 'slate';
    pillTone?: 'indigo' | 'red' | 'emerald' | 'default';
    locked?: boolean;
  }> = [
    {
      label: 'Dashboard',
      href: '/builder',
      icon: Home,
      activeKey: 'dashboard',
      pillTone: 'indigo',
    },
    {
      label: 'My Grants',
      href: '/builder',
      icon: ShieldCheck,
      pillTone: 'default',
    },
    {
      label: 'Warnings',
      href: '/builder/warnings',
      icon: AlertTriangle,
      activeKey: 'warnings',
      badge: warningCount > 0 ? warningCount : undefined,
      badgeTone: activeWarningCount > 0 ? 'red' : 'slate',
      pillTone: 'red',
    },
    {
      label: 'Builder Profile',
      href: address ? `/builders/${address}` : '/builders/unknown',
      icon: User,
      pillTone: 'default',
    },
    {
      label: zkVerified ? 'Verified Identity' : 'Verify Identity',
      href: '/verify',
      icon: zkVerified ? BadgeCheck : CircleAlert,
      pillTone: zkVerified ? 'emerald' : 'default',
      locked: zkVerified,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Builder navigation" className={isRail ? 'space-y-1.5' : 'space-y-1.5'}>
        {links.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.activeKey != null && item.activeKey === navActive;
          const tone =
            item.pillTone === 'indigo'
              ? 'bg-indigo-50 font-semibold text-indigo-700'
              : item.pillTone === 'red'
                ? 'bg-red-50 font-semibold text-red-700'
                : item.pillTone === 'emerald'
                  ? 'bg-emerald-50 font-semibold text-emerald-700'
                  : 'bg-slate-100 font-semibold text-slate-900';

          if (isRail) {
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                aria-label={item.label}
                title={item.label}
                className={`group relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  isActive
                    ? tone
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                } ${item.locked ? 'pointer-events-none' : ''}`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                {item.badge ? (
                  <span
                    className={`absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums ring-2 ring-white ${
                      item.badgeTone === 'red'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-label={
                item.badge ? `${item.label} (${item.badge})` : item.label
              }
              className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive
                  ? tone
                  : 'font-medium text-slate-700 hover:bg-slate-100'
              } ${item.locked ? 'pointer-events-none' : ''}`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge ? (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    item.badgeTone === 'red'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {!isRail ? (
        <div className="mt-auto pt-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-xs font-medium text-slate-500">Reputation</p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {Number(reputationScore).toFixed(1)}{' '}
              <span className="text-sm font-semibold text-indigo-600">
                {letterGrade(reputationScore)}
              </span>
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <Link
                href="/verify"
                onClick={onNavigate}
                className="inline-flex items-center gap-1 hover:text-slate-700"
              >
                <BookOpen className="h-3.5 w-3.5" /> How it works
              </Link>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="truncate">{chainName}</span>
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

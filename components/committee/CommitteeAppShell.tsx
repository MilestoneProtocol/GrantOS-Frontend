'use client';

import ConnectButton from '@/components/ConnectButton';
import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import { IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Home,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAccount, useReadContract } from 'wagmi';

export type CommitteeBreadcrumbSegment = {
  label: string;
  /** When provided, the segment renders as a link. The last segment is always plain text. */
  href?: string;
};

type CommitteeAppShellProps = {
  children: ReactNode;
  /**
   * Breadcrumb after `GrantOS /`. Accepts a single label or an ordered list of
   * segments (e.g. `[{ label: 'Review Queue', href: '/committee/reviews' }, { label: 'DeFi Aggregator' }]`).
   * Defaults to "Committee Dashboard".
   */
  breadcrumb?: string | CommitteeBreadcrumbSegment[];
  /**
   * Optional unread count for the `Reviews` nav item; rendered as a red pill.
   */
  reviewsBadge?: number;
};

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  matchPrefixes?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/committee', icon: Home },
  {
    label: 'DAO',
    href: '/dao',
    icon: BarChart3,
    matchPrefixes: ['/dao'],
  },
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

export default function CommitteeAppShell({
  children,
  breadcrumb = 'Committee Dashboard',
  reviewsBadge = 0,
}: CommitteeAppShellProps) {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const zkVerified = Boolean(identityData?.[0]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 text-slate-900">
      <nav
        aria-label="Committee navigation"
        className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 lg:hidden"
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon, matchPrefixes }) => {
          const isActive =
            pathname === href ||
            (matchPrefixes?.some(
              (p) => pathname === p || pathname.startsWith(`${p}/`),
            ) ??
              false);
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
      <aside className="sticky top-0 hidden h-screen max-h-screen w-[228px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link
          href="/committee"
          className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">
            G
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900">GrantOS</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ label, href, icon: Icon, matchPrefixes }) => {
              const isActive =
                pathname === href ||
                (matchPrefixes?.some(
                  (p) => pathname === p || pathname.startsWith(`${p}/`),
                ) ??
                  false);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? 'bg-blue-50 font-semibold text-blue-700'
                        : 'font-medium text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-blue-600' : 'text-slate-500'
                        }`}
                        strokeWidth={2}
                      />
                      <span className="truncate">{label}</span>
                    </span>
                    {label === 'Reviews' && reviewsBadge > 0 ? (
                      <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {reviewsBadge}
                      </span>
                    ) : label === 'Reviews' ? (
                      <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">
                        0
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 pb-4">
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
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <BreadcrumbTrail breadcrumb={breadcrumb} />

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
            >
              <Bell className="h-4 w-4" strokeWidth={2} />
            </button>

            {isConnected && address ? (
              <div className="hidden sm:block">
                <ZKVerifiedBadge verified={zkVerified} />
              </div>
            ) : null}

            {isConnected ? (
              <ConnectButton variant="header" />
            ) : (
              <ConnectButton variant="black" />
            )}
          </div>
        </header>

        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </div>
    </div>
    </div>
  );
}

function BreadcrumbTrail({
  breadcrumb,
}: {
  breadcrumb: string | CommitteeBreadcrumbSegment[];
}) {
  const segments: CommitteeBreadcrumbSegment[] = Array.isArray(breadcrumb)
    ? breadcrumb
    : [{ label: breadcrumb }];

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link href="/" className="shrink-0 font-medium text-slate-500 hover:text-slate-800">
        GrantOS
      </Link>
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={`${segment.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            {segment.href && !isLast ? (
              <Link
                href={segment.href}
                className="shrink-0 truncate font-medium text-slate-500 hover:text-slate-800"
              >
                {segment.label}
              </Link>
            ) : (
              <span
                className={`min-w-0 truncate ${
                  isLast ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'
                }`}
              >
                {segment.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

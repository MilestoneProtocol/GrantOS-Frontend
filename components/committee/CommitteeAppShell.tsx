'use client';

import CommitteeSidebarContent from '@/components/committee/CommitteeSidebarContent';
import ConnectButton from '@/components/ConnectButton';
import MobileNavDrawer from '@/components/layout/MobileNavDrawer';
import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import { IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';
import NotificationBell from '@/components/NotificationBell';
import TasksBadgeSync from '@/components/tasks/TasksBadgeSync';
import { useTasksStore } from '@/store/tasksStore';
import { ChevronRight, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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

export default function CommitteeAppShell({
  children,
  breadcrumb = 'Committee Dashboard',
  reviewsBadge = 0,
}: CommitteeAppShellProps) {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const zkVerified = Boolean((identityData as any)?.isVerified);
  const tasksBadge = useTasksStore((s) => s.queue.badgeCount);

  // Close drawer on route change so back / forward navigation never leaves a
  // mobile drawer stuck open.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const closeDrawer = useCallback(() => setMobileNavOpen(false), []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 text-slate-900">
      <TasksBadgeSync />
      <div className="flex min-h-0 min-w-0 flex-1 flex-row">
        {/* Tablet icon rail (md..lg). */}
        <aside
          aria-label="Committee navigation rail"
          className="sticky top-0 hidden h-screen max-h-screen w-[68px] shrink-0 flex-col items-center border-r border-slate-200 bg-white py-4 md:flex lg:hidden"
        >
          <Link
            href="/committee"
            aria-label="GrantOS"
            className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white"
          >
            G
          </Link>
          <CommitteeSidebarContent
            pathname={pathname}
            reviewsBadge={reviewsBadge}
            tasksBadge={tasksBadge}
            variant="rail"
          />
        </aside>

        {/* Desktop full sidebar (lg+). */}
        <aside
          aria-label="Committee navigation"
          className="sticky top-0 hidden h-screen max-h-screen w-[228px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex"
        >
          <Link
            href="/committee"
            className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">
              G
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900">GrantOS</span>
          </Link>
          <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
            <CommitteeSidebarContent
              pathname={pathname}
              reviewsBadge={reviewsBadge}
              tasksBadge={tasksBadge}
              variant="full"
            />
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur supports-backdrop-filter:bg-white/80 sm:gap-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileNavOpen}
                aria-controls="committee-mobile-nav"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
              >
                <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>

              {/* Mobile compact title — replaces the verbose breadcrumb on tiny screens. */}
              <Link
                href="/committee"
                className="flex min-w-0 items-center gap-2 md:hidden"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-[11px] font-bold text-white">
                  G
                </span>
                <span className="truncate text-sm font-bold tracking-tight text-slate-900">
                  GrantOS
                </span>
              </Link>

              <div className="hidden min-w-0 flex-1 md:block">
                <BreadcrumbTrail breadcrumb={breadcrumb} />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <NotificationBell />

              {isConnected && address ? (
                <div className="hidden md:block">
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

          {/* Mobile breadcrumb — surfaces context below the compact header instead of
              hiding it entirely on small screens. */}
          <div className="border-b border-slate-100 bg-white/70 px-3 py-2 md:hidden">
            <BreadcrumbTrail breadcrumb={breadcrumb} />
          </div>

          <div className="min-h-0 min-w-0 flex-1">{children}</div>
        </div>
      </div>

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={closeDrawer}
        ariaLabel="Committee navigation"
        header={
          <Link
            href="/committee"
            onClick={closeDrawer}
            className="flex items-center gap-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
              G
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              GrantOS
            </span>
          </Link>
        }
      >
        <CommitteeSidebarContent
          pathname={pathname}
          reviewsBadge={reviewsBadge}
          tasksBadge={tasksBadge}
          variant="full"
          onNavigate={closeDrawer}
        />
      </MobileNavDrawer>
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
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm"
    >
      <Link
        href="/"
        className="shrink-0 font-medium text-slate-500 hover:text-slate-800"
      >
        GrantOS
      </Link>
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span
            key={`${segment.label}-${i}`}
            className="flex min-w-0 items-center gap-1.5"
          >
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

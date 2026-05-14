'use client';

import BuilderSidebarContent, {
  type BuilderSidebarNavActive,
} from '@/components/builder/BuilderSidebarContent';
import AppShellHeader from '@/components/layout/AppShellHeader';
import MobileNavDrawer from '@/components/layout/MobileNavDrawer';
import { useAllBuilderWarnings } from '@/lib/builder-warnings';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';

/**
 * Map the current path to a sidebar slot when the caller didn't pin one.
 * `/builder/warnings` and any `/grants/.../warning` sub-route share the
 * Warnings highlight so the breadcrumb feels rooted; `/builder` keeps Dashboard.
 */
function autoNavActiveFromPath(
  pathname: string | null,
): BuilderSidebarNavActive {
  if (!pathname) return 'dashboard';
  if (pathname === '/builder/warnings' || pathname.startsWith('/builder/warnings/')) return 'warnings';
  if (pathname.endsWith('/warning') && pathname.startsWith('/grants/')) return 'warnings';
  if (pathname === '/builder' || pathname.startsWith('/builder/')) return 'dashboard';
  return 'none';
}

type BuilderAppShellProps = {
  children: React.ReactNode;
  /** Which sidebar item shows active styles; use `none` on flows like milestone submit. */
  navActive?: BuilderSidebarNavActive;
};

export default function BuilderAppShell({ children, navActive }: BuilderAppShellProps) {
  const { address, chain } = useAccount();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const resolvedNavActive = navActive ?? autoNavActiveFromPath(pathname);

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const zkVerified = Boolean(identityData?.[0]);
  const reputationScore = (identityData?.[4] ?? BigInt(0)) as bigint;

  const warnings = useAllBuilderWarnings(address);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const warningCount = mounted ? warnings.length : 0;
  const activeWarningCount = mounted
    ? warnings.filter((w) => !w.slash).length
    : 0;

  // Always close the drawer on route change so back / forward navigation
  // doesn't leave the page in a "stuck open" state on mobile.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const closeDrawer = useCallback(() => setMobileNavOpen(false), []);

  const sharedSidebarProps = {
    navActive: resolvedNavActive,
    address: address as `0x${string}` | undefined,
    zkVerified,
    warningCount,
    activeWarningCount,
    reputationScore,
    chainName: chain?.name ?? 'Arbitrum One',
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 text-slate-900">
      <AppShellHeader
        showZkBadge
        showNetworkBadge={false}
        onOpenMobileNav={() => setMobileNavOpen(true)}
        mobileNavOpen={mobileNavOpen}
      />

      <div className="flex w-full min-w-0 flex-1">
        {/* Tablet icon rail (md..lg) — icons only, sticky. */}
        <aside
          aria-label="Builder navigation rail"
          className="sticky top-0 hidden h-screen max-h-screen w-[68px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white py-4 md:flex md:flex-col lg:hidden"
        >
          <BuilderSidebarContent {...sharedSidebarProps} variant="rail" />
        </aside>

        {/* Desktop full sidebar (lg+). */}
        <aside
          aria-label="Builder navigation"
          className="sticky top-0 hidden h-screen max-h-screen w-[268px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col"
        >
          <BuilderSidebarContent {...sharedSidebarProps} variant="full" />
        </aside>

        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </div>

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={closeDrawer}
        ariaLabel="Builder navigation"
        header={
          <Link
            href="/"
            onClick={closeDrawer}
            className="flex items-center gap-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
              G
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              GrantOS v3
            </span>
          </Link>
        }
      >
        <BuilderSidebarContent
          {...sharedSidebarProps}
          variant="full"
          onNavigate={closeDrawer}
        />
      </MobileNavDrawer>
    </div>
  );
}

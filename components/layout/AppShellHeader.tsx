'use client';

import ConnectButton from '@/components/ConnectButton';
import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import { IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';
import { APP_SHELL_PRIMARY_LINKS } from '@/lib/app-shell-nav';
import NotificationBell from '@/components/NotificationBell';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';

type AppShellHeaderProps = {
  /** When true, shows ZK status from GrantIdentityRegistry.getIdentity for the connected wallet. */
  showZkBadge?: boolean;
  /** Controls whether the desktop network pill is rendered. */
  showNetworkBadge?: boolean;
  /**
   * Optional element rendered into the right-hand trailing area on
   * desktop (sits before the network indicator). Used by the builder
   * shell to surface the live reputation pill in the persistent header.
   */
  trailingExtras?: React.ReactNode;
  /**
   * When provided, a hamburger button is rendered on mobile + tablet that
   * delegates the open action to the parent shell (so the shell can own
   * the drawer state and the sidebar content).
   */
  onOpenMobileNav?: () => void;
  /** Reflects the parent drawer state so `aria-expanded` stays accurate. */
  mobileNavOpen?: boolean;
};

export default function AppShellHeader({
  showZkBadge = false,
  showNetworkBadge = true,
  trailingExtras,
  onOpenMobileNav,
  mobileNavOpen = false,
}: AppShellHeaderProps) {
  const { address, chain, isConnected } = useAccount();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && showZkBadge },
  });

  const zkVerified = Boolean((identityData as any)?.isVerified);

  return (
    <header className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
      {/* Mobile + tablet: hamburger | logo | actions */}
      <div className="flex w-full items-center gap-3 px-4 py-2.5 sm:px-6 lg:hidden">
        {onOpenMobileNav ? (
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-navigation"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        ) : null}

        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1c1c1c] text-sm font-semibold text-white">
            G
          </span>
          <span className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            GrantOS
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell />
          {isConnected ? (
            <ConnectButton variant="avatar" />
          ) : (
            <ConnectButton variant="black" />
          )}
        </div>
      </div>

      {/* Desktop: logo | nav pills | extras + wallet */}
      <div className="hidden w-full px-6 py-3 lg:block lg:px-10">
        <div className="flex w-full items-center justify-between gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1c1c1c] text-sm font-semibold text-white">
              G
            </span>
            <span className="whitespace-nowrap text-base font-semibold tracking-tight text-slate-900">
              GrantOS
            </span>
          </Link>

          {APP_SHELL_PRIMARY_LINKS.length > 0 ? (
            <nav
              aria-label="Primary"
              className="mx-auto grid max-w-md grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-1"
            >
              {APP_SHELL_PRIMARY_LINKS.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 lg:px-4"
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </nav>
          ) : (
            <div className="mx-auto flex-1" aria-hidden />
          )}

          <div className="flex shrink-0 items-center gap-2 xl:gap-3">
            {trailingExtras}

            <NotificationBell />

            {isConnected ? (
              <>
                {showNetworkBadge ? (
                  <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm xl:inline-flex">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                    <span className="truncate">{mounted && chain?.name ? chain.name : 'Arbitrum Sepolia'}</span>
                  </div>
                ) : null}
                {showZkBadge && address ? <ZKVerifiedBadge verified={zkVerified} /> : null}
                <ConnectButton variant="header" />
              </>
            ) : (
              <ConnectButton variant="black" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

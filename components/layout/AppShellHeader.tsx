'use client';

import ConnectButton from '@/components/ConnectButton';
import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import { IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';
import { APP_SHELL_PRIMARY_LINKS } from '@/lib/app-shell-nav';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useReadContract } from 'wagmi';

type AppShellHeaderProps = {
  /** When true, shows ZK status from GrantIdentityRegistry.getIdentity for the connected wallet. */
  showZkBadge?: boolean;
};

export default function AppShellHeader({ showZkBadge = false }: AppShellHeaderProps) {
  const { address, chain, isConnected } = useAccount();

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && showZkBadge },
  });

  const zkVerified = Boolean(identityData?.[0]);

  return (
    <header className="w-full shrink-0 border-b border-slate-200/80 bg-white">
      <div className="flex w-full items-center justify-between px-4 py-3 md:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1c1c1c] text-sm font-semibold text-white">
            G
          </span>
          <span className="truncate text-base font-semibold tracking-tight text-slate-900">GrantOS v3</span>
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" strokeWidth={2} />
          </button>
          {isConnected ? <ConnectButton variant="avatar" /> : <ConnectButton variant="black" />}
        </div>
      </div>

      <div className="hidden w-full px-5 py-3 md:block md:px-8 lg:px-10">
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3 lg:min-w-0 lg:flex-1">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1c1c1c] text-sm font-semibold text-white">
                G
              </span>
              <span className="truncate text-base font-semibold tracking-tight">GrantOS v3</span>
            </Link>
          </div>

          <nav
            aria-label="Primary"
            className="grid w-full max-w-none grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1 lg:max-w-md lg:flex-1"
          >
            {APP_SHELL_PRIMARY_LINKS.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 lg:px-4"
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex w-full min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3 lg:w-auto lg:flex-1">
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" strokeWidth={2} />
            </button>

            {isConnected ? (
              <>
                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm sm:inline-flex">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  {chain?.name ?? 'Arbitrum One'}
                </div>
                {showZkBadge && address ? (
                  <div className="hidden md:flex">
                    <ZKVerifiedBadge verified={zkVerified} />
                  </div>
                ) : null}
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

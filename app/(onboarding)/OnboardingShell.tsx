'use client';

import ConnectButton from '@/components/ConnectButton';
import MobileNavDrawer from '@/components/layout/MobileNavDrawer';
import SidebarUtilityFooter from '@/components/sidebar/SidebarUtilityFooter';
import {
  Activity,
  ArrowUpRight,
  Compass,
  Home,
  Menu,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

const NAV = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Explore Grants', href: '/grants', icon: Compass },
  { label: 'Verification', href: '/verify', icon: ShieldCheck },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentSectionLabel(pathname: string | null): string {
  if (pathname === '/') return 'Onboarding';
  if (pathname?.startsWith('/grants')) return 'Public Explorer';
  if (pathname?.startsWith('/verify')) return 'Identity Verification';
  return 'GrantOS';
}

export default function OnboardingShell({
  children,
  variant = 'app',
}: {
  children: React.ReactNode;
  /**
   * `app` shows the full sidebar + sticky header used by all onboarding-state pages.
   * `bare` strips the sidebar and only renders the marketing header — useful when a page
   * wants to design its own first-fold without the global chrome.
   */
  variant?: 'app' | 'bare';
}) {
  const pathname = usePathname();
  const { isConnected, chain } = useAccount();
  const bare = variant === 'bare';
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const closeDrawer = useCallback(() => setMobileNavOpen(false), []);
  const chainName = chain?.name ?? 'Arbitrum One';

  return (
    <div className="relative flex min-h-screen w-full bg-white text-slate-900">
      {!bare ? (
        <aside
          aria-label="Onboarding navigation"
          className="sticky top-0 hidden h-screen w-[256px] shrink-0 flex-col border-r border-slate-200/80 bg-white/85 backdrop-blur lg:flex"
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-5"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              G
              <span className="absolute -right-1 -top-1 rounded-full border border-slate-200 bg-white px-1 text-[8px] font-bold text-slate-700">
                v3
              </span>
            </span>
            <span className="text-base font-bold tracking-tight">GrantOS</span>
          </Link>

          <nav className="flex-1 overflow-y-auto px-3 py-5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Explore
            </p>
            <ul className="mt-2 space-y-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`group flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                        active
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'font-medium text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'}`}
                          strokeWidth={2}
                        />
                        <span className="truncate">{label}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Now in v3
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">
                ZK-verified milestone delivery
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Funds release on cryptographic proofs, not committee opinion.
              </p>
              <Link
                href="/grants"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-slate-700"
              >
                Browse live grants
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </nav>

          <div className="border-t border-slate-100 px-3 py-4 dark:border-slate-800">
            <SidebarUtilityFooter variant="full" />
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
              <span
                aria-hidden
                className={`relative h-2 w-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-grantos-pulse' : 'bg-slate-300'
                }`}
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{chainName}</span>
              <Activity className="ml-auto h-3.5 w-3.5 text-slate-400" aria-hidden />
            </div>
            <p className="mt-2 px-1 text-[10px] text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} GrantOS Protocol
            </p>
          </div>
        </aside>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-white/75 sm:px-6 lg:px-8">
          {!bare ? (
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
          ) : null}

          <Link href="/" className="flex min-w-0 items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              G
            </span>
            <span className="truncate text-base font-bold tracking-tight">
              GrantOS<span className="ml-0.5 text-xs font-medium text-slate-500">v3</span>
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 lg:flex lg:items-center lg:gap-3">
            <p className="truncate text-xs font-medium text-slate-500">
              <span className="font-semibold text-slate-900">
                {currentSectionLabel(pathname)}
              </span>
              <span className="mx-2 text-slate-300">·</span>
              {chainName}
            </p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/grants"
              className="hidden text-sm font-semibold text-slate-700 transition hover:text-slate-900 md:inline-flex"
            >
              Explore Grants
            </Link>
            <ConnectButton variant={isConnected ? 'header' : 'black'} />
          </div>
        </header>

        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </div>

      {!bare ? (
        <MobileNavDrawer
          open={mobileNavOpen}
          onClose={closeDrawer}
          ariaLabel="Onboarding navigation"
          header={
            <Link
              href="/"
              onClick={closeDrawer}
              className="flex items-center gap-2.5"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                G
                <span className="absolute -right-1 -top-1 rounded-full border border-slate-200 bg-white px-1 text-[8px] font-bold text-slate-700">
                  v3
                </span>
              </span>
              <span className="text-base font-bold tracking-tight">GrantOS</span>
            </Link>
          }
        >
          <nav aria-label="Onboarding mobile navigation">
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Explore
            </p>
            <ul className="mt-2 space-y-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={closeDrawer}
                      className={`group flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                        active
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'font-medium text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'}`}
                          strokeWidth={2}
                          aria-hidden
                        />
                        <span className="truncate">{label}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Now in v3
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">
                ZK-verified milestone delivery
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Funds release on cryptographic proofs, not committee opinion.
              </p>
              <Link
                href="/grants"
                onClick={closeDrawer}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-slate-700"
              >
                Browse live grants
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>

            <SidebarUtilityFooter variant="full" onNavigate={closeDrawer} className="mt-6" />

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
              <span
                aria-hidden
                className={`relative h-2 w-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-grantos-pulse' : 'bg-slate-300'
                }`}
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{chainName}</span>
              <Activity className="ml-auto h-3.5 w-3.5 text-slate-400" aria-hidden />
            </div>
          </nav>
        </MobileNavDrawer>
      ) : null}
    </div>
  );
}

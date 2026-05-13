'use client';

import BuilderReputationBadge from '@/components/builder/BuilderReputationBadge';
import AppShellHeader from '@/components/layout/AppShellHeader';
import { useAllBuilderWarnings } from '@/lib/builder-warnings';
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
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { useAccount } from 'wagmi';
import { IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';

function letterGrade(reputation: bigint) {
  const score = Number(reputation);
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'D';
}

/**
 * Map the current path to a sidebar slot when the caller didn't pin one.
 * `/warnings` and any `/grants/.../warning` sub-route share the Warnings
 * highlight so the breadcrumb feels rooted; `/dashboard` keeps Dashboard.
 */
function autoNavActiveFromPath(
  pathname: string | null,
): 'dashboard' | 'warnings' | 'none' {
  if (!pathname) return 'dashboard';
  if (pathname === '/warnings' || pathname.startsWith('/warnings/')) return 'warnings';
  if (pathname.endsWith('/warning') && pathname.startsWith('/grants/')) return 'warnings';
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return 'dashboard';
  return 'none';
}

type BuilderAppShellProps = {
  children: React.ReactNode;
  /** Which sidebar item shows active styles; use `none` on flows like milestone submit. */
  navActive?: 'dashboard' | 'warnings' | 'none';
};

export default function BuilderAppShell({ children, navActive }: BuilderAppShellProps) {
  const { address, chain } = useAccount();
  const pathname = usePathname();

  // Auto-resolve the active nav slot from the URL when the caller didn't
  // pin one explicitly. Keeps sub-routes (e.g. the Warning Detail page)
  // highlighting "Warnings" in the sidebar without each route needing to
  // pass the prop manually.
  const resolvedNavActive =
    navActive ?? autoNavActiveFromPath(pathname);

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const zkVerified = Boolean(identityData?.[0]);
  const reputationScore = (identityData?.[4] ?? BigInt(0)) as bigint;

  // Live warnings list — drives the small count badge on the sidebar's
  // "Warnings" entry. Mount-gated so SSR doesn't render a count it can't
  // verify against `localStorage`.
  const warnings = useAllBuilderWarnings(address);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const warningCount = mounted ? warnings.length : 0;
  const activeWarningCount = mounted
    ? warnings.filter((w) => !w.slash).length
    : 0;

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 text-slate-900">
      <AppShellHeader showZkBadge trailingExtras={<BuilderReputationBadge />} />

      <div className="flex w-full min-w-0 flex-1">
        <aside className="sticky top-0 hidden h-screen max-h-screen w-[280px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col">
          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                resolvedNavActive === 'dashboard'
                  ? 'bg-indigo-50 font-semibold text-indigo-700'
                  : 'font-medium text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Home className="h-4 w-4" /> Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <ShieldCheck className="h-4 w-4" /> My Grants
            </Link>
            <Link
              href="/warnings"
              aria-label={`Warnings${warningCount ? ` (${warningCount})` : ''}`}
              className={`relative flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                resolvedNavActive === 'warnings'
                  ? 'bg-red-50 font-semibold text-red-700'
                  : 'font-medium text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Warnings
              </span>
              {warningCount > 0 ? (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    activeWarningCount > 0
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {warningCount}
                </span>
              ) : null}
            </Link>
            <Link
              href={address ? `/builders/${address}` : '/builders/unknown'}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <User className="h-4 w-4" /> Builder Profile
            </Link>
            <Link
              href="/verify"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                zkVerified
                  ? 'pointer-events-none bg-emerald-50 text-emerald-700'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {zkVerified ? <BadgeCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
              Verify Identity
            </Link>
          </nav>

          <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Reputation</p>
            <p className="mt-1 text-lg font-semibold">
              {Number(reputationScore).toFixed(1)}{' '}
              <span className="text-sm text-indigo-600">{letterGrade(reputationScore)}</span>
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <Link href="/verify" className="inline-flex items-center gap-1 hover:text-slate-700">
                <BookOpen className="h-3.5 w-3.5" /> How it works
              </Link>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {chain?.name ?? 'Arbitrum One'}
              </span>
            </div>
          </div>
        </aside>

        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

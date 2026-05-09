'use client';

import AppShellHeader from '@/components/layout/AppShellHeader';
import { BadgeCheck, BookOpen, CircleAlert, Home, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
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

type BuilderAppShellProps = {
  children: React.ReactNode;
  /** Which sidebar item shows active styles; use `none` on flows like milestone submit. */
  navActive?: 'dashboard' | 'none';
};

export default function BuilderAppShell({ children, navActive = 'dashboard' }: BuilderAppShellProps) {
  const { address, chain } = useAccount();

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const zkVerified = Boolean(identityData?.[0]);
  const reputationScore = (identityData?.[4] ?? BigInt(0)) as bigint;

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 text-slate-900">
      <AppShellHeader showZkBadge />

      <div className="flex w-full min-w-0 flex-1">
        <aside className="sticky top-0 hidden h-screen max-h-screen w-[280px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col">
          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                navActive === 'dashboard'
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

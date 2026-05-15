'use client';

import { IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';
import { useRoleDetection } from '@/lib/roleDetection';
import {
  ArrowUpRight,
  BadgeCheck,
  Copy,
  Code2,
  Hammer,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function letterGrade(score: number) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <Copy className="h-3.5 w-3.5" aria-hidden />
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function RolePill({
  label,
  icon: Icon,
  tone,
}: {
  label: string;
  icon: typeof Hammer;
  tone: 'blue' | 'violet' | 'emerald';
}) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
    violet:
      'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200',
    emerald:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

export default function ProfileTab() {
  const { address, isConnected } = useAccount();
  const roles = useRoleDetection();

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const zkVerified = Boolean(identityData?.[0]);
  const githubHandle = (identityData?.[1] as string) || '';
  const reputationScore = Number(identityData?.[4] ?? BigInt(0));
  const grade = letterGrade(reputationScore);

  if (!isConnected || !address) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700">
        Connect your wallet to view your profile.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-blue-950 p-5 text-white shadow-lg dark:border-slate-700 sm:p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Connected wallet</p>
        <p className="mt-2 font-mono text-lg font-semibold tracking-tight sm:text-xl">{address}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CopyButton text={address} />
          <span className="text-xs text-slate-400">{shortenAddress(address)} on Arbitrum</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your roles</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {roles.isBuilder ? <RolePill label="Builder" icon={Hammer} tone="blue" /> : null}
          {roles.isCommittee ? (
            <RolePill label="Committee Member" icon={Users} tone="violet" />
          ) : null}
          {roles.isDaoAdmin ? <RolePill label="DAO Admin" icon={Shield} tone="emerald" /> : null}
          {!roles.isBuilder && !roles.isCommittee && !roles.isDaoAdmin ? (
            <span className="text-sm text-slate-500">No on-chain roles detected yet.</span>
          ) : null}
        </div>
      </div>

      {roles.isBuilder ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Identity
                </p>
                {zkVerified ? (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <BadgeCheck className="h-4 w-4" aria-hidden />
                    ZK Verified
                  </div>
                ) : (
                  <Link
                    href="/verify"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Complete Verification
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
              </div>
              <Sparkles className="h-5 w-5 text-violet-500" aria-hidden />
            </div>
            {githubHandle ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Code2 className="h-4 w-4" aria-hidden />@{githubHandle}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-indigo-50 to-white p-5 dark:border-slate-700 dark:from-indigo-950/40 dark:to-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Reputation
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {reputationScore}
              <span className="ml-2 text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                {grade}
              </span>
            </p>
            <Link
              href="/profile"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View Full Profile
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

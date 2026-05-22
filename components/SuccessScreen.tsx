'use client';

import { GrantIdentity } from '@/grant-creation/store';
import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import { IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';
import { Check, Copy, Star } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Address, isAddress } from 'viem';
import { useReadContract } from 'wagmi';

type SuccessScreenProps = {
  grantId: string;
  builderAddress: string;
  builderIdentity: GrantIdentity | null;
  onCreateAnotherGrant: () => void;
};

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function tierLabel(tier: number) {
  if (tier >= 3) return 'Tier 3';
  if (tier === 2) return 'Tier 2';
  if (tier === 1) return 'Tier 1';
  return 'Tier 0';
}

export default function SuccessScreen({
  grantId,
  builderAddress,
  builderIdentity,
  onCreateAnotherGrant,
}: SuccessScreenProps) {
  const canReadIdentity = isAddress(builderAddress);
  const { data } = useReadContract({
    abi: identityRegistryAbi,
    address: IDENTITY_REGISTRY_ADDRESS,
    functionName: 'getIdentity',
    args: canReadIdentity ? [builderAddress as Address] : undefined,
    query: { enabled: canReadIdentity },
  });

  const freshIdentity = useMemo<GrantIdentity | null>(() => {
    if (!data) return null;
    return {
      zkVerified: data.isVerified,
      githubHandle: data.githubHandle,
      accountCreationYear: Number(data.createdYear),
      contributionTier: Number(data.tier),
      reputationScore: BigInt(0),
    };
  }, [data]);

  const identity = freshIdentity ?? builderIdentity;
  const repScore = identity ? Number(identity.reputationScore).toFixed(1) : '0.0';
  const github = identity?.githubHandle ? `@${identity.githubHandle}` : '@unknown';
  const tier = tierLabel(identity?.contributionTier ?? 0);
  const isVerified = Boolean(identity?.zkVerified);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/grants/${grantId}` : `/grants/${grantId}`;

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex items-center justify-between px-1 text-xs font-medium text-slate-400 sm:text-sm">
        <Link
          href="/dao"
          className="text-slate-400 transition hover:text-slate-600"
        >
          ← Back to DAO Dashboard
        </Link>
        <span>Grant Creation Complete</span>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:px-8 sm:py-9">
        <div className="mx-auto flex w-full max-w-[420px] flex-col items-center text-center">
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-rose-100/90" />
            <span className="absolute inset-2 rounded-full bg-rose-50" />
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#ff6b4a] text-white">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
          </div>

          <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-slate-900">
            Grant Successfully Created!
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your grant has been deployed to the GrantEscrow smart contract on Arbitrum Sepolia and is now
            live.
          </p>
        </div>

        <div className="mx-auto mt-6 w-full max-w-[420px] rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Grant ID</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Confirmed
            </span>
          </div>
          <p className="font-mono text-base font-semibold text-slate-900">GRT-2026-{grantId}</p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left font-mono text-[11px] text-slate-500">
              <span className="block truncate">{shareUrl}</span>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(shareUrl).catch(() => {})}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
        </div>

        <div className="mx-auto mt-5 w-full max-w-[420px] overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="h-1 w-full bg-linear-to-r from-cyan-500 via-amber-500 to-teal-500" />
          <div className="px-3.5 py-3.5">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <p className="text-xs font-semibold text-slate-700">Builder Identity Verified</p>
              <ZKVerifiedBadge verified={isVerified} />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                {builderAddress.slice(2, 4).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{shortAddress(builderAddress)}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500" fill="currentColor" />
                    {repScore}
                  </span>
                  <span>{github}</span>
                  <span>{tier}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-[420px] flex-col gap-2.5 sm:flex-row">
          <Link
            href="/dao"
            className="inline-flex flex-1 items-center justify-center rounded-md bg-[#ff5b37] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f04f29]"
          >
            Go to DAO Dashboard →
          </Link>
          <button
            type="button"
            onClick={onCreateAnotherGrant}
            className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Create Another Grant
          </button>
        </div>
      </section>
    </main>
  );
}

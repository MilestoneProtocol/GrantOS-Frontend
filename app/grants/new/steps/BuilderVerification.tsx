'use client';

import { GrantIdentity } from '@/app/grants/new/store';
import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import { IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';
import { Trophy } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Address, isAddress } from 'viem';
import { useReadContract } from 'wagmi';

type BuilderVerificationProps = {
  builderAddress: string;
  onBuilderChange: (value: string) => void;
  onIdentityLoaded: (identity: GrantIdentity | null) => void;
};

function EthLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 417" aria-hidden fill="currentColor">
      <path d="M127.961 0 248 218 127.961 154 8 218zm-.049 417 119.988-157 119.988 157-239.976-.049zm119.988-261 119.988 157L247.951 291 247.951 156zM8 218l119.988-157v135L8 218z" />
    </svg>
  );
}

export default function BuilderVerification({
  builderAddress,
  onBuilderChange,
  onIdentityLoaded,
}: BuilderVerificationProps) {
  const valid = isAddress(builderAddress);

  const { data, isLoading, isError, error } = useReadContract({
    abi: identityRegistryAbi,
    address: IDENTITY_REGISTRY_ADDRESS,
    functionName: 'getIdentity',
    args: valid ? [builderAddress as Address] : undefined,
    query: {
      enabled: valid,
    },
  });

  const identity = useMemo(
    () =>
      data
        ? {
            zkVerified: data[0],
            githubHandle: data[1],
            accountCreationYear: Number(data[2]),
            contributionTier: Number(data[3]),
            reputationScore: data[4],
          }
        : null,
    [data]
  );

  useEffect(() => {
    onIdentityLoaded(identity);
  }, [identity, onIdentityLoaded]);

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="text-[1.8rem] font-semibold leading-tight tracking-tight text-slate-900">
          Builder Verification
        </h2>
        <p className="text-sm leading-relaxed text-slate-500">
          Enter the wallet address of the builder receiving this grant.
        </p>
      </div>

      <div className="space-y-3.5">
        <label htmlFor="builder-wallet" className="block text-sm font-medium text-slate-900">
          Builder Wallet Address
        </label>
        <div className="relative">
          <input
            id="builder-wallet"
            value={builderAddress}
            onChange={(e) => onBuilderChange(e.target.value.trim())}
            placeholder="0x..."
            autoComplete="off"
            spellCheck={false}
            className="h-[46px] w-full rounded-xl border border-slate-200 bg-[#f7f8fb] px-4 pr-18 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
          />
          <button
            type="button"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text) onBuilderChange(text.trim());
              } catch {
                /* clipboard denied */
              }
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#2563eb] transition hover:text-[#1d4ed8]"
          >
            Paste
          </button>
        </div>
        {!valid && builderAddress ? (
          <p className="text-sm text-red-500">Enter a valid wallet address.</p>
        ) : null}
      </div>

      {valid && isLoading ? (
        <p className="text-sm text-slate-500">Loading identity from GrantIdentityRegistry…</p>
      ) : null}

      {valid && isError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not read identity: {error?.message ?? 'RPC or contract error.'}
        </p>
      ) : null}

      {valid && identity ? (
        <div className="rounded-[16px] border border-slate-200 bg-[#f8f9fb] px-4 py-4 sm:px-4.5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6efff] text-[#2f6feb]">
                <EthLogo className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">Identity Registry Data</h3>
                <p className="mt-0.5 text-xs text-slate-500">Queried via getIdentity(address)</p>
              </div>
            </div>
            <div className="shrink-0 sm:pt-0.5">
              <ZKVerifiedBadge verified={identity.zkVerified} />
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200/80 pt-4">
            <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">GitHub Handle</p>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <svg
                  className="h-4 w-4 shrink-0 text-slate-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12a12 12 0 0 0 8.2 11.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.17 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 5.8a11.5 11.5 0 0 1 3.01.41c2.29-1.55 3.29-1.23 3.29-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.21.69.82.57A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
                </svg>
                <span className="truncate">
                  {identity.githubHandle ? `@${identity.githubHandle}` : '—'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">Contribution Tier</p>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Trophy className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} />
                <span>{formatContributionTier(identity.contributionTier)}</span>
              </div>
            </div>
          </div>
          </div>

          {!identity.zkVerified ? (
            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              This builder has not completed ZK Identity Binding
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatContributionTier(tier: number) {
  if (tier === 3) return 'Gold Tier';
  if (tier === 2) return 'Silver Tier';
  if (tier === 1) return 'Bronze Tier';
  return tier === 0 ? '—' : `Tier ${tier}`;
}

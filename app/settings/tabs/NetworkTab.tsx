'use client';

import { GRANT_ESCROW_ADDRESS, IDENTITY_REGISTRY_ADDRESS } from '@/lib/escrow';
import { config } from '@/lib/wagmi';
import { AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { Address } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { useAccount, useSwitchChain } from 'wagmi';

const REPUTATION_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS ||
  '0x0000000000000000000000000000000000000003') as Address;

const TARGET_CHAIN_ID = arbitrumSepolia.id;

function arbiscanAddressUrl(address: string) {
  return `https://sepolia.arbiscan.io/address/${address}`;
}

function ContractRow({
  name,
  address,
}: {
  name: string;
  address: Address;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [address]);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{name}</p>
      <p className="mt-1 break-all font-mono text-sm text-slate-800 dark:text-slate-200">{address}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href={arbiscanAddressUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-900 dark:text-blue-400"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Arbiscan
        </a>
      </div>
    </div>
  );
}

export default function NetworkTab() {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  const onTargetChain = chain?.id === TARGET_CHAIN_ID;
  const targetChain = config.chains.find((c) => c.id === TARGET_CHAIN_ID) ?? arbitrumSepolia;

  return (
    <div className="space-y-5">
      {!onTargetChain && isConnected ? (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          <p className="font-medium">
            GrantOS v3 runs on Arbitrum Sepolia — please switch networks.
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Connected chain
        </p>
        <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
          {chain?.name ?? 'Not connected'}
        </p>
        <p className="mt-0.5 font-mono text-xs text-slate-500">Chain ID: {chain?.id ?? '—'}</p>
        <button
          type="button"
          disabled={!isConnected || isPending || onTargetChain}
          onClick={() => switchChain({ chainId: targetChain.id })}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-blue-600 dark:hover:bg-blue-500 sm:w-auto sm:min-w-[200px]"
        >
          {isPending ? 'Switching…' : 'Switch Network'}
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Deployed contracts</p>
        <ContractRow name="GrantEscrow.sol" address={GRANT_ESCROW_ADDRESS} />
        <ContractRow name="GrantIdentityRegistry.sol" address={IDENTITY_REGISTRY_ADDRESS} />
        <ContractRow name="ReputationRegistry.sol" address={REPUTATION_REGISTRY_ADDRESS} />
      </div>
    </div>
  );
}

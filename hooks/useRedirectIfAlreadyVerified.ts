'use client';

import { CONTRACTS_READY, IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAccount, useReadContract } from 'wagmi';

/**
 * Sends already ZK-verified wallets back to onboarding so they can pick a role.
 * Never blocks rendering — the verify UI stays visible until redirect runs.
 */
export function useRedirectIfAlreadyVerified() {
  const router = useRouter();
  const { address, status } = useAccount();
  const redirected = useRef(false);

  const walletResolved = status !== 'connecting' && status !== 'reconnecting';

  const { data: verified, isLoading, isError } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'isVerified',
    args: address ? [address] : undefined,
    query: {
      enabled: CONTRACTS_READY && Boolean(address) && walletResolved,
    },
  });

  useEffect(() => {
    if (redirected.current) return;
    if (!walletResolved || !address) return;
    if (!CONTRACTS_READY) return;
    if (isLoading || isError) return;
    if (verified !== true) return;
    redirected.current = true;
    router.replace('/?select=1&toast=already_verified');
  }, [address, isError, isLoading, router, verified, walletResolved]);

  return { checking: Boolean(address) && walletResolved && CONTRACTS_READY && isLoading };
}

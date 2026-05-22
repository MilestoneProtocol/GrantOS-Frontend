'use client';

import { BUILDER_TOAST_MESSAGES } from '@/lib/builder-toast';
import { useRoleDetection } from '@/lib/roleDetection';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';

export type RequiredRole = 'builder' | 'committee' | 'dao' | 'connected' | 'public';

type GuardState =
  | { state: 'public' }
  | { state: 'loading' }
  | { state: 'allowed' }
  | { state: 'blocked' };

function roleFromRoles(requiredRole: RequiredRole, roles: ReturnType<typeof useRoleDetection>) {
  if (requiredRole === 'public' || requiredRole === 'connected') return true;
  if (requiredRole === 'dao') return roles.isDaoAdmin;
  // Committee routes require BOTH on-chain committee membership AND ZK identity
  // verification. Either alone is insufficient.
  if (requiredRole === 'committee') return roles.isCommittee && roles.isVerified;
  if (requiredRole === 'builder') return roles.isBuilder || roles.isVerified;

  return false;
}

/**
 * Reusable auth + role guard used by protected routes.
 *
 * Behavior:
 * - If wallet disconnected on a protected route → redirect to `/` with toast.
 * - `connected`: any connected wallet is allowed (e.g. grant creation).
 * - If wallet connected but role doesn't match → redirect to `/` (onboarding will show Role Selection).
 *
 * Returns a small state machine so pages can choose to render a skeleton while role detection resolves.
 */
export function useAuthGuard(requiredRole: RequiredRole): GuardState {
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected, status } = useAccount();
  const roles = useRoleDetection();

  const walletResolved = status !== 'connecting' && status !== 'reconnecting';

  const state = useMemo<GuardState>(() => {
    if (requiredRole === 'public') return { state: 'public' };
    if (!walletResolved) return { state: 'loading' };
    if (!isConnected) return { state: 'blocked' };
    if (requiredRole === 'connected') return { state: 'allowed' };
    if (roles.loading) return { state: 'loading' };

    const matches = roleFromRoles(requiredRole, roles);
    // If the role doesn't match BUT a refetch is in flight, the cached data may
    // be stale (e.g. just after a `createGrant` tx). Surface a loading skeleton
    // rather than the access-denied UI until the fetch settles.
    if (!matches && roles.isFetching) return { state: 'loading' };
    return matches ? { state: 'allowed' } : { state: 'blocked' };
  }, [isConnected, requiredRole, roles, walletResolved]);

  useEffect(() => {
    if (requiredRole === 'public') return;
    if (!walletResolved) return;

    if (!isConnected) {
      // Keep toast keys aligned with existing toast strip approach.
      const key = 'connect_wallet';
      const message = BUILDER_TOAST_MESSAGES[key] ?? 'Connect your wallet to continue.';
      router.replace(`/?toast=${encodeURIComponent(key)}&m=${encodeURIComponent(message)}&from=${encodeURIComponent(pathname ?? '')}`);
      return;
    }

    if (requiredRole === 'connected') return;

    // Don't bounce while role detection is still resolving — including background
    // refetches. After a `createGrant` tx the data flows in a 3-stage cascade
    // (grantCount → escrow addresses → per-escrow role reads); bouncing on the
    // stale snapshot would kick a fresh grantor to onboarding.
    if (roles.loading || roles.isFetching) return;

    if (!roleFromRoles(requiredRole, roles)) {
      // Tailor the redirect to the specific failure for committee routes:
      //   - On-chain committee member but not yet ZK-verified → /verify with toast.
      //   - Not a committee member at all → onboarding / role selection.
      if (requiredRole === 'committee') {
        if (roles.isCommittee && !roles.isVerified) {
          router.replace(`/verify?toast=complete_verification`);
          return;
        }
        router.replace(
          `/?toast=not_committee&from=${encodeURIComponent(pathname ?? '')}`,
        );
        return;
      }
      router.replace(`/?select=1&from=${encodeURIComponent(pathname ?? '')}`);
    }
  }, [isConnected, pathname, requiredRole, roles, router, walletResolved]);

  return state;
}


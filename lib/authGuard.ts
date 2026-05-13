'use client';

import { BUILDER_TOAST_MESSAGES } from '@/lib/builder-toast';
import { useRoleDetection } from '@/lib/roleDetection';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';

export type RequiredRole = 'builder' | 'committee' | 'dao' | 'public';

type GuardState =
  | { state: 'public' }
  | { state: 'loading' }
  | { state: 'allowed' }
  | { state: 'blocked' };

function roleFromRoles(requiredRole: RequiredRole, roles: ReturnType<typeof useRoleDetection>) {
  if (requiredRole === 'public') return true;
  if (requiredRole === 'dao') return roles.isDaoAdmin;
  if (requiredRole === 'committee') return roles.isCommittee;
  if (requiredRole === 'builder') return roles.isBuilder;
  return false;
}

/**
 * Reusable auth + role guard used by protected routes.
 *
 * Behavior:
 * - If wallet disconnected on a protected route → redirect to `/` with toast.
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
    if (roles.loading) return { state: 'loading' };
    return roleFromRoles(requiredRole, roles) ? { state: 'allowed' } : { state: 'blocked' };
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

    if (!roles.loading && !roleFromRoles(requiredRole, roles)) {
      router.replace(`/?select=1&from=${encodeURIComponent(pathname ?? '')}`);
    }
  }, [isConnected, pathname, requiredRole, roles, router, walletResolved]);

  return state;
}


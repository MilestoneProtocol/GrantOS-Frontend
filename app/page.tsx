'use client';

import LandingPage from '@/app/LandingPage';
import RoleSelection from '@/app/RoleSelection';
import DetectingRoleSkeleton from '@/app/(onboarding)/DetectingRoleSkeleton';
import OnboardingShell from '@/app/(onboarding)/OnboardingShell';
import OnboardingToast from '@/app/(onboarding)/OnboardingToast';
import { isRoleCheckBypassed } from '@/lib/role-access';
import { useRoleDetection } from '@/lib/roleDetection';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';

/** Minimum time on `/` before auto-redirecting a returning connected wallet (lets the shell land visually). */
const MIN_MS_ON_HOME_BEFORE_REDIRECT = 3000;

function EntryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected, status } = useAccount();
  const roles = useRoleDetection();
  const redirectedRef = useRef(false);
  const homeEnteredAtRef = useRef(Date.now());

  const walletResolved = status !== 'connecting' && status !== 'reconnecting';
  const forceRoleSelect = searchParams.get('select') === '1';
  const bypassRoles = isRoleCheckBypassed() || roles.bypassActive;

  useEffect(() => {
    if (redirectedRef.current) return;
    if (!walletResolved) return;
    if (!isConnected) return;
    if (roles.loading) return;

    // Local / demo: always show role picker — no auto-redirect to a single surface.
    if (bypassRoles) return;

    // PRD decision tree (in order).
    // 1) New wallet → role selection
    if (roles.isNewWallet) return;

    let target: string | null = null;

    // 2) Builder only, unverified → /verify with toast
    if (roles.isBuilder && !roles.isVerified && !roles.isCommittee) {
      target = '/verify?toast=complete_verification';
    } else if (roles.isBuilder && roles.isVerified && !roles.isCommittee) {
      // 3) Builder only, verified → /builder
      target = '/builder';
    } else if (roles.isCommittee && !roles.isBuilder) {
      // 4) Committee only (DAO admin check comes first)
      target = roles.isDaoAdmin ? '/dao' : '/committee';
    } else if (roles.hasMultipleRoles) {
      // 5) Both builder + committee → role selection (no redirect)
      return;
    } else {
      return;
    }

    const elapsed = Date.now() - homeEnteredAtRef.current;
    const waitMs = Math.max(0, MIN_MS_ON_HOME_BEFORE_REDIRECT - elapsed);
    const timer = window.setTimeout(() => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      router.replace(target!);
    }, waitMs);
    return () => window.clearTimeout(timer);
  }, [
    isConnected,
    roles.hasMultipleRoles,
    roles.isBuilder,
    roles.isCommittee,
    roles.isDaoAdmin,
    roles.isNewWallet,
    roles.isVerified,
    roles.loading,
    router,
    walletResolved,
    bypassRoles,
  ]);

  const shouldDetect = walletResolved && isConnected;
  const showSkeleton = shouldDetect && roles.loading;
  const showRoleSelection =
    shouldDetect &&
    !roles.loading &&
    (bypassRoles ||
      forceRoleSelect ||
      roles.isNewWallet ||
      roles.hasMultipleRoles ||
      (roles.isBuilder && roles.isCommittee));

  const builderUnverifiedNudge =
    shouldDetect && !roles.loading && roles.isBuilder && !roles.isVerified;

  return (
    <OnboardingShell>
      <OnboardingToast />
      {showSkeleton ? (
        <DetectingRoleSkeleton />
      ) : showRoleSelection ? (
        <RoleSelection
          showDaoCard={bypassRoles || roles.isNewWallet || roles.isDaoAdmin}
          builderUnverifiedNudge={!bypassRoles && builderUnverifiedNudge}
          devBypassActive={bypassRoles}
        />
      ) : (
        <LandingPage />
      )}
    </OnboardingShell>
  );
}

export default function EntryPage() {
  return (
    <Suspense fallback={<DetectingRoleSkeleton />}>
      <EntryPageInner />
    </Suspense>
  );
}

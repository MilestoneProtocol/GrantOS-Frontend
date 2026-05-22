'use client';

import LandingPage from '@/app/LandingPage';
import RoleSelection from '@/app/RoleSelection';
import DetectingRoleSkeleton from '@/app/(onboarding)/DetectingRoleSkeleton';
import OnboardingShell from '@/app/(onboarding)/OnboardingShell';
import OnboardingToast from '@/app/(onboarding)/OnboardingToast';
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
  const homeEnteredAtRef = useRef(0);

  const walletResolved = status !== 'connecting' && status !== 'reconnecting';
  const forceRoleSelect = searchParams.get('select') === '1';
  useEffect(() => {
    if (homeEnteredAtRef.current !== 0) return;
    homeEnteredAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (redirectedRef.current) return;
    if (!walletResolved) return;
    if (!isConnected) return;
    if (roles.loading) return;

    // PRD decision tree (in order).
    // 1) New wallet → role selection
    if (roles.isNewWallet) return;

    let target: string | null = null;

    // DAO admin (grantor on any grant, or member of 3+ committees) wins when not also a builder.
    // A grantor seated on their own grant's committee still belongs in /dao.
    if (roles.isDaoAdmin && !roles.isBuilder) {
      target = '/dao';
    } else if (roles.hasMultipleRoles) {
      return;
    } else if (roles.isCommittee && !roles.isBuilder) {
      // Committee routes require ZK verification too — send unverified
      // committee members to /verify first, otherwise the guard would bounce.
      target = roles.isVerified
        ? '/committee'
        : '/verify?toast=complete_verification';
    } else if (roles.isBuilder && !roles.isVerified) {
      target = '/verify?toast=complete_verification';
    } else if (roles.isBuilder) {
      target = '/builder';
    } else if (roles.isVerified) {
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
  ]);

  const shouldDetect = walletResolved && isConnected;
  const showSkeleton = shouldDetect && roles.loading;
  const showRoleSelection =
    shouldDetect &&
    !roles.loading &&
    (forceRoleSelect ||
      roles.isNewWallet ||
      roles.hasMultipleRoles ||
      (roles.isBuilder && roles.isCommittee) ||
      (roles.isVerified &&
        !roles.isBuilder &&
        !roles.isCommittee &&
        !roles.isDaoAdmin));

  const builderUnverifiedNudge =
    shouldDetect && !roles.loading && roles.isBuilder && !roles.isVerified;

  return (
    <OnboardingShell>
      <OnboardingToast />
      {showSkeleton ? (
        <DetectingRoleSkeleton />
      ) : showRoleSelection ? (
        <RoleSelection
          showDaoCard={
            roles.isNewWallet ||
            roles.isDaoAdmin ||
            (roles.isVerified && !roles.isBuilder && !roles.isCommittee)
          }
          builderUnverifiedNudge={builderUnverifiedNudge}
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

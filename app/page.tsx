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

function EntryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected, status } = useAccount();
  const roles = useRoleDetection();
  const redirectedRef = useRef(false);

  const walletResolved = status !== 'connecting' && status !== 'reconnecting';
  const forceRoleSelect = searchParams.get('select') === '1';

  useEffect(() => {
    if (redirectedRef.current) return;
    if (!walletResolved) return;
    if (!isConnected) return;
    if (roles.loading) return;

    // PRD decision tree (in order).
    // 1) New wallet → role selection
    if (roles.isNewWallet) return;

    // 2) Builder only, unverified → /verify with toast
    if (roles.isBuilder && !roles.isVerified && !roles.isCommittee) {
      redirectedRef.current = true;
      router.replace('/verify?toast=complete_verification');
      return;
    }

    // 3) Builder only, verified → /dashboard
    if (roles.isBuilder && roles.isVerified && !roles.isCommittee) {
      redirectedRef.current = true;
      router.replace('/dashboard');
      return;
    }

    // 4) Committee only (DAO admin check comes first)
    if (roles.isCommittee && !roles.isBuilder) {
      redirectedRef.current = true;
      router.replace(roles.isDaoAdmin ? '/dao' : '/committee');
      return;
    }

    // 5) Both builder + committee → role selection
    if (roles.hasMultipleRoles) return;
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
    (forceRoleSelect || roles.isNewWallet || roles.hasMultipleRoles || (roles.isBuilder && roles.isCommittee));

  const builderUnverifiedNudge =
    shouldDetect && !roles.loading && roles.isBuilder && !roles.isVerified;

  return (
    <OnboardingShell>
      <OnboardingToast />
      {showSkeleton ? (
        <DetectingRoleSkeleton />
      ) : showRoleSelection ? (
        <RoleSelection
          showDaoCard={roles.isNewWallet || roles.isDaoAdmin}
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

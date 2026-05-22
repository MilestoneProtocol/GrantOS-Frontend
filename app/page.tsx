'use client';

import LandingPage from '@/app/LandingPage';
import RoleSelection from '@/app/RoleSelection';
import DetectingRoleSkeleton from '@/app/(onboarding)/DetectingRoleSkeleton';
import OnboardingShell from '@/app/(onboarding)/OnboardingShell';
import OnboardingToast from '@/app/(onboarding)/OnboardingToast';
import { useRoleDetection } from '@/lib/roleDetection';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAccount } from 'wagmi';

function EntryPageInner() {
  const searchParams = useSearchParams();
  const { isConnected, status } = useAccount();
  const roles = useRoleDetection();

  const walletResolved = status !== 'connecting' && status !== 'reconnecting';
  // No auto-redirect — always let the user choose their destination from the
  // onboarding page. The role-selection UI is shown for all connected wallets.

  const shouldDetect = walletResolved && isConnected;
  const showSkeleton = shouldDetect && roles.loading;
  const showRoleSelection = shouldDetect && !roles.loading;

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

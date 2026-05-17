'use client';

import OnboardingShell from '@/app/(onboarding)/OnboardingShell';
import { GrantDetailPageContent } from '@/components/grants/GrantDetailPageContent';

/** Public read-only grant detail (`/grants/[id]`). */
export default function PublicGrantDetailPage() {
  return (
    <OnboardingShell>
      <GrantDetailPageContent variant="public" />
    </OnboardingShell>
  );
}

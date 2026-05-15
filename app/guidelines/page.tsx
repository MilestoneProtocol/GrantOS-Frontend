'use client';

import OnboardingShell from '@/app/(onboarding)/OnboardingShell';
import GuidelinesPageContent from '@/components/guidelines/GuidelinesPageContent';

export default function GuidelinesPage() {
  return (
    <OnboardingShell>
      <GuidelinesPageContent />
    </OnboardingShell>
  );
}

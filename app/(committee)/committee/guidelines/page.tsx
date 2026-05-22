'use client';

import CommitteeAppShell from '@/components/committee/CommitteeAppShell';
import GuidelinesPageContent from '@/components/guidelines/GuidelinesPageContent';

export default function CommitteeGuidelinesPage() {
  return (
    <CommitteeAppShell breadcrumb="Guidelines">
      <GuidelinesPageContent />
    </CommitteeAppShell>
  );
}

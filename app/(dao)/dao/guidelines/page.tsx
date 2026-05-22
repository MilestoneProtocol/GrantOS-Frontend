'use client';

import DaoAppShell from '@/components/dao/DaoAppShell';
import GuidelinesPageContent from '@/components/guidelines/GuidelinesPageContent';

export default function DaoGuidelinesPage() {
  return (
    <DaoAppShell breadcrumb="Guidelines">
      <GuidelinesPageContent />
    </DaoAppShell>
  );
}

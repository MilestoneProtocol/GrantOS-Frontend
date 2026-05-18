'use client';

import BuilderAppShell from '@/components/builder/BuilderAppShell';
import GuidelinesPageContent from '@/components/guidelines/GuidelinesPageContent';

export default function BuilderGuidelinesPage() {
  return (
    <BuilderAppShell navActive="none">
      <GuidelinesPageContent />
    </BuilderAppShell>
  );
}

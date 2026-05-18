'use client';

import BuilderAppShell from '@/components/builder/BuilderAppShell';
import { GrantDetailPageContent } from '@/components/grants/GrantDetailPageContent';

/** Builder-scoped grant detail — same milestone data, builder shell (not public explorer). */
export default function BuilderGrantDetailPage() {
  return (
    <BuilderAppShell navActive="my-grants">
      <GrantDetailPageContent variant="builder" />
    </BuilderAppShell>
  );
}

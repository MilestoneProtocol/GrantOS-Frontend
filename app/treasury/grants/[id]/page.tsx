'use client';

import DaoAppShell from '@/components/dao/DaoAppShell';
import { GrantDetailPageContent } from '@/components/grants/GrantDetailPageContent';
import { useParams } from 'next/navigation';

/** Treasury-scoped grant detail (DAO demo catalogue, stays in treasury context). */
export default function TreasuryGrantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  return (
    <DaoAppShell
      breadcrumb={[
        { label: 'Treasury', href: '/treasury' },
        { label: id ? `Grant ${id}` : 'Grant' },
      ]}
    >
      <GrantDetailPageContent variant="treasury" />
    </DaoAppShell>
  );
}

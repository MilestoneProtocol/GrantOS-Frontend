'use client';

import DaoAppShell from '@/components/dao/DaoAppShell';
import { GrantDetailPageContent } from '@/components/grants/GrantDetailPageContent';
import { useParams } from 'next/navigation';

/** DAO oversight view for a grant (not the public explorer route). */
export default function DaoGrantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  return (
    <DaoAppShell
      breadcrumb={[
        { label: 'DAO Dashboard', href: '/dao' },
        { label: id ? `Grant ${id}` : 'Grant' },
      ]}
    >
      <GrantDetailPageContent variant="dao" />
    </DaoAppShell>
  );
}

'use client';

import MilestoneSubmitSuccess from '@/components/builder/milestone-submit/MilestoneSubmitSuccess';
import { useMilestoneSubmit } from '@/components/builder/milestone-submit/MilestoneSubmitProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MilestoneSubmitSuccessPage() {
  const { gate, submitSessionReady, submissionMeta, submitBasePath } = useMilestoneSubmit();
  const router = useRouter();

  useEffect(() => {
    if (gate.kind !== 'ok' || !submitSessionReady) return;
    if (!submissionMeta?.completedAt) {
      router.replace(`${submitBasePath}/onchain`);
    }
  }, [gate.kind, router, submissionMeta?.completedAt, submitBasePath, submitSessionReady]);

  if (!submitSessionReady || !submissionMeta?.completedAt) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center py-16">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return <MilestoneSubmitSuccess />;
}

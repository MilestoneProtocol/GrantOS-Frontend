'use client';

import SummaryAiStep from '@/components/builder/milestone-submit/SummaryAiStep';
import { useMilestoneSubmit } from '@/components/builder/milestone-submit/MilestoneSubmitProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MilestoneSubmitSummaryPage() {
  const {
    gate,
    uiStep,
    submitBasePath,
    canContinueStep1,
    submitSessionReady,
    zkOutcome,
    proofPreview,
  } = useMilestoneSubmit();
  const router = useRouter();

  useEffect(() => {
    if (gate.kind !== 'ok' || !submitSessionReady) return;
    if (uiStep < 3) {
      router.replace(canContinueStep1 ? `${submitBasePath}/proof` : `${submitBasePath}/context`);
      return;
    }
    if (zkOutcome !== 'success' || !proofPreview) {
      router.replace(`${submitBasePath}/proof`);
    }
  }, [
    canContinueStep1,
    gate.kind,
    proofPreview,
    router,
    submitBasePath,
    submitSessionReady,
    uiStep,
    zkOutcome,
  ]);

  if (!submitSessionReady || uiStep < 3 || zkOutcome !== 'success' || !proofPreview) {
    return (
      <div className="flex flex-1 flex-col justify-center py-16">
        <p className="text-center text-sm text-slate-500">Loading summary…</p>
      </div>
    );
  }

  return <SummaryAiStep />;
}

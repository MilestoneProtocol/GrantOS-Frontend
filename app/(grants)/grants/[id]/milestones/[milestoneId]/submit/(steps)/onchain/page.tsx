'use client';

import OnchainSubmitStep from '@/components/builder/milestone-submit/OnchainSubmitStep';
import { useMilestoneSubmit } from '@/components/builder/milestone-submit/MilestoneSubmitProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const SUMMARY_MIN = 50;

export default function MilestoneSubmitOnchainPage() {
  const {
    gate,
    uiStep,
    submitBasePath,
    submitSessionReady,
    zkOutcome,
    proofPreview,
    writtenSummary,
  } = useMilestoneSubmit();
  const router = useRouter();

  useEffect(() => {
    if (gate.kind !== 'ok' || !submitSessionReady) return;
    if (uiStep >= 4) return;
    const target =
      uiStep <= 1
        ? `${submitBasePath}/context`
        : uiStep === 2
          ? `${submitBasePath}/proof`
          : `${submitBasePath}/summary`;
    router.replace(target);
  }, [gate.kind, router, submitBasePath, submitSessionReady, uiStep]);

  useEffect(() => {
    if (gate.kind !== 'ok' || !submitSessionReady || uiStep < 4) return;
    if (
      zkOutcome !== 'success' ||
      !proofPreview ||
      writtenSummary.trim().length < SUMMARY_MIN
    ) {
      router.replace(`${submitBasePath}/summary`);
    }
  }, [
    gate.kind,
    proofPreview,
    router,
    submitBasePath,
    submitSessionReady,
    uiStep,
    writtenSummary,
    zkOutcome,
  ]);

  if (
    !submitSessionReady ||
    uiStep < 4 ||
    zkOutcome !== 'success' ||
    !proofPreview ||
    writtenSummary.trim().length < SUMMARY_MIN
  ) {
    return (
      <div className="flex flex-1 flex-col justify-center py-16">
        <p className="text-center text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return <OnchainSubmitStep />;
}

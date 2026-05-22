'use client';

import ZkProofPanel from '@/components/builder/milestone-submit/ZkProofPanel';
import { useMilestoneSubmit } from '@/components/builder/milestone-submit/MilestoneSubmitProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MilestoneSubmitProofPage() {
  const {
    gate,
    submitBasePath,
    zkSubstep,
    loadingRunId,
    registeredGithubHandle,
    repoTrimmed,
    prTrimmed,
    onProofResolved,
    zkOutcome,
    zkErrorMessage,
    proofPreview,
    onZkTryAgain,
    continueToSummary,
    canContinueStep1,
    submitSessionReady,
  } = useMilestoneSubmit();

  const router = useRouter();

  useEffect(() => {
    if (gate.kind !== 'ok' || !submitSessionReady) return;
    if (!canContinueStep1 || zkSubstep === null) {
      router.replace(`${submitBasePath}/context`);
    }
  }, [canContinueStep1, gate.kind, router, submitBasePath, submitSessionReady, zkSubstep]);

  if (!submitSessionReady || zkSubstep === null) {
    return (
      <div className="flex flex-1 flex-col justify-center py-16">
        <p className="text-center text-sm text-slate-500">Loading proof workspace…</p>
      </div>
    );
  }

  return (
    <ZkProofPanel
      zkSubstep={zkSubstep}
      loadingRunId={loadingRunId}
      registeredGithubHandle={registeredGithubHandle}
      repo={repoTrimmed}
      pr={prTrimmed}
      onProofResolved={onProofResolved}
      zkOutcome={zkOutcome}
      zkErrorMessage={zkErrorMessage}
      proofPreview={proofPreview}
      onTryAgain={onZkTryAgain}
      onContinueToNextStep={continueToSummary}
    />
  );
}

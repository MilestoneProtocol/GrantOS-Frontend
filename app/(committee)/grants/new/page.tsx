'use client';

import BuilderVerification from '@/grant-creation/steps/BuilderVerification';
import PaymentModeStep from '@/grant-creation/steps/PaymentMode';
import ReviewConfirm from '@/grant-creation/steps/ReviewConfirm';
import MilestoneDefinition from '@/grant-creation/steps/MilestoneDefinition';
import CommitteeSetup from '@/grant-creation/steps/CommitteeSetup';
import SuccessScreen from '@/components/SuccessScreen';
import { useAuthGuard } from '@/lib/authGuard';
import {
  GrantIdentity,
  MilestoneInput,
  useGrantCreationStore,
  PaymentMode,
} from '@/grant-creation/store';
import AppShellHeader from '@/components/layout/AppShellHeader';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { isAddress } from 'viem';

const STEP_LABELS = ['Builder', 'Milestones', 'Committee', 'Payment', 'Review'] as const;

const NEXT_STEP_COPY: Record<number, { title: string; subtitle: string }> = {
  2: {
    title: 'Committee Setup',
    subtitle: 'Add committee members and set approval quorum.',
  },
  3: {
    title: 'Payment Mode',
    subtitle: 'Choose lump-sum release or streaming payouts.',
  },
  4: {
    title: 'Review & Confirm',
    subtitle: 'Review everything onchain before submitting.',
  },
};

function milestoneIsComplete(m: MilestoneInput) {
  return (
    m.title.trim() !== '' &&
    m.description.trim() !== '' &&
    Number(m.amount) > 0 &&
    m.deadline !== ''
  );
}

function CreateGrantPageContent() {
  const guard = useAuthGuard('connected');
  const searchParams = useSearchParams();
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);

  const {
    currentStep,
    setStep,
    builderAddress,
    setBuilderAddress,
    builderIdentity,
    setBuilderIdentity,
    reset,
    milestones,
    addMilestone,
    updateMilestone,
    removeMilestone,
    reorderMilestones,
    committeeMembers,
    addCommitteeMember,
    removeCommitteeMember,
    quorum,
    setQuorum,
    paymentMode,
    setPaymentMode,
    grantName,
    category,
    setCreatedTxHash,
    setCreatedGrantId,
    createdGrantId,
    setGrantCreationSource,
  } = useGrantCreationStore();

  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('from') === 'dao') {
      setGrantCreationSource('dao');
    }
  }, [searchParams, setGrantCreationSource]);

  const step0Complete =
    isAddress(builderAddress.trim()) && builderIdentity !== null;

  const stepError = useMemo(() => {
    if (currentStep === 0) {
      if (!builderAddress.trim()) {
        return 'Enter the builder wallet address to continue.';
      }
      if (!isAddress(builderAddress)) {
        return 'Enter a valid builder wallet address.';
      }
      if (!builderIdentity) {
        return 'Wait for builder identity to load from the registry before continuing.';
      }
    }
    if (currentStep === 1) {
      if (milestones.length < 1 || milestones.length > 10) {
        return 'Add between 1 and 10 milestones.';
      }
      if (!milestones.every(milestoneIsComplete)) {
        return 'Complete every milestone: title, description, funding amount, and deadline.';
      }
    }
    if (currentStep === 2) {
      if (committeeMembers.length < 2 || committeeMembers.length > 7) {
        return 'Add between 2 and 7 committee members.';
      }
      const lowered = committeeMembers.map((m) => m.toLowerCase());
      if (new Set(lowered).size !== lowered.length) {
        return 'Duplicate committee addresses are not allowed.';
      }
      if (quorum < 1 || quorum > committeeMembers.length) {
        return 'Quorum must be between 1 and the number of committee members.';
      }
    }
    return '';
  }, [builderAddress, builderIdentity, committeeMembers, currentStep, milestones, quorum]);

  const showStepError = attemptedStep === currentStep && Boolean(stepError);

  useEffect(() => {
    if (!showStepError) return;
    const timeoutId = window.setTimeout(() => {
      setAttemptedStep(null);
    }, 2000);
    return () => window.clearTimeout(timeoutId);
  }, [showStepError]);

  const handleIdentityLoaded = useCallback((identity: GrantIdentity | null) => {
    setBuilderIdentity(identity);
  }, [setBuilderIdentity]);

  const canContinueStep0 = step0Complete;
  const canContinueStep1 =
    milestones.length >= 1 &&
    milestones.length <= 10 &&
    milestones.every(milestoneIsComplete);
  const canContinueStep2 =
    committeeMembers.length >= 2 &&
    committeeMembers.length <= 7 &&
    new Set(committeeMembers.map((m) => m.toLowerCase())).size === committeeMembers.length &&
    quorum >= 1 &&
    quorum <= Math.max(1, committeeMembers.length);

  const highestCompletedStep = useMemo(() => {
    if (!step0Complete) return -1;
    if (!canContinueStep1) return 0;
    if (!canContinueStep2) return 1;
    return STEP_LABELS.length - 1;
  }, [canContinueStep1, canContinueStep2, step0Complete]);

  const canContinue =
    currentStep === 0
      ? canContinueStep0 && !stepError
      : currentStep === 1
        ? canContinueStep1
        : currentStep === 2
          ? canContinueStep2
        : true;

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Restoring session…
      </div>
    );
  }

  const isLastStep = currentStep === STEP_LABELS.length - 1;
  const isMilestoneStep = currentStep === 1;
  const isCommitteeStep = currentStep === 2;
  const isPaymentStep = currentStep === 3;
  const isReviewStep = currentStep === 4;
  const isSuccessStep = currentStep === 5;
  const resolvedGrantId = createdGrantId || (builderAddress ? builderAddress.slice(2, 8).toUpperCase() : '000000');

  function isStepUnlocked(stepIndex: number) {
    if (stepIndex < 0 || stepIndex >= STEP_LABELS.length) return false;
    return stepIndex <= highestCompletedStep + 1;
  }

  function attemptStepChange(stepIndex: number) {
    if (stepIndex === currentStep) return;
    if (!isStepUnlocked(stepIndex)) {
      if (stepIndex > currentStep) setAttemptedStep(currentStep);
      return;
    }
    setAttemptedStep(null);
    setStep(stepIndex);
  }

  function handleContinue() {
    if (!canContinue) {
      setAttemptedStep(currentStep);
      return;
    }
    setAttemptedStep(null);
    setStep(currentStep + 1);
  }

  return (
    guard.state === 'blocked' && hasHydrated ? null : (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppShellHeader />

      {isSuccessStep ? (
        <SuccessScreen
          grantId={resolvedGrantId}
          builderAddress={builderAddress}
          builderIdentity={builderIdentity}
          onCreateAnotherGrant={() => reset()}
        />
      ) : (
      <main className="mx-auto w-full max-w-[820px] px-5 py-8 pb-24 sm:px-8 sm:py-10 md:pb-10 lg:px-10">
        {currentStep === 0 ? (
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2rem]">
                Create New Grant
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Deploy a fully onchain grant via GrantEscrow.sol
              </p>
            </div>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        ) : null}

        <div className="mb-5 rounded-[22px] border border-slate-200/90 bg-white px-3 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-5">
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {STEP_LABELS.map((label, index) => {
              const active = index === currentStep;
              const complete = index < currentStep;
              return (
                <Fragment key={label}>
                  <button
                    type="button"
                    onClick={() => attemptStepChange(index)}
                    disabled={!isStepUnlocked(index)}
                    aria-disabled={!isStepUnlocked(index)}
                    className="group relative flex min-w-0 flex-col items-center gap-2 text-center disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {index < STEP_LABELS.length - 1 ? (
                      <span
                        className={`absolute top-3 left-[calc(50%+1rem)] hidden h-0.5 w-[calc(100%-2rem)] sm:block ${
                          complete ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition sm:h-8 sm:w-8 sm:text-[13px] ${
                        active
                          ? 'border-[#202020] bg-[#202020] text-white shadow-sm'
                          : complete
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      {complete ? <Check className="h-4 w-4 stroke-3" /> : index + 1}
                    </span>
                    <span
                      className={`max-w-[56px] text-[10px] leading-tight sm:max-w-none sm:text-xs ${
                        active
                          ? 'font-semibold text-slate-900'
                          : complete
                            ? 'font-semibold text-emerald-700'
                            : 'font-medium text-slate-500'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                </Fragment>
              );
            })}
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {currentStep === 0 ? (
              <BuilderVerification
                builderAddress={builderAddress}
                onBuilderChange={setBuilderAddress}
                onIdentityLoaded={handleIdentityLoaded}
              />
            ) : currentStep === 1 ? (
              <MilestoneDefinition
                milestones={milestones}
                onAdd={addMilestone}
                onUpdate={updateMilestone}
                onDelete={removeMilestone}
                onReorder={reorderMilestones}
                onBack={() => setStep(0)}
                onContinue={() => attemptStepChange(2)}
                canContinue={canContinueStep1}
              />
            ) : currentStep === 2 ? (
              <CommitteeSetup
                members={committeeMembers}
                quorum={Math.min(Math.max(1, quorum), Math.max(1, committeeMembers.length))}
                onAddMember={(addr) => addCommitteeMember(addr)}
                onRemoveMember={(addr) => removeCommitteeMember(addr)}
                onSetQuorum={(value) => setQuorum(value)}
                onBack={() => setStep(1)}
                onNext={() => attemptStepChange(3)}
                canNext={canContinueStep2}
                errorText={showStepError ? stepError : ''}
              />
            ) : currentStep === 3 ? (
              <PaymentModeStep
                value={paymentMode}
                onChange={(mode: PaymentMode) => setPaymentMode(mode)}
                onBack={() => setStep(2)}
                onNext={() => setStep(4)}
              />
            ) : currentStep === 4 ? (
              <ReviewConfirm
                builderAddress={builderAddress}
                zkVerified={Boolean(builderIdentity?.zkVerified)}
                grantName={grantName}
                category={category}
                milestones={milestones}
                committeeMembers={committeeMembers}
                quorum={quorum}
                paymentMode={paymentMode}
                onBack={() => setStep(3)}
                onSuccess={(hash, onChainId) => {
                  console.log('Grant created:', hash);
                  setCreatedTxHash(hash as `0x${string}`);
                  setCreatedGrantId(onChainId.toString());
                  setStep(5);
                }}
              />
            ) : (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-[1.35rem]">
                  {NEXT_STEP_COPY[currentStep]?.title ?? 'Next'}
                </h2>
                <p className="text-sm text-slate-500">{NEXT_STEP_COPY[currentStep]?.subtitle}</p>
                <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  This step will be implemented next.
                </p>
              </div>
            )}
          </div>

          {!isMilestoneStep && !isCommitteeStep && !isPaymentStep && !isReviewStep ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <button
              type="button"
              onClick={() => setStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="order-2 text-sm font-medium text-slate-400 transition hover:text-slate-700 disabled:pointer-events-none disabled:text-slate-300 sm:order-1"
            >
              Back
            </button>

            <div className="order-1 min-h-[20px] flex-1 text-center text-sm text-red-500 sm:order-2 sm:text-center">
              {showStepError ? stepError : ''}
            </div>

            {isLastStep ? (
              <button
                type="button"
                className="order-3 inline-flex items-center justify-center rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Finish
              </button>
            ) : currentStep === 1 ? (
              <span className="order-3 hidden min-w-[9rem] sm:block" aria-hidden />
            ) : (
              <button
                type="button"
                onClick={handleContinue}
                disabled={!canContinue}
                className={`order-3 inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed ${
                  canContinue
                    ? 'bg-[#1f1f1f] text-white hover:bg-black'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                Continue
                <span className="ml-2 text-base leading-none" aria-hidden>
                  →
                </span>
              </button>
            )}
            </div>
          ) : null}
        </section>
      </main>
      )}

    </div>
    )
  );
}

export default function CreateGrantPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          Loading grant form…
        </div>
      }
    >
      <CreateGrantPageContent />
    </Suspense>
  );
}

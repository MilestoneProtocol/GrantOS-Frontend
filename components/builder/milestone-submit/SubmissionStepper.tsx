'use client';

import { useMilestoneSubmit } from '@/components/builder/milestone-submit/MilestoneSubmitProvider';
import { Check } from 'lucide-react';

type StepStatus = 'completed' | 'active' | 'pending';

type StepDef = {
  title: string;
  description: string;
  status: StepStatus;
};

export default function SubmissionStepper() {
  const { uiStep, zkSubstep, zkOutcome } = useMilestoneSubmit();

  const zkStepSubtitle =
    uiStep < 2
      ? 'Pending PR & context'
      : uiStep === 2 && zkSubstep === 'loading'
        ? 'Running vlayer SDK'
        : uiStep === 2 && zkSubstep === 'result' && zkOutcome === 'failure'
          ? 'Generation failed'
          : uiStep === 2 && zkSubstep === 'result'
            ? 'Proof ready'
            : uiStep === 2
              ? 'Generate vlayer proof'
              : 'Proof ready';

  const steps: StepDef[] = [
    {
      title: 'Milestone Context',
      description:
        uiStep > 1 ? 'Details confirmed.' : uiStep === 1 ? 'Confirm milestone & PR' : 'Verify details & PR',
      status: uiStep > 1 ? 'completed' : uiStep === 1 ? 'active' : 'pending',
    },
    {
      title: 'ZK Proof Generation',
      description: zkStepSubtitle,
      status: uiStep > 2 ? 'completed' : uiStep === 2 ? 'active' : 'pending',
    },
    {
      title: 'Written Summary',
      description:
        uiStep > 3
          ? 'Review complete'
          : uiStep === 3
            ? 'AI verdict & summary'
            : 'Pending proof',
      status: uiStep > 3 ? 'completed' : uiStep === 3 ? 'active' : 'pending',
    },
    {
      title: 'Onchain Submission',
      description: uiStep === 4 ? 'Sign & attest (EAS)' : 'EAS attestation',
      status: uiStep === 4 ? 'active' : 'pending',
    },
  ];

  return (
    <aside className="w-full border-b border-slate-100 bg-slate-50/60 p-6 lg:w-[280px] lg:border-b-0 lg:border-r lg:border-slate-100 lg:p-8">
      <h2 className="text-sm font-bold tracking-tight text-slate-900">Submission Progress</h2>
      <div className="mt-6 flex flex-col">
        {steps.map((step, idx) => (
          <div key={step.title} className="relative pb-7 last:pb-0">
            {idx !== steps.length - 1 ? (
              <div
                className={`absolute left-[11px] top-6 h-full w-px ${
                  step.status === 'completed' ? 'bg-blue-500' : 'bg-slate-200'
                }`}
              />
            ) : null}

            <div className="relative z-10 flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {step.status === 'completed' ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500 bg-white">
                    <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
                  </div>
                ) : step.status === 'active' ? (
                  <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white">
                    <div className="animate-spin-slow absolute inset-[3px] rounded-full border border-blue-500 border-r-transparent border-b-transparent" />
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-xs font-semibold text-slate-400">
                    {idx + 1}
                  </div>
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-sm font-bold ${
                    step.status === 'pending' ? 'text-slate-400' : 'text-slate-900'
                  }`}
                >
                  {step.title}
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    step.status === 'active' ? 'font-medium text-blue-600' : 'text-slate-500'
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

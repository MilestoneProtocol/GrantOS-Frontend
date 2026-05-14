'use client';

import BuilderAppShell from '@/components/builder/BuilderAppShell';
import { MilestoneSubmitProvider, useMilestoneSubmit } from '@/components/builder/milestone-submit/MilestoneSubmitProvider';
import SubmissionStepper from '@/components/builder/milestone-submit/SubmissionStepper';
import SubHeaderBackButton from '@/components/navigation/SubHeaderBackButton';
import { useAuthGuard } from '@/lib/authGuard';
import { Circle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

function SubmitStepsChrome({ children }: { children: ReactNode }) {
  const guard = useAuthGuard('builder');
  const pathname = usePathname();
  const isSuccessRoute = pathname.includes('/submit/success');

  const {
    gate,
    milestoneIndex,
    displayTuple,
    displayMilestone,
    routeGrantId,
    grantHeaderSubtitle,
    isDemoRoute,
  } = useMilestoneSubmit();

  if (guard.state === 'loading') {
    return (
      <BuilderAppShell navActive="none">
        <main className="flex min-h-[50vh] w-full items-center justify-center px-5 py-16 text-sm text-slate-500 md:px-8 lg:px-10">
          Detecting your role…
        </main>
      </BuilderAppShell>
    );
  }

  if (guard.state === 'blocked') return null;

  if (gate.kind !== 'ok' || milestoneIndex === null || !displayTuple || !displayMilestone) {
    return (
      <BuilderAppShell navActive="none">
        <main className="flex min-h-[50vh] w-full items-center justify-center px-5 py-16 text-sm text-slate-500 md:px-8 lg:px-10">
          Validating access…
        </main>
      </BuilderAppShell>
    );
  }

  if (isSuccessRoute) {
    return (
      <BuilderAppShell navActive="none">
        <main className="w-full bg-slate-50 px-5 py-8 md:px-8 md:py-12 lg:px-10">
          <div className="mx-auto w-full max-w-lg">{children}</div>
        </main>
      </BuilderAppShell>
    );
  }

  const milestoneTitle = displayMilestone.title?.trim() || 'Milestone';

  return (
    <BuilderAppShell navActive="none">
      <main className="flex min-h-0 flex-1 flex-col bg-slate-50 px-4 pb-6 pt-5 sm:px-6 sm:pb-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <SubHeaderBackButton
                label="Back to Milestone"
                fallbackHref={`/grants/${encodeURIComponent(routeGrantId)}`}
                className="shrink-0"
              />
              <span className="text-slate-300">/</span>
              <span className="min-w-0 truncate font-semibold text-slate-900">{milestoneTitle}</span>
            </div>
            {isDemoRoute ? (
              <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-900">
                UI demo — not on-chain
              </span>
            ) : null}
          </div>

          <div className="flex min-h-[min(680px,calc(100vh-10rem))] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:min-h-[560px]">
              <SubmissionStepper />
              <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border-t border-slate-100 bg-white p-5 sm:p-6 lg:border-t-0 lg:p-10">
                {children}
              </section>
            </div>

            <footer className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-[11px] font-medium tracking-tight text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                GrantIdentityRegistry · EAS-ready
              </div>
              <div className="flex items-center gap-1.5">
                Powered by <span className="font-bold text-slate-700">vlayer Web Prover</span>
              </div>
            </footer>
          </div>

          {grantHeaderSubtitle ? (
            <p className="mt-3 text-center text-xs text-slate-500 lg:text-left">{grantHeaderSubtitle}</p>
          ) : null}
        </div>
      </main>
    </BuilderAppShell>
  );
}

export default function MilestoneSubmitStepsLayout({ children }: { children: ReactNode }) {
  return (
    <MilestoneSubmitProvider>
      <SubmitStepsChrome>{children}</SubmitStepsChrome>
    </MilestoneSubmitProvider>
  );
}

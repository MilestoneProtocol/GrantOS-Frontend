'use client';

import { PROTOCOL_FLOWCHART, type FlowchartStepKind } from '@/lib/guidelines/data';
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  FileCheck,
  Fingerprint,
  Landmark,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const KIND_STYLES: Record<
  FlowchartStepKind,
  { card: string; badge: string; icon: string }
> = {
  dao: {
    card: 'border-blue-200 bg-blue-50/80',
    badge: 'bg-blue-600 text-white',
    icon: 'text-blue-600',
  },
  builder: {
    card: 'border-violet-200 bg-violet-50/80',
    badge: 'bg-violet-600 text-white',
    icon: 'text-violet-600',
  },
  contract: {
    card: 'border-emerald-200 bg-emerald-50/80',
    badge: 'bg-emerald-600 text-white',
    icon: 'text-emerald-600',
  },
};

const STEP_ICONS: LucideIcon[] = [
  Landmark,
  Fingerprint,
  FileCheck,
  Users,
  BadgeCheck,
  CircleDollarSign,
];

function FlowStepCard({
  step,
  label,
  sublabel,
  kind,
  icon: Icon,
}: (typeof PROTOCOL_FLOWCHART)[number] & { icon: LucideIcon }) {
  const styles = KIND_STYLES[kind];
  return (
    <div
      className={`flex min-h-[88px] flex-col items-center justify-center rounded-xl border px-3 py-4 text-center shadow-sm ${styles.card}`}
    >
      <span
        className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${styles.badge}`}
      >
        {step}
      </span>
      <Icon className={`mb-1.5 h-5 w-5 ${styles.icon}`} strokeWidth={2} aria-hidden />
      <p className="text-sm font-bold leading-tight text-slate-900">{label}</p>
      <p className="text-xs font-medium text-slate-600">{sublabel}</p>
    </div>
  );
}

function ArrowH() {
  return (
    <ArrowRight
      className="hidden h-4 w-4 shrink-0 text-slate-400 xl:block"
      strokeWidth={2}
      aria-hidden
    />
  );
}

function ArrowV() {
  return (
    <ArrowDown
      className="mx-auto h-4 w-4 shrink-0 text-slate-400 md:hidden"
      strokeWidth={2}
      aria-hidden
    />
  );
}

function ArrowTablet({ className = '' }: { className?: string }) {
  return (
    <ArrowRight
      className={`hidden h-4 w-4 shrink-0 text-slate-400 md:block xl:hidden ${className}`}
      strokeWidth={2}
      aria-hidden
    />
  );
}

export default function GuidelinesFlowchart() {
  const steps = PROTOCOL_FLOWCHART.map((s, i) => ({
    ...s,
    icon: STEP_ICONS[i] ?? FileCheck,
  }));

  return (
    <figure className="guidelines-flowchart rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <div className="hidden items-center gap-2 xl:flex">
        {steps.map((step, i) => (
          <div key={step.step} className="flex min-w-0 flex-1 items-center gap-2">
            <FlowStepCard {...step} />
            {i < steps.length - 1 ? <ArrowH /> : null}
          </div>
        ))}
      </div>

      <div className="hidden md:block xl:hidden">
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
          <FlowStepCard {...steps[0]!} />
          <ArrowTablet />
          <FlowStepCard {...steps[1]!} />
          <ArrowTablet />
          <FlowStepCard {...steps[2]!} />
        </div>
        <div className="my-2 flex justify-center">
          <ArrowDown className="h-4 w-4 text-slate-400" strokeWidth={2} aria-hidden />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
          <FlowStepCard {...steps[3]!} />
          <ArrowTablet />
          <FlowStepCard {...steps[4]!} />
          <ArrowTablet />
          <FlowStepCard {...steps[5]!} />
        </div>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {steps.map((step, i) => (
          <div key={step.step}>
            <FlowStepCard {...step} />
            {i < steps.length - 1 ? <ArrowV /> : null}
          </div>
        ))}
      </div>

      <figcaption className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden />
          DAO action
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-600" aria-hidden />
          Builder action
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden />
          Smart contract
        </span>
      </figcaption>
    </figure>
  );
}
